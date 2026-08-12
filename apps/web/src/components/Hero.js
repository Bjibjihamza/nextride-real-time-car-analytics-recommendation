import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import BgworkflowImage from '../assets/images/bg.jpg';
import car from '../assets/images/bg2.png';
import { CiSearch } from 'react-icons/ci';
import icon1 from '../assets/images/icon-1.png';
import icon2 from '../assets/images/icon-2.png';
import icon3 from '../assets/images/icon-3.png';
import bg from '../assets/images/bg.jpg';
import { FaUser, FaHeart, FaBars, FaTimes, FaSignOutAlt } from 'react-icons/fa';

function Hero({ isAuthenticated, user, handleLogout }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const navigate = useNavigate();

  // Track window size
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle scroll event to change navbar appearance
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Handle clicking outside menu to close it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuOpen && !event.target.closest('.navbar-collapse')) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchTerm)}`);
    }
  };

  const isSmallScreen = windowWidth < 1000;

  const heroStyle = {
    backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url(${bg})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    height: isSmallScreen ? '85vh' : '90vh',
    position: 'relative',
    overflow: 'hidden'
  };

  const semicircleStyle = {
    position: 'absolute',
    width: '70vw',
    height: '120vh',
    right: '-20vw',
    top: '50%',
    transform: 'translateY(-50%)',
    borderRadius: '50%',
    backgroundColor: 'rgba(255, 234, 145, 0.1)',
    pointerEvents: 'none',
    zIndex: 1,
    display: isSmallScreen ? 'none' : 'block'
  };

  const carStyle = {
    position: 'absolute',
    bottom: '-12vh',
    right: '0',
    zIndex: '10',
    width: '55vw',
    display: isSmallScreen ? 'none' : 'block'
  };

  // Determine navbar classes based on scroll position
  const navbarClasses = scrolled 
    ? 'navbar navbar-expand-lg fixed-top navbar-dark bg-dark bg-opacity-75 shadow py-2' 
    : 'navbar navbar-expand-lg fixed-top navbar-light bg-transparent py-3';

  return (
    <section className="container-fluid p-0 m-0" style={{ height: '100vh' }}>
      {/* Custom Navbar directly in Hero component for homepage only */}
      <nav className={navbarClasses}>
        <div className="container">
          <Link className="navbar-brand" to="/" style={{ 
            fontSize: isSmallScreen ? '1.5rem' : '1.75rem', 
            fontWeight: 'bold' 
          }}>
            <span className={scrolled ? 'text-white' : 'text-white'}>Next</span>
            <span style={{ color: '#FFDD67' }}>Ride</span>
          </Link>

          <button
            className="navbar-toggler"
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            style={{ border: 'none' }}
          >
            <span className="text-white">
              {menuOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
            </span>
          </button>

          <div className={`collapse navbar-collapse ${menuOpen ? 'show' : ''}`} id="navbarContent">
            <ul className="navbar-nav me-auto mb-2 mb-lg-0 ms-lg-4">
              <li className="nav-item mx-2">
                <Link
                  className="nav-link active"
                  to="/"
                  style={{
                    color: '#FFDD67',
                    fontWeight: '600',
                    transition: 'all 0.3s ease'
                  }}
                >
                  Accueil
                </Link>
              </li>
              <li className="nav-item mx-2">
                <Link
                  className="nav-link"
                  to="/search"
                  style={{
                    color: 'white',
                    fontWeight: '600',
                    transition: 'all 0.3s ease'
                  }}
                >
                  Browsing
                </Link>
              </li>

              
              <li className="nav-item mx-2">
                <Link
                  className="nav-link"
                  to="/predict"
                  style={{
                    color: 'white',
                    fontWeight: '600',
                    transition: 'all 0.3s ease'
                  }}
                >
                  Prédiction
                </Link>
              </li>

              <li className="nav-item mx-2">
              <Link
                  className="nav-link"
                  to="/addcar"
                  style={{
                    color: 'white',
                    fontWeight: '600',
                    transition: 'all 0.3s ease'
                  }}
                >
                Ajouter Voiture
              </Link>
            </li>
              <li className="nav-item mx-2">
                <Link
                  className="nav-link"
                  to="/visualization"
                  style={{
                    color: '#FF6F61',
                    fontWeight: '700',
                    transition: 'all 0.3s ease',
                    textShadow: '0 0 5px rgba(255, 111, 97, 0.5)',
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.color = '#FF3D2E')}
                  onMouseOut={(e) => (e.currentTarget.style.color = '#FF6F61')}
                >
                  Visualisation
                </Link>
              </li>
            </ul>

            <div className="d-flex align-items-center">
              {isAuthenticated ? (
                <div className="d-flex align-items-center">
                  <Link
                    to="/profile"
                    className="btn btn-link text-white me-3"
                    style={{ transition: 'all 0.3s ease' }}
                  >
                    <FaUser size={20} />
                  </Link>
                  <Link
                    to="/profile?favorites=true"
                    className="btn btn-link text-white me-3"
                    style={{ transition: 'all 0.3s ease' }}
                  >
                    <FaHeart size={20} />
                  </Link>
                  <button
                    className="btn btn-link text-white"
                    onClick={handleLogout}
                    style={{ transition: 'all 0.3s ease' }}
                  >
                    <FaSignOutAlt size={20} />
                  </button>
                </div>
              ) : (
                <div className="d-flex flex-column flex-lg-row">
                  <Link
                    to="/login"
                    className="btn btn-link text-white text-decoration-none mb-2 mb-lg-0 me-lg-3"
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

      <section style={heroStyle}>
        <div style={semicircleStyle}></div>
        
        <div className="row h-100 position-relative" style={{ zIndex: 2 }}>
          <div className={`col-md-${isSmallScreen ? '12' : '6'} d-flex flex-column justify-content-center ${isSmallScreen ? 'text-center px-4' : 'ps-4 ps-md-5'}`}>
            <h1 
              className="text-white mb-4" 
              style={{ 
                fontSize: isSmallScreen ? '2.5rem' : '80px', 
                fontWeight: '900',
                width: isSmallScreen ? '100%' : '75%'
              }}
            >
              FIND YOUR PERFECT CAR!
            </h1>
            <p
              className="lead"
              style={{
                color: '#FFDD67',
                fontWeight: '700',
                width: isSmallScreen ? '100%' : '30vw',
                marginBottom: isSmallScreen ? '30px' : '40px'
              }}
            >
              Browse and get personalized car recommendations based on your preferences.
            </p>
            <div
              className="search-bar"
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: isSmallScreen ? 'center' : 'flex-start'
              }}
            >
              <form 
                onSubmit={handleSearchSubmit} 
                className="d-flex position-relative mb-4" 
                style={{ width: isSmallScreen ? '90%' : '75%' }}
              >
                <input
                  type="text"
                  className="form-control form-control-lg rounded-pill py-3 ps-4 pe-5"
                  placeholder={isSmallScreen ? "Search cars..." : "Search by brand, model, or keywords..."}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  aria-label="Search cars"
                />
                <button
                  className="btn btn-warning rounded-circle position-absolute end-0 top-50 translate-middle-y me-2"
                  style={{ width: isSmallScreen ? '45px' : '50px', height: isSmallScreen ? '45px' : '50px' }}
                  type="submit"
                >
                  <CiSearch size={isSmallScreen ? 20 : 24} />
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>
      
      {!isSmallScreen && (
        <>
          <div className="icons">
            <img src={icon1} style={{ position: 'absolute', top: '25vh', left: '49vw' }} alt="Icon 1" />
            <img src={icon2} style={{ position: 'absolute', top: '40vh', left: '53vw' }} alt="Icon 2" />
            <img src={icon3} style={{ position: 'absolute', top: '55vh', left: '49vw' }} alt="Icon 3" />
          </div>
          <img src={car} alt="Car" style={carStyle} />
        </>
      )}
    </section>
  );
}

export default Hero;