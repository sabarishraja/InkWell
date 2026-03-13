/**
 * useLetters.ts — React hook wrapping the letters service.
 *
 * Components import this hook instead of touching the service layer directly.
 */

import { useState, useCallback } from 'react';
import type { Letter, NewLetter } from '../types/letter';
import * as service from '../services/lettersService';

interface UseLettersReturn {
  letters:       Letter[];
  loading:       boolean;
  error:         string | null;
  fetchLetters:  () => Promise<void>;
  createLetter:  (letter: NewLetter) => Promise<Letter | null>;
  getLetter:     (id: string) => Promise<Letter | null>;
  deleteLetter:  (id: string) => Promise<boolean>;
}

export function useLetters(): UseLettersReturn {
  const [letters, setLetters] = useState<Letter[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const fetchLetters = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await service.getAllLetters();
      setLetters(data);
    } catch {
      setError('Failed to load letters.');
    } finally {
      setLoading(false);
    }
  }, []);

  const createLetter = useCallback(async (letter: NewLetter): Promise<Letter | null> => {
    try {
      const saved = await service.saveLetter(letter);
      return saved;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('createLetter error:', msg, err);
      setError(msg);
      return null;
    }
  }, []);

  const getLetter = useCallback(async (id: string) => {
    return service.getLetter(id);
  }, []);

  const deleteLetter = useCallback(async (id: string): Promise<boolean> => {
    try {
      await service.deleteLetter(id);
      setLetters((prev) => prev.filter((l) => l.id !== id));
      return true;
    } catch {
      setError('Failed to delete letter.');
      return false;
    }
  }, []);

  return { letters, loading, error, fetchLetters, createLetter, getLetter, deleteLetter };
}
