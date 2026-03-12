/**
 * useLetters.ts — React hook for letter CRUD operations.
 *
 * Wraps lettersService so components never import the service layer directly.
 * Manages loading state and error handling.
 */

import { useState, useCallback } from 'react';
import type { Letter, NewLetter } from '../types/letter';
import * as lettersService from '../services/lettersService';

interface UseLettersReturn {
  letters:       Letter[];
  loading:       boolean;
  error:         string | null;
  fetchLetters:  () => Promise<void>;
  saveLetter:    (letter: NewLetter) => Promise<Letter | null>;
  getLetter:     (id: string) => Promise<Letter | null>;
  updateLetter:  (id: string, patch: Partial<Letter>) => Promise<Letter | null>;
  markOpened:    (id: string) => Promise<void>;
}

export function useLetters(): UseLettersReturn {
  const [letters, setLetters] = useState<Letter[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const fetchLetters = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await lettersService.getAllLetters();
      setLetters(data);
    } catch (e) {
      setError('Failed to load letters.');
    } finally {
      setLoading(false);
    }
  }, []);

  const saveLetter = useCallback(async (letter: NewLetter): Promise<Letter | null> => {
    try {
      const saved = await lettersService.saveLetter(letter);
      setLetters((prev) => [saved, ...prev]);
      return saved;
    } catch (e) {
      setError('Failed to save letter.');
      return null;
    }
  }, []);

  const getLetter = useCallback(async (id: string): Promise<Letter | null> => {
    return lettersService.getLetter(id);
  }, []);

  const updateLetter = useCallback(async (id: string, patch: Partial<Letter>): Promise<Letter | null> => {
    const updated = await lettersService.updateLetter(id, patch);
    if (updated) {
      setLetters((prev) => prev.map((l) => l.id === id ? updated : l));
    }
    return updated;
  }, []);

  const markOpened = useCallback(async (id: string) => {
    await lettersService.markOpened(id);
    setLetters((prev) => prev.map((l) => l.id === id ? { ...l, status: 'opened' } : l));
  }, []);

  return { letters, loading, error, fetchLetters, saveLetter, getLetter, updateLetter, markOpened };
}
