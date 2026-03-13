/**
 * lettersService.ts — Supabase database operations for letters.
 *
 * Letters are immutable once saved: no UPDATE policy exists in the database,
 * so only SELECT, INSERT, and DELETE are exposed here.
 */

import { supabase } from '../lib/supabaseClient';
import type { Letter, NewLetter } from '../types/letter';

const TABLE = 'letters';

/**
 * Save a new letter. Returns the saved record with its server-assigned id
 * and created_at timestamp.
 */
export async function saveLetter(letter: NewLetter): Promise<Letter> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from(TABLE)
    .insert({ title: letter.title, body: letter.body, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data as Letter;
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
