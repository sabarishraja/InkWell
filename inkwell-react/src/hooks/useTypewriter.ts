/**
 * useTypewriter.ts — Core typewriter mechanics as a React hook.
 *
 * Direct port of typewriter.js into React idioms.
 * Refs own the DOM interaction; state is kept minimal.
 *
 * CURSOR BUG FIX:
 * The original code called range.setStartAfter(br) which in Chromium
 * resolves to offset 0 of the contenteditable when <br> has no next
 * sibling, causing the caret to snap to the top of the div.
 *
 * Fix: insert a zero-width space text node after <br>, then position
 * the range INSIDE that text node at offset 1 (after the ZWS character).
 * This gives the browser a concrete text position to anchor to.
 */

import { useRef, useCallback, useEffect } from 'react';
import type { RefObject } from 'react';
import type { AudioControls } from './useAudio';

// ---- Configuration ---------------------------------------------------

export interface TypewriterConfig {
  lineHeight?:              number;   // px per line, default 42
  contentWidth?:            number;   // writable px width, default 828 (900px paper - 36px margins × 2)
  lineThreshold?:           number;   // lines before new-page fires, default 17
  onContentChange?:         () => void;
  onLineThresholdReached?:  () => void;
  audio:                    AudioControls;
}

// ---- Returned controller API -----------------------------------------

export interface TypewriterController {
  typingAreaRef:    RefObject<HTMLDivElement | null>;
  cursorRef:        RefObject<HTMLDivElement | null>;
  marginFlashRef:   RefObject<HTMLDivElement | null>;
  carriageSweepRef: RefObject<HTMLDivElement | null>;
  bellWarnRef:      RefObject<HTMLDivElement | null>;
  enable:           () => void;
  setReadOnly:      (readonly: boolean) => void;
  getContent:       () => string;
  getCharCount:     () => number;
  resetThreshold:   () => void;
}

// ---- Hook ------------------------------------------------------------

