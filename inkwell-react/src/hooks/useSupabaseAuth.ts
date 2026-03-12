/**
 * useSupabaseAuth.ts — Supabase Magic Link authentication hook.
 *
 * Provides session state and auth actions.
 * The Supabase client auto-exchanges the magic link token from the URL
 * hash on page load — no extra handling needed.
 *
 * TODO: Add OAuth provider support (Google, GitHub) in next build.
 */

import { useState, useEffect } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';

interface AuthState {
  session: Session | null;
  user:    User | null;
  loading: boolean;
}

interface AuthActions {
  signInWithMagicLink: (email: string) => Promise<{ error: string | null }>;
  signOut:             () => Promise<void>;
}

export function useSupabaseAuth(): AuthState & AuthActions {
  const [session, setSession] = useState<Session | null>(null);
  const [user,    setUser]    = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore session from local storage on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth state changes (magic link callback, sign-out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signInWithMagicLink = async (email: string): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // Redirect back to the app after magic link click
        emailRedirectTo: `${window.location.origin}/vault`,
      },
    });
    return { error: error ? error.message : null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return { session, user, loading, signInWithMagicLink, signOut };
}
