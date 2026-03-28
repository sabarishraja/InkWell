/**
 * Nav.tsx — Fixed navigation bar, auth-aware.
 *
 * Authenticated:    INKWELL (→ /dashboard) | Compose | Sign Out
 * Unauthenticated:  INKWELL (→ /)          | Sign In
 */

import { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useSupabaseAuth } from '../../hooks/useSupabaseAuth';
import '../../styles/nav.css';

export function Nav() {
  const [open, setOpen]   = useState(false);
  const navRef            = useRef<HTMLElement>(null);
  const { session, signOut } = useSupabaseAuth();
  const navigate          = useNavigate();

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (open && navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [open]);

  const getLinkClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? 'nav-link nav-link--active' : 'nav-link';

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <>
      <nav
        ref={navRef}
        className={`site-nav ${open ? 'nav--open' : ''}`}
        aria-label="Main navigation"
      >
        <Link
          to={session ? '/dashboard' : '/'}
          className="nav-logo"
          aria-label="Inkwell — home"
        >
          INKWELL
        </Link>

        <ul className="nav-links" id="nav-links" role="list">
          {session ? (
            <>
              <li>
                <NavLink to="/dashboard" end className={getLinkClass}>
                  My Letters
                </NavLink>
              </li>
              <li>
                <NavLink to="/coach" className={getLinkClass}>
                  Compose
                </NavLink>
              </li>
              <li>
                <button
                  className="nav-link nav-signout"
                  onClick={handleSignOut}
                  aria-label="Sign out"
                >
                  Sign Out
                </button>
              </li>
            </>
          ) : (
            <li>
              <NavLink to="/auth" className={getLinkClass}>
                Sign In
              </NavLink>
            </li>
          )}
        </ul>

        {/* Hamburger (mobile only) */}
        <button
          className="nav-hamburger"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          aria-controls="nav-links"
          onClick={() => setOpen((o) => !o)}
        >
          <span />
          <span />
          <span />
        </button>
      </nav>

      {/* Spacer to push page content below fixed nav */}
      <div className="nav-spacer" aria-hidden="true" />
    </>
  );
}
