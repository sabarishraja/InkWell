/**
 * server.js — Inkwell PDF export backend.
 *
 * Single endpoint: POST /api/letters/:id/export-pdf
 *   - Verifies the caller owns the letter (via Supabase JWT)
 *   - Renders a pixel-perfect parchment letter in Puppeteer
 *   - Returns an A4 PDF binary
 *
 * PRODUCTION NOTE:
 *   When running inside Docker or a headless Linux container, Puppeteer
 *   requires additional Chromium dependencies and sandbox flags.
 *   See: https://pptr.dev/troubleshooting#running-puppeteer-in-docker
 *   The '--no-sandbox' flag below is already set for this reason.
 */

'use strict';

require('dotenv').config();

const express    = require('express');
const cors       = require('cors');
const puppeteer  = require('puppeteer');
const { createClient } = require('@supabase/supabase-js');

// ---- Supabase admin client (service role — bypasses RLS for server-side reads) ----
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// ---- Express setup ----
const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json());

// ---- Health check ----
app.get('/health', (_req, res) => res.json({ ok: true }));

// ---- PDF export endpoint ----
app.post('/api/letters/:id/export-pdf', async (req, res) => {
  const { id } = req.params;

  // 1. Extract bearer token from Authorization header
  const authHeader = req.headers.authorization ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization token.' });
  }
  const token = authHeader.slice(7);

  // 2. Verify token → get the requesting user
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) {
    return res.status(401).json({ error: 'Token verification failed.' });
  }

  // 3. Fetch the letter — must belong to the authenticated user
  const { data: letter, error: letterErr } = await supabase
    .from('letters')
    .select('id, title, body, created_at, user_id')
    .eq('id', id)
    .eq('user_id', user.id)   // ownership check
    .single();

  if (letterErr || !letter) {
    return res.status(404).json({ error: 'Letter not found.' });
  }

  // 4. Generate PDF with a 30-second timeout guard
  let browser = null;
  let timeoutHandle = null;

  const cleanup = async () => {
    if (timeoutHandle) clearTimeout(timeoutHandle);
    if (browser) {
      try { await browser.close(); } catch (_) { /* ignore */ }
    }
  };

  try {
    // Timeout: close browser and respond if Puppeteer hangs
    const timeoutPromise = new Promise((_, reject) => {
      timeoutHandle = setTimeout(() => {
        reject(new Error('PDF generation timed out after 30 seconds.'));
      }, 30_000);
    });

    const pdfPromise = (async () => {
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',             // required in Docker / CI environments
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',  // prevents crashes in low-memory containers
        ],
      });

      const page = await browser.newPage();
      await page.setViewport({ width: 794, height: 1123 }); // A4 at 96 dpi

      // Set HTML and wait for Google Fonts to finish loading
      await page.setContent(buildLetterHtml(letter), { waitUntil: 'networkidle0' });

      return page.pdf({
        format: 'A4',
        printBackground: true,  // critical — renders background colors/images
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
      });
    })();

    const pdfBuffer = await Promise.race([pdfPromise, timeoutPromise]);

    await cleanup();

    // Sanitise filename: keep letters, numbers, spaces, hyphens
    const safeName = (letter.title || 'letter')
      .replace(/[^\w\s\-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .toLowerCase() || 'letter';

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}.pdf"`);
    res.send(Buffer.from(pdfBuffer));

  } catch (err) {
    await cleanup();
    console.error('PDF export error:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || 'Failed to generate PDF.' });
    }
  }
});

// ---- Helpers ----

/**
 * Builds a self-contained HTML page that replicates the parchment letter
 * appearance from letter.css / global.css, suitable for Puppeteer rendering.
 */
function buildLetterHtml(letter) {
  const date = new Date(letter.created_at).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  // letter.body is trusted HTML produced by our own contenteditable
  // (only <br> and zero-width spaces — no user-supplied raw HTML)
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <!--
    Google Fonts — Puppeteer waits for networkidle0 so these fully load
    before the PDF is captured.
  -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;600&family=Playfair+Display:ital,wght@0,300;0,400;1,300&family=EB+Garamond:ital@0;1&family=Special+Elite&display=swap" rel="stylesheet" />

  <style>
    /* ---- Reset ---- */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    @page { size: A4; margin: 0; }

    /* ---- Page background (dark mahogany — matches desk-bg) ---- */
    body {
      background-color: #1a1410;
      width: 210mm;
      min-height: 297mm;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding: 14mm 16mm;
      font-family: 'Caveat', cursive;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* ---- Parchment paper ---- */
    .letter-paper {
      background-color: #F5E6C8;
      color: #2C1A0E;
      width: 100%;
      min-height: 265mm;
      padding: 52px 60px;
      position: relative;
      box-shadow:
        0 2px 4px rgba(0,0,0,0.12),
        0 8px 24px rgba(0,0,0,0.35),
        0 24px 64px rgba(0,0,0,0.3);
      overflow: hidden;
    }

    /* Ruled lines (matching letter.css background-position) */
    .letter-paper::before {
      content: '';
      position: absolute;
      inset: 0;
      background-image: repeating-linear-gradient(
        transparent,
        transparent calc(2em - 1px),
        rgba(44, 26, 14, 0.07) calc(2em - 1px),
        rgba(44, 26, 14, 0.07) 2em
      );
      background-position: 0 calc(52px + 1em);
      pointer-events: none;
    }

    /* ---- Date line ---- */
    .letter-date {
      font-family: 'Special Elite', 'Courier New', monospace;
      font-size: 12px;
      letter-spacing: 0.08em;
      color: rgba(44, 24, 16, 0.5);
      text-align: right;
      margin-bottom: 32px;
      position: relative;
      z-index: 1;
    }

    /* ---- Title ---- */
    .letter-title {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: clamp(1.6rem, 4vw, 2.2rem);
      font-weight: 300;
      color: #2C1A0E;
      letter-spacing: 0.02em;
      line-height: 1.25;
      margin-bottom: 24px;
      position: relative;
      z-index: 1;
    }

    /* ---- Divider ---- */
    .letter-divider {
      border: none;
      border-top: 1px solid rgba(44, 26, 14, 0.15);
      margin-bottom: 24px;
      position: relative;
      z-index: 1;
    }

    /* ---- Letter body ---- */
    .letter-body {
      font-family: 'Caveat', cursive;
      font-size: 20px;
      line-height: 2;
      color: #2C1A0E;
      word-break: break-word;
      white-space: pre-wrap;
      position: relative;
      z-index: 1;
    }
  </style>
</head>
<body>
  <div class="letter-paper">
    <div class="letter-date">${escapeHtml(date)}</div>
    <h1 class="letter-title">${escapeHtml(letter.title)}</h1>
    <hr class="letter-divider" />
    <div class="letter-body">${letter.body}</div>
  </div>
</body>
</html>`;
}

/** Escape HTML special characters for safe injection into attribute/text contexts. */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ---- Start ----
app.listen(PORT, () => {
  console.log(`Inkwell backend running → http://localhost:${PORT}`);
  console.log(`PDF export endpoint: POST http://localhost:${PORT}/api/letters/:id/export-pdf`);
});