export function useTypewriter(config: TypewriterConfig): TypewriterController {
  const {
    lineHeight     = 42,
    contentWidth:  _contentWidth = 828,
    lineThreshold  = 17,
    onContentChange,
    onLineThresholdReached,
    audio,
  } = config;

  // DOM element refs — passed to JSX elements
  const typingAreaRef    = useRef<HTMLDivElement>(null);
  const cursorRef        = useRef<HTMLDivElement>(null);
  const marginFlashRef   = useRef<HTMLDivElement>(null);
  const carriageSweepRef = useRef<HTMLDivElement>(null);
  const bellWarnRef      = useRef<HTMLDivElement>(null);

  // Internal state refs (not React state — these must not cause re-renders)
  const typingEnabled     = useRef(false);
  const dingCooldown      = useRef(false);
  const bellWarnActive    = useRef(false);
  const typingTimeout     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const thresholdFired    = useRef(false);
  const lineCheckDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---- Cursor position update ----------------------------------------
  const updateCursorPosition = useCallback(() => {
    const area   = typingAreaRef.current;
    const cursor = cursorRef.current;
    if (!area || !cursor) return;

    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;

    const range      = selection.getRangeAt(0).cloneRange();
    range.collapse(false);

    const rects      = range.getClientRects();
    const areaRect   = area.getBoundingClientRect();
    const parent     = area.offsetParent;
    const parentRect = parent ? parent.getBoundingClientRect() : areaRect;

    let x: number, y: number;
    if (rects.length > 0) {
      const r = rects[rects.length - 1];
      x = r.right - parentRect.left;
      y = r.top   - parentRect.top;
    } else {
      // Empty area — position at start of typing area
      x = areaRect.left - parentRect.left;
      y = areaRect.top  - parentRect.top;
    }

    cursor.style.left = `${x}px`;
    cursor.style.top  = `${y}px`;

    // After a word-wrap the cursor jumps to the new line → hide warning
    const xRelToArea    = x - (areaRect.left - parentRect.left);
    const distFromRight = areaRect.width - xRelToArea;
    if (distFromRight > 12) {
      hideBellWarn();
    }
  }, []);

  // ---- Right margin ding ---------------------------------------------
  const triggerMarginDing = useCallback(() => {
    if (dingCooldown.current) return;
    dingCooldown.current = true;
    audio.playDing();

    const flash = marginFlashRef.current;
    if (flash) {
      flash.classList.add('margin--ding');
      setTimeout(() => {
        flash.classList.remove('margin--ding');
        setTimeout(() => { dingCooldown.current = false; }, 800);
      }, 400);
    } else {
      setTimeout(() => { dingCooldown.current = false; }, 1200);
    }
  }, [audio]);

  // ---- Bell warn (show "return" hint at cursor line) ----------------
  const triggerBellWarn = useCallback((cursorY: number) => {
    const warn = bellWarnRef.current;
    if (!warn) return;
    warn.style.top = `${cursorY}px`;
    if (!bellWarnActive.current) {
      bellWarnActive.current = true;
      warn.classList.add('margin-warn--visible');
    }
  }, []);

  const hideBellWarn = useCallback(() => {
    if (!bellWarnActive.current) return;
    bellWarnActive.current = false;
    bellWarnRef.current?.classList.remove('margin-warn--visible');
  }, []);

  // ---- Margin proximity check (called BEFORE char insertion) --------
  // Uses the cursor element's already-computed CSS position (set by the last
  // updateCursorPosition call) rather than querying selection ranges.
  // getClientRects() on collapsed ranges is unreliable (often returns empty),
  // especially inside ZWS text nodes. The cursor div is always correct.
  const checkMarginProximity = useCallback(() => {
    const area   = typingAreaRef.current;
    const cursor = cursorRef.current;
    if (!area || !cursor || !cursor.style.left) return;

    // cursor.style.left/top are in offsetParent coordinates (set by updateCursorPosition)
    const cursorX = parseFloat(cursor.style.left);
    const cursorY = parseFloat(cursor.style.top);

    const parent     = area.offsetParent;
    const parentRect = parent ? parent.getBoundingClientRect() : area.getBoundingClientRect();
    const areaRect   = area.getBoundingClientRect();

    // distFromRight: px remaining between cursor x and the typing area's right edge
    const areaRight     = areaRect.right  - parentRect.left;
    const distFromRight = areaRight - cursorX;

    // ~6 chars (≈72 px at 19px JMH Typewriter) from right → ring margin bell
    if (distFromRight <= 72 && distFromRight >= 0) {
      triggerMarginDing();
    }

    // ~6 chars (≈72 px) from right → show "↵ return" warning
    if (distFromRight <= 72 && distFromRight >= 0) {
      triggerBellWarn(cursorY);
    }
  }, [triggerMarginDing, triggerBellWarn]);

  // ---- Carriage sweep animation -------------------------------------
  const triggerCarriageSweep = useCallback(() => {
    const sweep = carriageSweepRef.current;
    if (!sweep) return;
    sweep.classList.remove('sweep--active');
    void sweep.offsetWidth; // force reflow to restart animation
    sweep.classList.add('sweep--active');
  }, []);

  // ---- Line threshold check -----------------------------------------
  const checkLineThreshold = useCallback(() => {
    if (thresholdFired.current || !onLineThresholdReached) return;
    if (lineCheckDebounce.current) clearTimeout(lineCheckDebounce.current);
    lineCheckDebounce.current = setTimeout(() => {
      const area = typingAreaRef.current;
      if (!area) return;
      const linesUsed = Math.floor(area.scrollHeight / lineHeight);
      if (linesUsed >= lineThreshold) {
        thresholdFired.current = true;
        onLineThresholdReached();
      }
    }, 100);
  }, [lineHeight, lineThreshold, onLineThresholdReached]);

  // ---- Cursor blink pause ------------------------------------------
  const pauseCursorBlink = useCallback(() => {
    const cursor = cursorRef.current;
    if (!cursor) return;
    cursor.classList.add('cursor--typing');
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      cursor.classList.remove('cursor--typing');
    }, 500);
  }, []);

  // ---- Keydown handler ---------------------------------------------
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!typingEnabled.current) {
      e.preventDefault();
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      audio.playCarriageReturn();
      triggerCarriageSweep();
      dingCooldown.current = false; // Reset ding so new line can trigger it
      hideBellWarn();               // Hide return warning on new line

      const sel = window.getSelection();
      if (sel && sel.rangeCount) {
        const range = sel.getRangeAt(0);
        range.deleteContents();

        const br = document.createElement('br');
        range.insertNode(br);

        // ---- CURSOR BUG FIX ----
        // Insert ZWS text node after br, then place caret INSIDE the text
        // node at offset 1. This prevents Chromium from resolving
        // setStartAfter(br) to offset 0 of the parent container.
        const zw = document.createTextNode('\u200B');
        br.after(zw);
        range.setStart(zw, 1);
        range.setEnd(zw, 1);
        sel.removeAllRanges();
        sel.addRange(range);
      }

      setTimeout(updateCursorPosition, 10);
      checkLineThreshold();
      return;
    }

    if (e.key === 'Backspace') {
      audio.playBackspace();
      pauseCursorBlink();
      setTimeout(updateCursorPosition, 10);
      return;
    }

    // Suppress non-printable keys except Tab (which we use as spaces)
    if (e.key === 'Tab') {
      e.preventDefault();
      // Insert spaces equivalent to a tab stop
      const sel = window.getSelection();
      if (sel && sel.rangeCount) {
        const range = sel.getRangeAt(0);
        range.deleteContents();
        const spaces = document.createTextNode('    ');
        range.insertNode(spaces);
        range.setStartAfter(spaces);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
      }
      checkMarginProximity();  // check position BEFORE browser inserts spaces
      audio.playKeyClack();
      pauseCursorBlink();
      setTimeout(updateCursorPosition, 10);
      return;
    }

    // Suppress arrow keys, Fn keys, Ctrl combos, etc.
    if (
      e.key.length > 1 ||
      e.ctrlKey ||
      e.metaKey ||
      e.altKey
    ) {
      e.preventDefault();
      return;
    }

    // Printable character — check margin BEFORE browser inserts the char,
    // then let the browser insert it and update cursor position after.
    checkMarginProximity();
    audio.playKeyClack();
    pauseCursorBlink();
    setTimeout(updateCursorPosition, 10);
  }, [
    audio,
    triggerCarriageSweep,
    updateCursorPosition,
    checkLineThreshold,
    pauseCursorBlink,
    hideBellWarn,
    checkMarginProximity,
  ]);

  // ---- Input event ------------------------------------------------
  const handleInput = useCallback(() => {
    setTimeout(updateCursorPosition, 10);
    checkLineThreshold();
    onContentChange?.();
  }, [updateCursorPosition, checkLineThreshold, onContentChange]);

  // ---- Paste prevention ------------------------------------------
  const handlePaste = useCallback((e: Event) => {
    e.preventDefault();
  }, []);

  // ---- Selection sync -------------------------------------------
  const handleSelectionChange = useCallback(() => {
    const area = typingAreaRef.current;
    if (typingEnabled.current && area && area.contains(document.activeElement)) {
      updateCursorPosition();
    }
  }, [updateCursorPosition]);

  // ---- Click refocus -------------------------------------------
  const handleDocClick = useCallback((e: MouseEvent) => {
    const target = e.target as HTMLElement;
    // Never steal focus from native interactive elements (e.g., title input)
    const tag = target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON') return;
    if (
      typingEnabled.current &&
      !target.closest('.design-controls') &&
      !target.closest('.modal-overlay') &&
      !target.closest('.seal-modal-overlay') &&
      !target.closest('.nudge-note')
    ) {
      typingAreaRef.current?.focus();
    }
  }, []);

  // ---- Attach / detach event listeners via useEffect -------------
  useEffect(() => {
    const area = typingAreaRef.current;
    if (!area) return;

    area.addEventListener('keydown',  handleKeyDown);
    area.addEventListener('input',    handleInput);
    area.addEventListener('paste',    handlePaste);
    document.addEventListener('selectionchange', handleSelectionChange);
    document.addEventListener('click', handleDocClick);

    return () => {
      area.removeEventListener('keydown',  handleKeyDown);
      area.removeEventListener('input',    handleInput);
      area.removeEventListener('paste',    handlePaste);
      document.removeEventListener('selectionchange', handleSelectionChange);
      document.removeEventListener('click', handleDocClick);
      if (typingTimeout.current)     clearTimeout(typingTimeout.current);
      if (lineCheckDebounce.current) clearTimeout(lineCheckDebounce.current);
    };
  }, [handleKeyDown, handleInput, handlePaste, handleSelectionChange, handleDocClick]);

  // ---- Controller API -------------------------------------------

  const enable = useCallback(() => {
    typingEnabled.current = true;
    const cursor = cursorRef.current;
    const area   = typingAreaRef.current;
    if (cursor) cursor.style.display = 'block';
    if (area)   { area.focus(); requestAnimationFrame(updateCursorPosition); }
  }, [updateCursorPosition]);

  const setReadOnly = useCallback((readonly: boolean) => {
    const area   = typingAreaRef.current;
    const cursor = cursorRef.current;
    if (!area) return;
    area.contentEditable = readonly ? 'false' : 'true';
    typingEnabled.current = !readonly;
    if (cursor) cursor.style.display = readonly ? 'none' : 'block';
    if (!readonly) { area.focus(); setTimeout(updateCursorPosition, 10); }
  }, [updateCursorPosition]);

  const getContent = useCallback((): string => {
    const html = typingAreaRef.current?.innerHTML ?? '';
    return html.replace(/\u200B/g, '');
  }, []);

  const getCharCount = useCallback((): number => {
    const text = typingAreaRef.current?.innerText ?? '';
    return text.replace(/\u200B/g, '').trim().length;
  }, []);

  const resetThreshold = useCallback(() => {
    thresholdFired.current = false;
  }, []);

  return {
    typingAreaRef,
    cursorRef,
    marginFlashRef,
    carriageSweepRef,
    bellWarnRef,
    enable,
    setReadOnly,
    getContent,
    getCharCount,
    resetThreshold,
  };
}
