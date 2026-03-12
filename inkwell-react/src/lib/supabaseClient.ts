/**
 * supabaseClient.ts — Singleton Supabase client.
 * Reads URL and anon key from Vite env variables.
 * Import this anywhere you need DB or Auth access.
 */

import { createClient } from '@supabase/supabase-js';
import type { Letter } from '../types/letter';

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL  as string;
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseKey) {
  console.warn(
    '[Inkwell] Supabase env vars missing. ' +
    'Copy .env.example to .env and fill in your project URL and anon key.'
  );
}

// TODO: Add Database generic type parameter once Supabase types are generated:
// createClient<Database>(url, key)
export const supabase = createClient(supabaseUrl ?? '', supabaseKey ?? '');

// Convenience type for Supabase table rows
export type { Letter };
