/**
 * useSupabaseAuth.ts — Email + password authentication hook.
 *
 * Provides persistent session state and auth actions.
 * Session is restored from localStorage on mount via getSession().
 *
 * Password recovery flow:
 *   1. User requests reset → resetPassword() sends an email.
 *   2. User clicks the link → lands on /auth with a recovery token.
 *   3. Supabase client auto-exchanges the token and fires PASSWORD_RECOVERY.
 *   4. isPasswordRecovery becomes true → UI shows "set new password" form.
 *   5. User submits new password → updatePassword() clears isPasswordRecovery.
 */

import { useState, useEffect } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';

interface AuthState {
  session:            Session | null;
  user:               User | null;
  loading:            boolean;
  isPasswordRecovery: boolean;
}

interface AuthActions {
  signUp:         (email: string, password: string) => Promise<{ error: string | null; needsConfirmation: boolean }>;
  signIn:         (email: string, password: string) => Promise<{ error: string | null }>;
  signOut:        () => Promise<void>;
  resetPassword:  (email: string) => Promise<{ error: string | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: string | null }>;
}

export function useSupabaseAuth(): AuthState & AuthActions {
  const [session,            setSession]            = useState<Session | null>(null);
  const [user,               setUser]               = useState<User | null>(null);
  const [loading,            setLoading]            = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  useEffect(() => {
    // Restore existing session on mount (persisted in localStorage by Supabase)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for sign-in, sign-out, and password recovery events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsPasswordRecovery(event === 'PASSWORD_RECOVERY');
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (
    email: string,
    password: string,
  ): Promise<{ error: string | null; needsConfirmation: boolean }> => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message, needsConfirmation: false };
    // session is null when Supabase requires email confirmation before login
    return { error: null, needsConfirmation: !data.session };
  };

  const signIn = async (
    email: string,
    password: string,
  ): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? error.message : null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const resetPassword = async (email: string): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth`,
    });
    return { error: error ? error.message : null };
  };

  const updatePassword = async (newPassword: string): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (!error) setIsPasswordRecovery(false);
    return { error: error ? error.message : null };
  };

  return {
    session,
    user,
    loading,
    isPasswordRecovery,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
  };
}
