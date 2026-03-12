/**
 * PreWriteModal.tsx — "Who are you writing to?" modal.
 *
 * Appears instantly on page load before the paper animation begins.
 * Collects the recipient's name (optional) and triggers the paper load.
 */

import { useState, useEffect, useRef } from 'react';

interface Props {
  onBegin: (recipientName: string) => void;
}

export function PreWriteModal({ onBegin }: Props) {
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus the name field when modal appears
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleBegin = () => onBegin(name.trim());

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleBegin();
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="modal-card">
        <h1 id="modal-title" className="modal-title">Who are you writing to?</h1>
        <p className="modal-sub">A name makes it real.</p>

        <div className="recipient-field">
          <label htmlFor="recipient-name">Recipient</label>
          <input
            id="recipient-name"
            ref={inputRef}
            type="text"
            placeholder="Their name..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        <button
          className="btn-begin"
          onClick={handleBegin}
          aria-label="Begin writing"
        >
          Begin
        </button>

        <button
          className="modal-skip"
          onClick={() => onBegin('')}
          aria-label="Skip and begin without a name"
        >
          Skip
        </button>
      </div>
    </div>
  );
}
