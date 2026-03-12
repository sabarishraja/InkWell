/**
 * utils.ts — Pure utility functions shared across the app.
 * No DOM dependency — safe to import anywhere.
 */

import type { DeliveryType } from '../types/letter';

/**
 * Format a Date (or ISO string) to a human-readable string
 * matching the cursive date style on the paper header.
 * e.g. "March 11, 2026"
 */
export function formatDate(date: Date | string | number): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year:  'numeric',
    month: 'long',
    day:   'numeric',
  });
}

/**
 * Generate a delivery ISO timestamp based on delivery type.
 * Used when saving the letter during the seal flow.
 */
export function generateDeliveryDate(
  type: DeliveryType,
  specificDate?: string | null
): string {
  const now = Date.now();

  if (type === 'now') {
    return new Date(now).toISOString();
  }
  if (type === 'scheduled' && specificDate) {
    const d = new Date(specificDate);
    const time = isNaN(d.getTime())
      ? now + 7 * 24 * 60 * 60 * 1000
      : d.getTime();
    return new Date(time).toISOString();
  }
  if (type === 'surprise') {
    const days = Math.floor(Math.random() * 30) + 1;
    return new Date(now + days * 24 * 60 * 60 * 1000).toISOString();
  }
  // Default: 7 days
  return new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString();
}

/**
 * Strip HTML tags from contenteditable innerHTML and return plain text.
 * Converts <br> to \n, then strips remaining tags.
 */
export function htmlToPlain(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/&nbsp;/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\u200B/g, '') // strip zero-width spaces
    .trim();
}

/**
 * Calculate progress percentage between two dates for the vault progress bar.
 * Returns 0–100.
 */
export function calcProgress(writtenAt: string, deliverAt: string): number {
  const now       = Date.now();
  const start     = new Date(writtenAt).getTime();
  const end       = new Date(deliverAt).getTime();
  const total     = end - start;
  const elapsed   = now - start;
  if (total <= 0) return 100;
  return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
}

/**
 * Generate a random UUID v4.
 * Falls back to crypto.randomUUID() if available.
 */
export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}
