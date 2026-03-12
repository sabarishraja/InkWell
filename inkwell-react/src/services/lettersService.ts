/**
 * lettersService.ts — All Supabase database operations for letters.
 *
 * This is a clean abstraction layer. Every method has a clear contract
 * and a TODO comment linking to the exact Supabase operation.
 *
 * Row-Level Security policy (set up in Supabase dashboard):
 *   CREATE POLICY "Users own their letters"
 *   ON letters FOR ALL
 *   USING (auth.uid() = user_id)
 *   WITH CHECK (auth.uid() = user_id);
 */

import { supabase } from '../lib/supabaseClient';
import { generateDeliveryDate } from '../lib/utils';
import type { Letter, NewLetter, LetterStatus } from '../types/letter';

const TABLE = 'letters';

/**
 * Save a new letter to the vault (called on Seal & Send).
 * Returns the saved letter with server-assigned id and created_at.
 *
 * TODO: Replace with supabase.from('letters').insert(letter).select().single()
 */
export async function saveLetter(letter: NewLetter): Promise<Letter> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      content:        letter.content,
      recipient_email: letter.recipient_email,
      recipient_name: letter.recipient_name,
      deliver_at:     letter.deliver_at,
      sent:           letter.sent ?? false,
      paper_style:    letter.paper_style,
      ink_color:      letter.ink_color,
      delivery_type:  letter.delivery_type,
      status:         letter.status ?? 'sealed',
    })
    .select()
    .single();

  if (error) throw error;
  return data as Letter;
}

/**
 * Retrieve a single letter by ID.
 * Used by recipient.html to look up the letter from the URL param.
 *
 * TODO: Replace with supabase.from('letters').select('*').eq('id', id).single()
 */
export async function getLetter(id: string): Promise<Letter | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .single();

  if (error) return null;
  return data as Letter;
}

/**
 * Get all letters belonging to the currently authenticated user.
 * Sorted: unsealed letters first (soonest delivery), then delivered (newest first).
 *
 * TODO: Replace with supabase.from('letters').select('*').eq('user_id', userId).order(...)
 */
export async function getAllLetters(): Promise<Letter[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('deliver_at', { ascending: true });

  if (error) return [];
  return (data ?? []) as Letter[];
}

/**
 * Partial update for a letter (e.g., mark as opened).
 *
 * TODO: Replace with supabase.from('letters').update(patch).eq('id', id)
 */
export async function updateLetter(
  id: string,
  patch: Partial<Letter>
): Promise<Letter | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .update(patch)
    .eq('id', id)
    .select()
    .single();

  if (error) return null;
  return data as Letter;
}

/**
 * Mark a letter as opened (called when recipient views the letter).
 */
export async function markOpened(id: string): Promise<void> {
  await updateLetter(id, { status: 'opened' as LetterStatus });
}

/**
 * Save a draft in progress (upsert by id).
 * Called periodically during writing so progress isn't lost.
 *
 * TODO: Replace with supabase.from('letters').upsert(draft, { onConflict: 'id' })
 */
export async function saveDraft(draft: Partial<Letter> & { id?: string }): Promise<Letter | null> {
  if (draft.id) {
    return updateLetter(draft.id, draft);
  }
  // No id yet — create a new sealed letter as draft
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      content:        draft.content ?? '',
      recipient_email: draft.recipient_email ?? '',
      recipient_name: draft.recipient_name ?? '',
      deliver_at:     draft.deliver_at ?? generateDeliveryDate('now'),
      sent:           false,
      paper_style:    draft.paper_style ?? 'parchment',
      ink_color:      draft.ink_color ?? 'sepia',
      delivery_type:  draft.delivery_type ?? 'now',
      status:         'sealed',
    })
    .select()
    .single();

  if (error) return null;
  return data as Letter;
}
