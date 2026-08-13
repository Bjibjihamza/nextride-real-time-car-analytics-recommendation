import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CiSearch } from 'react-icons/ci';
import { FaGaugeHigh, FaSackDollar, FaArrowRight } from 'react-icons/fa6';
import bg from '../../assets/images/bg.jpg';
import car from '../../assets/images/bg2.png';

function Hero() {
  const [searchTerm, setSearchTerm] = useState('');
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const navigate = useNavigate();

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchTerm)}`);
    }
  };

  const isSmallScreen = windowWidth < 992;

  return (
    <section
      className="position-relative overflow-hidden d-flex align-items-center"
      style={{
        minHeight: '100vh',
        backgroundImage: `linear-gradient(115deg, rgba(6, 10, 19, 0.96) 0%, rgba(6, 10, 19, 0.82) 45%, rgba(6, 10, 19, 0.55) 100%), url(${bg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div
        className="position-absolute rounded-circle"
        style={{
          width: '52vw',
          height: '52vw',
          right: '-14vw',
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'radial-gradient(circle, rgba(245,179,1,0.16) 0%, rgba(245,179,1,0) 70%)',
          pointerEvents: 'none',
        }}
      />
      <div
        className="position-absolute rounded-circle"
        style={{
          width: '20vw',
          height: '20vw',
          left: '-6vw',
          bottom: '-6vw',
          background: 'radial-gradient(circle, rgba(56,189,248,0.12) 0%, rgba(56,189,248,0) 70%)',
          pointerEvents: 'none',
        }}
      />

      {!isSmallScreen && (
        <img
          src={car}
          alt="Featured car"
          className="position-absolute"
          style={{
            bottom: '-4vh',
            right: '-2vw',
            width: '54vw',
            zIndex: 2,
            filter: 'drop-shadow(0 30px 60px rgba(0,0,0,0.5))',
            pointerEvents: 'none',
          }}
        />
      )}

      <div className="container position-relative" style={{ zIndex: 3 }}>
        <div className="row">
          <div className={isSmallScreen ? 'col-12 text-center px-3' : 'col-lg-7 col-md-9'}>
            <span className="section-eyebrow nr-fade-up">Market intelligence · Machine Learning</span>

            <h1
              className={`h-display text-white nr-fade-up nr-delay-1 ${isSmallScreen ? 'display-4' : 'display-3'}`}
              style={{ maxWidth: '16ch', marginInline: isSmallScreen ? 'auto' : 0 }}
            >
              Find your perfect car, <span className="text-gradient">priced right</span>.
            </h1>

            <p
              className="nr-fade-up nr-delay-2"
              style={{
                color: 'var(--nr-text-muted)',
                fontSize: '1.15rem',
                maxWidth: '48ch',
                marginInline: isSmallScreen ? 'auto' : 0,
                marginTop: 20,
              }}
            >
              Browse thousands of listings, compare vehicles, and get personalized
              recommendations with real-time price predictions powered by AI.
            </p>

            <form
              onSubmit={handleSearchSubmit}
              className={`nr-fade-up nr-delay-3 d-flex position-relative ${isSmallScreen ? 'mx-auto' : ''}`}
              style={{ maxWidth: 560, marginTop: 34 }}
            >
              <input
                type="text"
                className="form-control form-control-lg rounded-pill ps-4 pe-5"
                style={{ paddingTop: 14, paddingBottom: 14, fontSize: '1rem', borderRadius: 999 }}
                placeholder="Search by brand, model, or keywords..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label="Search cars"
              />
              <button
                className="btn position-absolute end-0 top-50 translate-middle-y rounded-circle me-2 nr-pulse-glow"
                style={{ width: 46, height: 46, background: 'var(--nr-grad-accent)', color: '#101014' }}
                type="submit"
                aria-label="Search"
              >
                <CiSearch size={22} />
              </button>
            </form>

            {!isSmallScreen && (
              <div className="d-flex gap-4 mt-5 pt-2">
                <div className="d-flex align-items-center gap-3">
                  <span
                    className="d-inline-flex align-items-center justify-content-center rounded-circle"
                    style={{ width: 44, height: 44, background: 'var(--nr-surface-2)', border: '1px solid var(--nr-border)' }}
                  >
                    <FaGaugeHigh style={{ color: 'var(--nr-accent)' }} />
                  </span>
                  <div>
                    <div className="fw-bold" style={{ color: 'var(--nr-text)' }}>60k+ listings</div>
                    <small style={{ color: 'var(--nr-text-faint)' }}>Live from Avito & Moteur.ma</small>
                  </div>
                </div>
                <div className="d-flex align-items-center gap-3">
                  <span
                    className="d-inline-flex align-items-center justify-content-center rounded-circle"
                    style={{ width: 44, height: 44, background: 'var(--nr-surface-2)', border: '1px solid var(--nr-border)' }}
                  >
                    <FaSackDollar style={{ color: 'var(--nr-accent)' }} />
                  </span>
                  <div>
                    <div className="fw-bold" style={{ color: 'var(--nr-text)' }}>AI price predictions</div>
                    <small style={{ color: 'var(--nr-text-faint)' }}>Neural network powered</small>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-4 d-flex align-items-center gap-3">
              <span style={{ color: 'var(--nr-text-faint)' }}>Ready to predict your car's value?</span>
              <a
                href="/predict"
                className="d-inline-flex align-items-center gap-2 text-decoration-none fw-semibold"
                style={{ color: 'var(--nr-accent)' }}
              >
                Try Price Prediction <FaArrowRight size={13} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Hero;
