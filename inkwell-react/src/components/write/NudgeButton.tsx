/**
 * NudgeButton.tsx — "STUCK?" AI writing nudge button.
 *
 * Calls the Supabase Edge Function ai-nudge (never the Anthropic API directly).
 * One-time use per session. Falls back to local prompts on error.
 * Shows a tilted sticky-note whisper note with the question.
 */

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

interface Props {
  getLetterText:    () => string;
  recipientName:    string;
  supabaseUrl:      string;
}

type NudgeState = 'idle' | 'loading' | 'done';

const FALLBACK_PROMPTS = [
  "What's one thing you've never found the right moment to say to them?",
  "What do you hope they feel when they finish reading this?",
  "If this were the last letter you could write, what would matter most?",
  "What do you wish they truly understood about how you see them?",
  "What moment with them keeps coming back to you?",
  "What quality of theirs has quietly shaped who you are?",
  "What would you regret leaving unsaid?",
  "What do you love about them that they might not know you've noticed?",
  "What has changed between you two, and what has stayed the same?",
  "If distance disappeared tomorrow, what's the first thing you'd say?",
];

export function NudgeButton({ getLetterText, recipientName, supabaseUrl }: Props) {
  const [state,       setState]       = useState<NudgeState>('idle');
  const [nudgeText,   setNudgeText]   = useState<string | null>(null);
  const [noteVisible, setNoteVisible] = useState(false);
  const [autoTimer,   setAutoTimer]   = useState<ReturnType<typeof setTimeout> | null>(null);

  const handleClick = async () => {
    if (state !== 'idle') return;
    setState('loading');

    let question: string;

    try {
      // Call the Supabase Edge Function proxy (never Anthropic directly)
      const session = await supabase.auth.getSession();
      const token   = session.data.session?.access_token ?? '';

      const res = await fetch(`${supabaseUrl}/functions/v1/ai-nudge`, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          letterText:    getLetterText().slice(0, 300),
          recipientName,
        }),
      });

      if (!res.ok) throw new Error('Edge function error');
      const data = await res.json();
      question = data.nudge ?? FALLBACK_PROMPTS[Math.floor(Math.random() * FALLBACK_PROMPTS.length)];
    } catch {
      question = FALLBACK_PROMPTS[Math.floor(Math.random() * FALLBACK_PROMPTS.length)];
    }

    setState('done');
    setNudgeText(question);
    setNoteVisible(true);

    // Auto-dismiss after 30 seconds
    const t = setTimeout(() => setNoteVisible(false), 30_000);
    setAutoTimer(t);
  };

  const dismiss = () => {
    setNoteVisible(false);
    if (autoTimer) clearTimeout(autoTimer);
  };

  // Cleanup timer on unmount
  useEffect(() => () => { if (autoTimer) clearTimeout(autoTimer); }, [autoTimer]);

  const label =
    state === 'loading' ? 'thinking' :
    state === 'done'    ? 'you got this.' :
    'STUCK?';

  return (
    <>
      <button
        className={`nudge-btn ${state === 'loading' ? 'nudge--loading' : ''}`}
        onClick={handleClick}
        disabled={state !== 'idle'}
        aria-label="Get a writing nudge"
        aria-live="polite"
      >
        {label}
      </button>

      {noteVisible && nudgeText && (
        <div className="nudge-note" role="note" aria-label="Writing nudge">
          <button
            className="nudge-dismiss"
            onClick={dismiss}
            aria-label="Dismiss writing nudge"
          >
            ✕
          </button>
          <p>{nudgeText}</p>
        </div>
      )}
    </>
  );
}
