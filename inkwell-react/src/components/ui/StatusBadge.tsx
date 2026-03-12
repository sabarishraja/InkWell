/**
 * StatusBadge.tsx — Letter status pill badge (Sealed / Delivered / Opened).
 */

import type { LetterStatus } from '../../types/letter';

interface Props {
  status: LetterStatus;
}

const LABELS: Record<LetterStatus, string> = {
  sealed:    'Sealed',
  delivered: 'Delivered',
  opened:    'Opened',
};

const CLASSES: Record<LetterStatus, string> = {
  sealed:    'badge--sealed',
  delivered: 'badge--delivered',
  opened:    'badge--opened',
};

export function StatusBadge({ status }: Props) {
  return (
    <span className={`status-badge ${CLASSES[status]}`} aria-label={`Status: ${LABELS[status]}`}>
      {LABELS[status]}
    </span>
  );
}
