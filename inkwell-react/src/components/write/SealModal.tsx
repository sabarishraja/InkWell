/**
 * SealModal.tsx — Delivery timing + recipient email modal.
 *
 * Shown after the paper folds during the seal flow.
 * User selects delivery type, optionally enters a date, and enters email.
 */

import { useState } from 'react';
import type { DeliveryType } from '../../types/letter';

interface Props {
  visible:  boolean;
  onSend:   (params: { deliveryType: DeliveryType; specificDate?: string; email: string }) => void;
  onCancel: () => void;
}

export function SealModal({ visible, onSend, onCancel }: Props) {
  const [delivery, setDelivery] = useState<DeliveryType>('now');
  const [date,     setDate]     = useState('');
  const [email,    setEmail]    = useState('');

  const handleSend = () => {
    onSend({
      deliveryType:  delivery,
      specificDate:  delivery === 'scheduled' ? date : undefined,
      email,
    });
  };

  // Default date picker to 7 days from now
  const defaultDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  return (
    <div
      className={`seal-modal-overlay ${visible ? 'modal--active' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="seal-modal-title"
      aria-hidden={!visible}
    >
      <div className="seal-modal">
        <h2 id="seal-modal-title" className="seal-modal__title">
          When should this arrive?
        </h2>

        {/* Delivery options */}
        <div className="delivery-options" role="group" aria-label="Delivery timing">
          {/* Right now */}
          <div
            className={`delivery-option ${delivery === 'now' ? 'option--selected' : ''}`}
            role="radio"
            aria-checked={delivery === 'now'}
            tabIndex={0}
            onClick={() => setDelivery('now')}
            onKeyDown={(e) => e.key === 'Enter' && setDelivery('now')}
          >
            <div className="delivery-option__title">
              <span className="option-check" aria-hidden="true" />
              Right Now
            </div>
            <div className="delivery-option__sub">Delivers within the hour.</div>
          </div>

          {/* Specific date */}
          <div
            className={`delivery-option ${delivery === 'scheduled' ? 'option--selected' : ''}`}
            role="radio"
            aria-checked={delivery === 'scheduled'}
            tabIndex={0}
            onClick={() => setDelivery('scheduled')}
            onKeyDown={(e) => e.key === 'Enter' && setDelivery('scheduled')}
          >
            <div className="delivery-option__title">
              <span className="option-check" aria-hidden="true" />
              On a Specific Date
            </div>
            <div className="delivery-option__sub">Choose when they receive it.</div>

            {/* Date picker revealed when this option is selected */}
            {delivery === 'scheduled' && (
              <div className="date-picker-wrap">
                <input
                  type="date"
                  value={date || defaultDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setDate(e.target.value)}
                  aria-label="Delivery date"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}
          </div>

          {/* Surprise */}
          <div
            className={`delivery-option ${delivery === 'surprise' ? 'option--selected' : ''}`}
            role="radio"
            aria-checked={delivery === 'surprise'}
            tabIndex={0}
            onClick={() => setDelivery('surprise')}
            onKeyDown={(e) => e.key === 'Enter' && setDelivery('surprise')}
          >
            <div className="delivery-option__title">
              <span className="option-check" aria-hidden="true" />
              Surprise Me
            </div>
            <div className="delivery-option__sub">Inkwell picks a day within 30 days.</div>
          </div>
        </div>

        {/* Recipient email */}
        <div className="email-field">
          <label htmlFor="recipient-email">Recipient's email address</label>
          <input
            id="recipient-email"
            type="email"
            placeholder="their@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-required="true"
          />
        </div>

        {/* Actions */}
        <div className="seal-modal__actions">
          <button
            className="btn-send"
            onClick={handleSend}
            aria-label="Seal and send the letter"
          >
            Seal &amp; Send
          </button>
          <button
            className="btn-edit-cancel"
            onClick={onCancel}
            aria-label="Go back and edit the letter"
          >
            Wait, I need to edit
          </button>
        </div>
      </div>
    </div>
  );
}
