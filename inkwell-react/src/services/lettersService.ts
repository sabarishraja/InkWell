/**
 * lettersService.ts — Supabase database operations for letters.
 *
 * Letters are immutable once saved: no UPDATE policy exists in the database
 * for user-facing clients. Only the edge functions (service role) can update
 * the `status` field to mark a letter as delivered.
 */

import { supabase } from '../lib/supabaseClient';
import type { Letter, NewLetter } from '../types/letter';

const TABLE = 'letters';

/**
 * Seal and save a new letter. Returns the saved record with its server-assigned
 * id, created_at, and sealed_at timestamps.
 */
export async function saveLetter(letter: NewLetter): Promise<Letter> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      title:           letter.title,
      body:            letter.body,
      user_id:         user.id,
      recipient_email: letter.recipient_email,
      deliver_at:      letter.deliver_at,
      status:          'pending',
      font:            letter.font         ?? 'typewriter',
      paper:           letter.paper        ?? 'parchment',
      seal_design:     letter.seal_design  ?? 'heart',
      seal_color:      letter.seal_color   ?? 'classic-red',
    })
    .select()
    .single();

  if (error) throw error;
  return data as Letter;
}

/**
 * Invoke the send-letter edge function for immediate delivery.
 * The function sends the email via Resend and marks the letter as delivered.
 */
export async function triggerImmediateDelivery(letterId: string): Promise<void> {
  const { error } = await supabase.functions.invoke('send-letter', {
    body: { letter_id: letterId },
  });
  if (error) throw error;
}

/**
 * Retrieve all letters for the current user, newest first.
 */
export async function getAllLetters(): Promise<Letter[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('getAllLetters error:', error.message, error);
    throw error;
  }
  return (data ?? []) as Letter[];
}

/**
 * Retrieve a single letter by id.
 * Works for owner (via select_own_letters policy) and for recipients
 * reading delivered letters (via select_delivered_letters policy).
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
 * Permanently delete a letter by id.
 */
export async function deleteLetter(id: string): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq('id', id);

  if (error) throw error;
}
