/**
 * useScrollReveal.ts — IntersectionObserver scroll-reveal hook.
 *
 * Adds 'in-view' class to elements with [data-animate] attribute
 * when they enter the viewport. Respects prefers-reduced-motion.
 */

import { useEffect, useRef } from 'react';

export function useScrollReveal(containerRef?: React.RefObject<HTMLElement | null>) {
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const root = containerRef?.current ?? document;
    const elements = (root as HTMLElement | Document).querySelectorAll
      ? (root as HTMLElement | Document).querySelectorAll('[data-animate]')
      : document.querySelectorAll('[data-animate]');

    if (prefersReduced) {
      // Skip animations — immediately show all elements
      elements.forEach((el) => el.classList.add('in-view'));
      return;
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            // Once revealed, stop observing (no hide-on-scroll)
            observerRef.current?.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );

    elements.forEach((el) => observerRef.current?.observe(el));

    return () => {
      observerRef.current?.disconnect();
    };
  }, []);
}
