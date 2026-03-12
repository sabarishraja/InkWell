/**
 * letter.ts — Shared TypeScript types for Inkwell.
 * Matches the Supabase `letters` table schema exactly.
 */

export type PaperStyle = 'parchment' | 'linen' | 'aged';
export type InkColor = 'sepia' | 'navy' | 'midnight';
export type DeliveryType = 'now' | 'scheduled' | 'surprise';
export type LetterStatus = 'sealed' | 'delivered' | 'opened';

export interface Letter {
  id: string;
  user_id: string;
  content: string;             // HTML (preserves <br> tags from contenteditable)
  recipient_email: string;
  deliver_at: string;          // ISO timestamptz
  sent: boolean;
  created_at: string;          // ISO timestamptz
  // Extended metadata stored alongside the letter
  recipient_name: string;
  paper_style: PaperStyle;
  ink_color: InkColor;
  delivery_type: DeliveryType;
  status: LetterStatus;
}

// Used when creating a new letter — id, user_id, created_at come from Supabase
export type NewLetter = Omit<Letter, 'id' | 'user_id' | 'created_at'>;
