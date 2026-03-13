/**
 * letter.ts — Core types for the Inkwell letters system.
 */

/** A letter as stored in and returned from Supabase. */
export interface Letter {
  id:         string;
  user_id:    string;
  title:      string;
  body:       string;       // Raw HTML from contenteditable (<br> tags preserved)
  created_at: string;       // ISO timestamptz
}

/** Shape required to create a new letter. */
export type NewLetter = Pick<Letter, 'title' | 'body'>;

// ---------------------------------------------------------------------------
// Legacy type aliases — kept so older components that have not yet been
// removed from the project continue to compile.
// ---------------------------------------------------------------------------
export type PaperStyle   = 'parchment' | 'linen' | 'aged';
export type InkColor     = 'sepia' | 'navy' | 'midnight';
export type DeliveryType = 'now' | 'scheduled' | 'surprise';
export type LetterStatus = 'sealed' | 'delivered' | 'opened';
