/**
 * letter-coach/index.ts — Pre-writing ritual: guided 3-question conversation.
 *
 * step = 'question'  (questionNumber 1-3)
 *   → { question: string, sessionId: string }
 *
 * step = 'summary'   (after Q3)
 *   → { intentSummary: string, structureSuggestion: string }
 *   (also persists both to writing_sessions)
 *
 * Deploy: supabase functions deploy letter-coach
 * Secrets: ANTHROPIC_API_KEY
 */

import { serve }        from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

const QUESTION_THEMES = [
  "Who is this for, and where do things stand between you right now?",
  "When they finish reading this, what do you want them to feel?",
  "Is there something you've been wanting to say but haven't found the right moment for?",
];

const QUESTION_SYSTEM = `You are a quiet, grounded facilitator helping someone prepare to write a personal letter. Your role is to ask precise questions that help them clarify what they want to say — then get out of the way.

Guidelines:
- Tone: Be conversational and direct. Don't perform warmth or empathy — but don't be clinical either. Think of a thoughtful friend who listens well and skips the cheerleading.
- No validation theater: Don't praise their answers, flatter them, or narrate their emotions back to them ("That's beautiful," "That must be hard," "I love that"). Just hear what they said and move forward.
- Adaptive questioning: Adapt your exact wording based on what they've already shared. Don't ask questions that ignore what they just told you. If a previous answer already covers the next question, acknowledge that briefly and skip ahead.
- If something heavy comes up: You can briefly acknowledge it without performing sympathy. A simple "Got it" or "Okay" is enough. Then move to the next question.
- No prescriptions: Never suggest specific words, phrases, or ideas they should write. Trust that they know what to say — your job is helping them find it, not hand it to them.
- Pacing: One focused question at a time. One or two sentences max. No preamble.`;

const SUMMARY_SYSTEM = `You are a quiet, grounded facilitator who has just listened to someone answer three questions in preparation for writing a personal letter. Produce a short, sharp summary of what they are actually trying to say.

Rules:
- Distill their answers down to the sharpest version of what they're trying to say. Don't just rephrase what they told you in softer language.
- Name any tension or gap between their answers that they may not have stated explicitly. If their feelings are messy or contradictory, reflect the mess.
- Stay completely objective. Don't add optimistic spin, resolve their tension, or tie things up with a silver lining.
- Never suggest how to structure, open, or organize the letter.
- End the summary and stop.

Respond with valid JSON only (no markdown):
{"intentSummary": "...", "structureSuggestion": ""}

The intentSummary should be 2-4 sentences. Leave structureSuggestion as an empty string.`;

async function callClaude(system: string, userMsg: string, maxTokens = 200): Promise<string> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY secret is not set');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type':      'application/json',
      'x-api-key':         apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model:      'claude-sonnet-4-6',
      max_tokens: maxTokens,
      system,
      messages:   [{ role: 'user', content: userMsg }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return (data.content?.[0]?.text ?? '').trim();
}

// Decode a JWT payload without re-verifying the signature.
// The Supabase gateway already verified the signature (verify_jwt: true).
function jwtUserId(authHeader: string): string | null {
  try {
    const token   = authHeader.replace('Bearer ', '');
    const [, b64] = token.split('.');
    const payload = JSON.parse(atob(b64.replace(/-/g, '+').replace(/_/g, '/')));
    if (!payload?.sub || payload.role !== 'authenticated') return null;
    return payload.sub as string;
  } catch {
    return null;
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });

  try {
    // Auth — gateway has already verified the JWT; decode to get user ID.
    const authHeader = req.headers.get('Authorization') ?? '';
    const userId     = jwtUserId(authHeader);
    if (!userId) return json({ error: 'Unauthorized' }, 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const body   = await req.json();
    const { step } = body;

    // ===== QUESTION =====================================================
    if (step === 'question') {
      const { questionNumber, previousAnswers = [], sessionId } = body as {
        questionNumber:  1 | 2 | 3;
        previousAnswers: { question: string; answer: string }[];
        sessionId?:      string;
      };

      let userMsg: string;
      if (previousAnswers.length === 0) {
        userMsg = `Someone is preparing to write a personal letter. Ask them this question gently in your own words: "${QUESTION_THEMES[0]}"`;
      } else {
        const ctx = previousAnswers
          .map((qa: { question: string; answer: string }, i: number) => `Q${i + 1}: "${qa.question}"\nTheir answer: "${qa.answer}"`)
          .join('\n\n');
        userMsg = `Someone is preparing to write a personal letter. Here is what they've shared so far:\n\n${ctx}\n\nNow ask them about this theme, adapting your wording naturally: "${QUESTION_THEMES[questionNumber - 1]}"`;
      }

      const question = await callClaude(QUESTION_SYSTEM, userMsg, 120);

      // Create writing_sessions row on Q1
      let resolvedSessionId = sessionId ?? null;
      if (questionNumber === 1 && !sessionId) {
        const { data } = await supabase
          .from('writing_sessions')
          .insert({ user_id: userId, qa_pairs: [] })
          .select('id')
          .single();
        resolvedSessionId = data?.id ?? null;
      }

      return json({ question, sessionId: resolvedSessionId });
    }

    // ===== SUMMARY ======================================================
    if (step === 'summary') {
      const { sessionId, answers } = body as {
        sessionId: string;
        answers:   { question: string; answer: string }[];
      };

      if (!sessionId || !answers?.length) return json({ error: 'Missing sessionId or answers' }, 400);

      const answersText = answers
        .map((qa: { question: string; answer: string }, i: number) => `Q${i + 1}: "${qa.question}"\nA: "${qa.answer}"`)
        .join('\n\n');

      const raw = await callClaude(
        SUMMARY_SYSTEM,
        `Here are someone's answers as they prepare to write a personal letter:\n\n${answersText}\n\nGenerate the intent summary and structural suggestion.`,
        450
      );

      let intentSummary       = '';
      let structureSuggestion = '';
      try {
        const match = raw.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed        = JSON.parse(match[0]);
          intentSummary       = (parsed.intentSummary       ?? '').trim();
          structureSuggestion = (parsed.structureSuggestion ?? '').trim();
        }
      } catch {
        intentSummary = raw;
      }

      await supabase
        .from('writing_sessions')
        .update({ qa_pairs: answers, intent_summary: intentSummary, structure_suggestion: structureSuggestion })
        .eq('id', sessionId)
        .eq('user_id', userId);

      return json({ intentSummary, structureSuggestion });
    }

    return json({ error: 'Invalid step' }, 400);

  } catch (err) {
    console.error('[letter-coach]', err);
    return json({ error: err instanceof Error ? err.message : 'Internal server error' }, 500);
  }
});
