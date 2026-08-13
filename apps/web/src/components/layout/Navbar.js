import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaUser, FaHeart, FaBars, FaTimes, FaSignOutAlt, FaCar } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  const isHomePage = location.pathname === '/';

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuOpen && !event.target.closest('.nr-nav')) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const transparent = isHomePage && !scrolled;
  const solid = scrolled || !isHomePage;

  const linkStyle = (path) =>
    location.pathname === path
      ? { color: 'var(--nr-accent)' }
      : {};

  const close = () => setMenuOpen(false);

  const navLink = (to, label) => (
    <Link
      to={to}
      className={`nav-link ${location.pathname === to ? 'active' : ''}`}
      style={linkStyle(to)}
      onClick={close}
    >
      {label}
    </Link>
  );

  return (
    <nav
      className={`navbar navbar-expand-lg fixed-top nr-nav ${transparent ? '' : 'glass border-bottom'}`}
      style={{
        borderBottom: transparent ? '1px solid transparent' : '1px solid var(--nr-border)',
        transition: 'background-color 0.3s ease, box-shadow 0.3s ease',
        boxShadow: solid ? 'var(--nr-shadow-sm)' : 'none',
      }}
    >
      <div className="container">
        <Link className="navbar-brand d-flex align-items-center gap-2" to="/" style={{ fontWeight: '800', fontSize: '1.5rem', letterSpacing: '-0.02em' }}>
          <span
            className="d-inline-flex align-items-center justify-content-center"
            style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--nr-grad-accent)', color: '#101014' }}
          >
            <FaCar size={16} />
          </span>
          <span style={{ color: 'var(--nr-text)' }}>
            Next<span className="text-gradient">Ride</span>
          </span>
        </Link>

        <button
          className="navbar-toggler"
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          style={{ border: 'none' }}
          aria-label="Toggle navigation"
        >
          <span style={{ color: 'var(--nr-text)' }}>
            {menuOpen ? <FaTimes size={22} /> : <FaBars size={22} />}
          </span>
        </button>

        <div
          className={`collapse navbar-collapse ${menuOpen ? 'show' : ''}`}
          id="navbarContent"
        >
          <ul className="navbar-nav me-auto mb-2 mb-lg-0 ms-lg-4">
            <li className="nav-item">{navLink('/', 'Accueil')}</li>
            <li className="nav-item">{navLink('/search', 'Browsing')}</li>
            <li className="nav-item">{navLink('/predict', 'Prédiction')}</li>
            <li className="nav-item">{navLink('/addcar', 'Ajouter Voiture')}</li>
            <li className="nav-item">{navLink('/visualization', 'Visualisation')}</li>
          </ul>

          <div className="d-flex align-items-center gap-2">
            {user ? (
              <>
                <Link
                  to="/profile"
                  className="btn btn-ghost rounded-circle p-2"
                  style={{ width: 42, height: 42 }}
                  aria-label="Profile"
                >
                  <FaUser size={16} />
                </Link>
                <Link
                  to="/profile?favorites=true"
                  className="btn btn-ghost rounded-circle p-2"
                  style={{ width: 42, height: 42 }}
                  aria-label="Favorites"
                >
                  <FaHeart size={16} />
                </Link>
                <button
                  className="btn btn-ghost rounded-circle p-2"
                  style={{ width: 42, height: 42 }}
                  onClick={logout}
                  aria-label="Sign out"
                >
                  <FaSignOutAlt size={16} />
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn-ghost px-3">
                  Se Connecter
                </Link>
                <Link to="/signup" className="btn btn-accent rounded-pill px-4">
                  S'Inscrire
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
