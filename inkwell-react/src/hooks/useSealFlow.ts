/**
 * useSealFlow.ts — Seal animation state machine hook.
 *
 * Converts the imperative initSealFlow() from timecapsule.js into
 * a React state machine. CSS class names are driven by the current
 * step, so all animation timing is in CSS (no JS setTimeout for
 * visual states — only for state transitions).
 */

import { useState, useCallback, useRef } from 'react';
import { generateDeliveryDate } from '../lib/utils';
import { saveLetter } from '../services/lettersService';
import type { DeliveryType, PaperStyle, InkColor } from '../types/letter';

export type SealStep =
  | 'idle'       // No seal in progress
  | 'sealing'    // Wax seal dropping
  | 'folded'     // Paper folded, waiting for modal
  | 'modal'      // Delivery modal visible
  | 'sending'    // Processing the send action
  | 'flyaway'    // Paper flying away
  | 'confirmed'; // Confirmation message visible

export interface SealConfig {
  recipientName: string;
  getPaperStyle: () => PaperStyle;
  getInkColor:   () => InkColor;
  getContent:    () => string;
  onSaved:       (letterId: string) => void; // called with the new letter ID
  onPlayTear:    () => void;                 // play paper tear sound
}

export interface SealControls {
  step:       SealStep;
  startSeal:  () => void;
  unfold:     () => void;
  handleSend: (params: {
    deliveryType:  DeliveryType;
    specificDate?: string;
    email:         string;
  }) => void;
}

export function useSealFlow(config: SealConfig): SealControls {
  const [step, setStep] = useState<SealStep>('idle');
  const timeouts = useRef<ReturnType<typeof setTimeout>[]>([]);

  const schedule = (fn: () => void, delay: number) => {
    const t = setTimeout(fn, delay);
    timeouts.current.push(t);
    return t;
  };

  const startSeal = useCallback(() => {
    setStep('sealing');
    // After wax seal drop + ripple settle, fold the paper
    schedule(() => setStep('folded'), 650);
    // After fold animation, show modal
    schedule(() => setStep('modal'), 1250);
  }, []);

  const unfold = useCallback(() => {
    // Cancel pending transitions
    timeouts.current.forEach(clearTimeout);
    timeouts.current = [];
    setStep('idle');
  }, []);

  const handleSend = useCallback(
    ({
      deliveryType,
      specificDate,
      email,
    }: {
      deliveryType: DeliveryType;
      specificDate?: string;
      email: string;
    }) => {
      setStep('sending');

      const deliver_at = generateDeliveryDate(deliveryType, specificDate);

      // Build the letter data synchronously, then save async
      const letterData = {
        content:         config.getContent(),
        recipient_email: email.trim(),
        recipient_name:  config.recipientName,
        deliver_at,
        sent:            deliveryType === 'now',
        paper_style:     config.getPaperStyle(),
        ink_color:       config.getInkColor(),
        delivery_type:   deliveryType,
        status:          'sealed' as const,
      };

      // Kick off the fly-away animation immediately (don't wait for DB)
      config.onPlayTear();
      schedule(() => setStep('flyaway'), 200);
      schedule(() => setStep('confirmed'), 1100);

      // Save to Supabase in the background — animation already started
      saveLetter(letterData)
        .then((saved) => config.onSaved(saved.id))
        .catch(() => console.error('[Inkwell] Failed to save letter to Supabase.'));
    },
    [config]
  );

  return { step, startSeal, unfold, handleSend };
}
