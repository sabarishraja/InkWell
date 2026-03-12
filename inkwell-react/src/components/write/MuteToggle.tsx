/**
 * MuteToggle.tsx — Sound mute/unmute button.
 *
 * Fixed to the top of the desk area (outside paper).
 * Calls Howler.mute() via the useAudio hook's setMuted function.
 */

import { useState } from 'react';
import type { AudioControls } from '../../hooks/useAudio';

interface Props {
  audio: AudioControls;
}

export function MuteToggle({ audio }: Props) {
  const [muted, setMuted] = useState(false);

  const toggle = () => {
    const next = !muted;
    setMuted(next);
    audio.setMuted(next);
  };

  return (
    <button
      className="mute-toggle"
      onClick={toggle}
      aria-label={muted ? 'Unmute sounds' : 'Mute sounds'}
      aria-pressed={muted}
      title={muted ? 'Unmute' : 'Mute'}
    >
      {muted ? (
        /* Speaker with X */
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <line x1="23" y1="9" x2="17" y2="15" />
          <line x1="17" y1="9" x2="23" y2="15" />
        </svg>
      ) : (
        /* Speaker with waves */
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
        </svg>
      )}
    </button>
  );
}
