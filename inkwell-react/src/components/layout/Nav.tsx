/**
 * Nav.tsx — Fixed navigation bar shared across Landing, Write, and Vault pages.
 * Recipient page does not render the Nav.
 *
 * Uses React Router's NavLink to automatically set aria-current="page"
 * on the active route link.
 */

import { useState, useEffect, useRef } from 'react';
import { NavLink, Link } from 'react-router-dom';
import '../../styles/nav.css';

export function Nav() {
  const [open, setOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);

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

  return (
    <>
      <nav
        ref={navRef}
        className={`site-nav ${open ? 'nav--open' : ''}`}
        aria-label="Main navigation"
      >
        <Link to="/" className="nav-logo" aria-label="Inkwell — home">
          INKWELL
        </Link>

        {/* Desktop + mobile link list */}
        <ul className="nav-links" id="nav-links" role="list">
          <li>
            <NavLink
              to="/"
              end
              className={getLinkClass}
              aria-label="Go to home page"
            >
              Home
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/write"
              className={getLinkClass}
              aria-label="Write a letter"
            >
              Write a Letter
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/vault"
              className={getLinkClass}
              aria-label="View my vault"
            >
              My Vault
            </NavLink>
          </li>
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
