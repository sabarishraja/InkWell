/**
 * letter.ts — Core types for the Inkwell letters system.
 */

/** A letter as stored in and returned from Supabase. */
export interface Letter {
  id:              string;
  user_id:         string;
  title:           string;
  body:            string;       // Raw HTML from contenteditable (<br> tags preserved)
  created_at:      string;       // ISO timestamptz
  recipient_email: string;       // Who receives the letter
  deliver_at:      string;       // ISO timestamptz — when to send
  status:          'pending' | 'delivered';
  sealed_at:       string;       // ISO timestamptz — when sealed
  font:            string;       // FontChoice — stored as text in DB
  paper:           string;       // PaperStyle — stored as text in DB
  seal_design:     string;       // SealDesign — stored as text in DB
  seal_color:      string;       // SealColor  — stored as text in DB
}

/** Shape required to create a new (sealed) letter. */
export type NewLetter = Pick<Letter,
  | 'title'
  | 'body'
  | 'recipient_email'
  | 'deliver_at'
> & {
  font?:         FontChoice;
  paper?:        PaperStyle;
  seal_design?:  SealDesign;
  seal_color?:   SealColor;
};

// ---------------------------------------------------------------------------
// Type aliases
// ---------------------------------------------------------------------------
export type FontChoice   = 'typewriter' | 'serif' | 'script';
export type PaperStyle   = 'parchment' | 'linen' | 'aged';
export type InkColor     = 'sepia' | 'navy' | 'midnight';
export type DeliveryType = 'now' | 'scheduled' | 'surprise';
export type LetterStatus = 'pending' | 'delivered';
export type SealDesign   = 'flower' | 'infinity-heart' | 'floral' | 'heart' | 'monogram';
export type SealColor    = 'classic-red' | 'burgundy' | 'gold' | 'forest-green' | 'navy';
