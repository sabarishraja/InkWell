/**
 * LandingPage.tsx — Inkwell marketing/onboarding page.
 *
 * Direct JSX translation of index.html.
 * Scroll-reveal via useScrollReveal hook.
 */

import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../styles/landing.css';
import { Nav }           from '../components/layout/Nav';
import { useScrollReveal } from '../hooks/useScrollReveal';

export function LandingPage() {
  useScrollReveal();

  // Set page title
  useEffect(() => { document.title = 'Inkwell — Write Letters That Wait'; }, []);

  return (
    <div className="landing-page">
      <Nav />

      {/* ---- Hero -------------------------------------------- */}
      <section className="hero" aria-labelledby="hero-headline">
        <div className="hero__content">
          <p className="hero__eyebrow" data-animate>
            A letter is a gift of time.
          </p>

          <h1 id="hero-headline" className="hero__headline" data-animate data-delay="1">
            Some things deserve more than a text message.
          </h1>

          <p className="hero__sub" data-animate data-delay="2">
            Write it. Seal it. Let it arrive when the time is right.
          </p>

          <Link
            to="/write"
            className="btn-cta"
            data-animate
            data-delay="3"
            aria-label="Begin writing a letter"
          >
            Begin Writing
          </Link>

          {/* Decorative quill motif */}
          <div className="hero__quill" data-animate data-delay="4" aria-hidden="true">
            <svg width="40" height="60" viewBox="0 0 40 60" fill="none">
              <path d="M20 2 C35 10, 38 35, 20 58" stroke="#C9974A" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
              <path d="M20 2 C5 10, 2 35, 20 58" stroke="#C9974A" strokeWidth="0.8" fill="none" strokeLinecap="round" opacity="0.6"/>
              <path d="M14 20 C20 22, 26 20, 20 58" stroke="#C9974A" strokeWidth="0.6" fill="none" strokeLinecap="round" opacity="0.4"/>
              <line x1="20" y1="50" x2="20" y2="60" stroke="#C9974A" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="scroll-indicator" aria-hidden="true">
          <div className="scroll-indicator__line" />
        </div>
      </section>

      {/* ---- How It Works ------------------------------------ */}
      <section className="how-it-works" aria-labelledby="hiw-title">
        <div className="section-header">
          <p className="section-label" data-animate>The ritual</p>
          <h2 id="hiw-title" className="section-title" data-animate data-delay="1">
            Three steps. One letter. A lifetime of meaning.
          </h2>
        </div>

        <div className="steps-grid">
          <article className="step-card" data-animate>
            <div className="step-number" aria-hidden="true">01</div>
            <h3 className="step-title">Write</h3>
            <p className="step-desc">
              Load your paper. Type with purpose. Hear the keys. Feel the ritual.
            </p>
          </article>

          <article className="step-card" data-animate data-delay="1">
            <div className="step-number" aria-hidden="true">02</div>
            <h3 className="step-title">Seal</h3>
            <p className="step-desc">
              When you&rsquo;re done, seal the letter with a stamp. It&rsquo;s locked.
              No going back.
            </p>
          </article>

          <article className="step-card" data-animate data-delay="2">
            <div className="step-number" aria-hidden="true">03</div>
            <h3 className="step-title">Deliver</h3>
            <p className="step-desc">
              Choose when it arrives. Tomorrow. Their birthday. A surprise.
              The waiting is part of the gift.
            </p>
          </article>
        </div>
      </section>

      {/* ---- Time Capsule Feature ---------------------------- */}
      <section className="feature-capsule" aria-labelledby="capsule-title">
        <div className="feature-capsule__inner">
          <div className="feature-capsule__copy">
            <h2 id="capsule-title" className="feature-capsule__headline" data-animate>
              Letters that arrive when you choose.
            </h2>
            <p className="feature-capsule__body" data-animate data-delay="1">
              Some words need time before they land. Write your letter today, then
              choose when it arrives — tomorrow, on their birthday, or whenever the
              moment feels right.
            </p>
            <p className="feature-capsule__body" data-animate data-delay="2">
              The waiting is part of the gift. Inkwell holds it safely until then.
            </p>
          </div>

          {/* CSS envelope illustration */}
          <div className="envelope-wrap" data-animate aria-hidden="true">
            <div className="envelope-date-tag">Arriving — whenever you decide</div>
            <div className="envelope">
              <div className="envelope__seal" />
            </div>
          </div>
        </div>
      </section>

      {/* ---- Footer ------------------------------------------ */}
      <footer className="site-footer">
        <div className="footer__inner">
          <div className="footer__logo">Inkwell</div>
          <p className="footer__tagline">Write what you mean.</p>
          <nav className="footer__links" aria-label="Footer navigation">
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
          </nav>
          <p className="footer__copy">
            &copy; {new Date().getFullYear()} Inkwell. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
