/**
 * useAudio.ts — Howler.js sound management for Inkwell.
 *
 * Maps sound events to the four MP3 files in public/assets/sounds/.
 * Falls back to Web Audio API procedural sounds if files fail to load.
 *
 * Files expected:
 *   public/assets/sounds/typewriter_key_clack.mp3
 *   public/assets/sounds/carriage_return_lever.mp3
 *   public/assets/sounds/typewriter_scrolling.mp3
 *   public/assets/sounds/paper_tearing_at_end.mp3
 *
 * iOS audio unlock: Howler handles this automatically when
 * html5: false (Web Audio mode). The AudioContext resumes on
 * first user gesture.
 */

import { useRef, useCallback, useEffect, useMemo } from 'react';
import { Howl, Howler } from 'howler';

// Pure Howler.js implementation — procedural fallbacks removed.

// ---- Hook ----------------------------------------------------------------

export interface AudioControls {
  playKeyClack:        () => void;
  playBackspace:       () => void;
  playDing:            () => void;
  playCarriageReturn:  () => void;
  playPaperTear:       () => void;
  startAmbientLoop:    () => void;
  stopAmbientLoop:     (fadeDuration?: number) => void;
  setMuted:            (muted: boolean) => void;
  isMuted:             () => boolean;
}

export function useAudio(): AudioControls {
  // Howl instances stored in refs so they persist across renders
  const clackRef      = useRef<Howl | null>(null);
  const returnRef     = useRef<Howl | null>(null);
  const dingRef       = useRef<Howl | null>(null);
  const tearRef       = useRef<Howl | null>(null);
  const ambientRef    = useRef<Howl | null>(null);
  const mutedRef      = useRef<boolean>(false);

  // Initialise Howl instances lazily once (not on every render)
  useEffect(() => {
    const base = '/sounds/';

    // Key clack — 3 randomised rate variants on every play
    const clack = new Howl({
      src: [`${base}typewriter_key_clack.mp3`],
      volume: 0.65,
      onloaderror: (_id, err) => { console.error('Failed to load key clack:', err); },
    });
    clackRef.current = clack;

    // Carriage return lever sound
    const ret = new Howl({
      src: [`${base}carriage_return_lever.mp3`],
      volume: 0.55,
      onloaderror: (_id, err) => { console.error('Failed to load carriage return:', err); },
    });
    returnRef.current = ret;

    // Ding — same file played at high rate to simulate bell
    const ding = new Howl({
      src: [`${base}carriage_return_lever.mp3`],
      volume: 0.2,
      rate: 2.8,
      onloaderror: (_id, err) => { console.error('Failed to load ding:', err); },
    });
    dingRef.current = ding;

    // Paper tear (seal event)
    const tear = new Howl({
      src: [`${base}paper_tearing_at_end.mp3`],
      volume: 0.6,
      onloaderror: (_id, err) => { console.error('Failed to load paper tear:', err); },
    });
    tearRef.current = tear;

    // Ambient loop for recipient page — typewriter scrolling as ambient
    const ambient = new Howl({
      src: [`${base}typewriter_scrolling.mp3`],
      volume: 0,
      loop: true,
      onloaderror: (_id, err) => { console.error('Failed to load ambient loop:', err); },
    });
    ambientRef.current = ambient;

    return () => {
      clack.unload();
      ret.unload();
      ding.unload();
      tear.unload();
      ambient.unload();
      // Clear refs so stale instances aren't used after unmount
      clackRef.current   = null;
      returnRef.current  = null;
      dingRef.current    = null;
      tearRef.current    = null;
      ambientRef.current = null;
    };
  }, []);

  const playKeyClack = useCallback(() => {
    if (mutedRef.current) return;
    if (clackRef.current) {
      // Randomise pitch slightly on each keystroke so it doesn't sound robotic
      clackRef.current.rate(0.85 + Math.random() * 0.3);
      clackRef.current.play();
    }
  }, []);

  const playBackspace = useCallback(() => {
    if (mutedRef.current) return;
    if (clackRef.current) {
      clackRef.current.rate(0.6 + Math.random() * 0.15);
      clackRef.current.volume(0.35);
      clackRef.current.play();
      // Restore volume after this play
      setTimeout(() => clackRef.current?.volume(0.65), 100);
    }
  }, []);

  const playDing = useCallback(() => {
    if (mutedRef.current) return;
    dingRef.current?.play();
  }, []);

  const playCarriageReturn = useCallback(() => {
    if (mutedRef.current) return;
    if (returnRef.current) {
      returnRef.current.play();
    }
  }, []);

  const playPaperTear = useCallback(() => {
    if (mutedRef.current) return;
    tearRef.current?.play();
  }, []);

  const startAmbientLoop = useCallback(() => {
    if (mutedRef.current) return;
    if (ambientRef.current) {
      ambientRef.current.play();
      ambientRef.current.fade(0, 0.06, 2000);
    }
  }, []);

  const stopAmbientLoop = useCallback((fadeDuration = 3000) => {
    if (ambientRef.current && ambientRef.current.playing()) {
      ambientRef.current.fade(ambientRef.current.volume(), 0, fadeDuration);
      setTimeout(() => ambientRef.current?.stop(), fadeDuration + 200);
    }
  }, []);

  const setMuted = useCallback((muted: boolean) => {
    mutedRef.current = muted;
    Howler.mute(muted);
  }, []);

  const isMuted = useCallback(() => mutedRef.current, []);

  return useMemo(() => ({
    playKeyClack,
    playBackspace,
    playDing,
    playCarriageReturn,
    playPaperTear,
    startAmbientLoop,
    stopAmbientLoop,
    setMuted,
    isMuted,
  }), [
    playKeyClack,
    playBackspace,
    playDing,
    playCarriageReturn,
    playPaperTear,
    startAmbientLoop,
    stopAmbientLoop,
    setMuted,
    isMuted,
  ]);
}
