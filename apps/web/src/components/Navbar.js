import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaUser, FaHeart, FaBars, FaTimes, FaSignOutAlt } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  // Determine if we're on the homepage
  const isHomePage = location.pathname === '/';

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuOpen && !event.target.closest('.navbar-collapse')) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  // Determine navbar classes based on page and scroll position
  let navbarClasses = 'navbar navbar-expand-lg fixed-top ';
  
  if (isHomePage) {
    // On homepage: white when at top, dark with shadow when scrolled down
    if (scrolled) {
      navbarClasses += 'navbar-dark bg-dark bg-opacity-75 shadow py-2';
    } else {
      navbarClasses += 'navbar-light bg-white py-3';
    }
  } else {
    // On other pages: always dark with shadow
    navbarClasses += 'navbar-dark bg-dark bg-opacity-90 shadow py-2';
  }

  return (
    <nav className={navbarClasses}>
      <div className="container">
        <Link className="navbar-brand" to="/" style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>
          <span className={isHomePage && !scrolled ? 'text-dark' : 'text-white'}>Next</span>
          <span style={{ color: '#FFDD67' }}>Ride</span>
        </Link>

        <button
          className="navbar-toggler"
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          style={{ border: 'none' }}
        >
          <span className={isHomePage && !scrolled ? 'text-dark' : 'text-white'}>
            {menuOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
          </span>
        </button>

        <div className={`collapse navbar-collapse ${menuOpen ? 'show' : ''}`} id="navbarContent">
          <ul className="navbar-nav me-auto mb-2 mb-lg-0 ms-lg-4">
            <li className="nav-item mx-2">
              <Link
                className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
                to="/"
                style={{
                  color: location.pathname === '/' 
                    ? '#FFDD67' 
                    : (isHomePage && !scrolled ? '#444444' : 'white'),
                  fontWeight: '600',
                  transition: 'all 0.3s ease'
                }}
              >
                Accueil
              </Link>
            </li>
            <li className="nav-item mx-2">
              <Link
                className={`nav-link ${location.pathname === '/search' ? 'active' : ''}`}
                to="/search"
                style={{
                  color: location.pathname === '/search' 
                    ? '#FFDD67' 
                    : (isHomePage && !scrolled ? '#444444' : 'white'),
                  fontWeight: '600',
                  transition: 'all 0.3s ease'
                }}
              >
                Browsing
              </Link>
            </li>
            <li className="nav-item mx-2">
              <Link
                className={`nav-link ${location.pathname === '/predict' ? 'active' : ''}`}
                to="/predict"
                style={{
                  color: location.pathname === '/predict' 
                    ? '#FFDD67' 
                    : (isHomePage && !scrolled ? '#444444' : 'white'),
                  fontWeight: '600',
                  transition: 'all 0.3s ease'
                }}
              >
                Prédiction
              </Link>
            </li>
            <li className="nav-item mx-2">
              <Link
                className={`nav-link ${location.pathname === '/addcar' ? 'active' : ''}`}
                to="/addcar"
                style={{
                  color: location.pathname === '/addcar' 
                    ? '#FFDD67' 
                    : (isHomePage && !scrolled ? '#444444' : 'white'),
                  fontWeight: '600',
                  transition: 'all 0.3s ease'
                }}
              >
                Ajouter Voiture
              </Link>
            </li>
            <li className="nav-item mx-2">
              <Link
                className={`nav-link ${location.pathname === '/visualization' ? 'active' : ''}`}
                to="/visualization"
                style={{
                  color: location.pathname === '/visualization' 
                    ? '#FFDD67' 
                    : (isHomePage && !scrolled ? '#FF6F61' : '#FF6F61'),
                  fontWeight: '700',
                  transition: 'all 0.3s ease',
                  textShadow: isHomePage && !scrolled ? 'none' : '0 0 5px rgba(255, 111, 97, 0.5)',
                }}
                onMouseOver={(e) => (e.currentTarget.style.color = '#FF3D2E')}
                onMouseOut={(e) => (e.currentTarget.style.color = location.pathname === '/visualization' ? '#FFDD67' : '#FF6F61')}
              >
                Visualisation
              </Link>
            </li>
          </ul>

          <div className="d-flex align-items-center">
            {user ? (
              <div className="d-flex align-items-center">
                <Link
                  to="/profile"
                  className={`btn btn-link ${isHomePage && !scrolled ? 'text-dark' : 'text-white'} me-3`}
                  style={{ transition: 'all 0.3s ease' }}
                >
                  <FaUser size={20} />
                </Link>
                <Link
                  to="/profile?favorites=true"
                  className={`btn btn-link ${isHomePage && !scrolled ? 'text-dark' : 'text-white'} me-3`}
                  style={{ transition: 'all 0.3s ease' }}
                >
                  <FaHeart size={20} />
                </Link>
                <button
                  className={`btn btn-link ${isHomePage && !scrolled ? 'text-dark' : 'text-white'}`}
                  onClick={logout}
                  style={{ transition: 'all 0.3s ease' }}
                >
                  <FaSignOutAlt size={20} />
                </button>
              </div>
            ) : (
              <div className="d-flex flex-column flex-lg-row">
                <Link
                  to="/login"
                  className={`btn btn-link ${isHomePage && !scrolled ? 'text-dark' : 'text-white'} text-decoration-none mb-2 mb-lg-0 me-lg-3`}
                  style={{
                    fontWeight: '600',
                    transition: 'all 0.3s ease'
                  }}
                >
                  Se Connecter
                </Link>
                <Link
                  to="/signup"
                  className="btn rounded-pill"
                  style={{
                    backgroundColor: '#e67e22',
                    color: 'white',
                    fontWeight: '600',
                    paddingLeft: '1.5rem',
                    paddingRight: '1.5rem',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#d35400')}
                  onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#e67e22')}
                >
                  S'Inscrire
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;