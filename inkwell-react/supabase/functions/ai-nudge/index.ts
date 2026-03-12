/**
 * ai-nudge/index.ts — Supabase Edge Function: Anthropic API proxy.
 *
 * Receives the letter's current content from the client and returns
 * a single writing nudge question (never generates letter content).
 *
 * The Anthropic API key lives ONLY in Supabase Edge Function secrets —
 * it never touches the client bundle.
 *
 * Rate limiting: max 5 nudges per user per day, tracked in `nudge_usage` table.
 *
 * Deploy with:
 *   supabase functions deploy ai-nudge
 *
 * Set the secret with:
 *   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
 *
 * Supabase table required:
 *   CREATE TABLE nudge_usage (
 *     id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *     user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
 *     used_at    TIMESTAMPTZ DEFAULT NOW()
 *   );
 *   CREATE INDEX nudge_usage_user_day ON nudge_usage (user_id, used_at);
 *   ALTER TABLE nudge_usage ENABLE ROW LEVEL SECURITY;
 *   CREATE POLICY "Users own their nudge usage"
 *     ON nudge_usage FOR ALL USING (auth.uid() = user_id);
 */

import { serve }         from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient }  from 'https://esm.sh/@supabase/supabase-js@2';

const SYSTEM_PROMPT = `You are a gentle muse for a handwritten letter. The user is writing a personal letter. Based on what they've written so far, give ONE short, warm question or nudge (max 12 words) to help them continue writing from their own heart. Never write the letter for them.`;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const MAX_NUDGES_PER_DAY = 5;

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    // ---- Parse request body ----------------------------------------
    const { letterText = '', recipientName = '' } = await req.json();

    // ---- Auth: get the user from the JWT ---------------------------
    const authHeader = req.headers.get('Authorization') ?? '';
    const supabase   = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    // ---- Rate limit: max 5 nudges per user per day -----------------
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);

    const { count } = await supabase
      .from('nudge_usage')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('used_at', dayStart.toISOString());

    if ((count ?? 0) >= MAX_NUDGES_PER_DAY) {
      return new Response(
        JSON.stringify({ error: 'Daily nudge limit reached. Come back tomorrow.' }),
        { status: 429, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    // ---- Record this nudge usage -----------------------------------
    await supabase.from('nudge_usage').insert({ user_id: user.id });

    // ---- Build the user message ------------------------------------
    const preview = (letterText as string).trim().slice(0, 300);
    const userMsg  = recipientName
      ? `I'm writing a letter to ${recipientName}. So far I have: "${preview}". Ask me one question.`
      : `I'm writing a heartfelt letter and I'm stuck. So far: "${preview}". Ask me one question.`;

    // ---- Call Anthropic API ----------------------------------------
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicKey) throw new Error('ANTHROPIC_API_KEY secret not set');

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method:  'POST',
      headers: {
        'Content-Type':    'application/json',
        'x-api-key':       anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      'claude-sonnet-4-6',
        max_tokens: 80,
        system:     SYSTEM_PROMPT,
        messages:   [{ role: 'user', content: userMsg }],
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      throw new Error(`Anthropic API error ${anthropicRes.status}: ${errText}`);
    }

    const data  = await anthropicRes.json();
    const nudge = (data.content?.[0]?.text ?? '').trim();

    return new Response(
      JSON.stringify({ nudge }),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('[ai-nudge]', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }
});
