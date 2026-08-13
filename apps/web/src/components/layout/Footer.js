import React from 'react';
import { Link } from 'react-router-dom';
import { FaFacebookF, FaLinkedinIn, FaInstagram, FaYoutube, FaCar } from 'react-icons/fa6';

function Footer() {
  const columns = [
    {
      title: 'Marketplace',
      links: [
        { label: 'Browse cars', to: '/search' },
        { label: 'Price prediction', to: '/predict' },
        { label: 'Add your car', to: '/addcar' },
        { label: 'Visualizations', to: '/visualization' },
      ],
    },
    {
      title: 'Account',
      links: [
        { label: 'Sign in', to: '/login' },
        { label: 'Create account', to: '/signup' },
        { label: 'My profile', to: '/profile' },
        { label: 'Saved cars', to: '/profile?favorites=true' },
      ],
    },
    {
      title: 'Company',
      links: [
        { label: 'About', to: '/' },
        { label: 'How it works', to: '/predict' },
        { label: 'Recommendations', to: '/profile?recommendations=true' },
        { label: 'Contact', to: '/' },
      ],
    },
  ];

  const socials = [
    { icon: <FaFacebookF />, label: 'Facebook' },
    { icon: <FaLinkedinIn />, label: 'LinkedIn' },
    { icon: <FaInstagram />, label: 'Instagram' },
    { icon: <FaYoutube />, label: 'YouTube' },
  ];

  return (
    <footer className="mt-5" style={{ background: 'var(--nr-bg-soft)', borderTop: '1px solid var(--nr-border)' }}>
      <div className="container py-5">
        <div className="row justify-content-between g-4">
          <div className="col-lg-3 mb-4 mb-lg-0">
            <Link to="/" className="d-inline-flex align-items-center gap-2 text-decoration-none mb-4" style={{ fontWeight: 800, fontSize: '1.4rem' }}>
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
            <p className="mb-4" style={{ color: 'var(--nr-text-muted)', maxWidth: 280 }}>
              Real-time car analytics, price prediction and personalized recommendations for the Moroccan market.
            </p>
            <div className="d-flex gap-2">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href="#"
                  aria-label={s.label}
                  className="btn btn-ghost rounded-circle p-2"
                  style={{ width: 38, height: 38, fontSize: 14 }}
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          <div className="col-lg-8">
            <div className="row">
              {columns.map((col) => (
                <div className="col-md-4 mb-4 mb-md-0" key={col.title}>
                  <h6 className="fw-bold mb-3" style={{ color: 'var(--nr-text)' }}>{col.title}</h6>
                  <ul className="list-unstyled mb-0">
                    {col.links.map((link) => (
                      <li className="mb-2" key={link.label}>
                        <Link to={link.to} className="footer-link" style={{ fontSize: '0.92rem' }}>
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="py-3" style={{ background: 'var(--nr-bg)', borderTop: '1px solid var(--nr-border)' }}>
        <div className="container">
          <div className="row justify-content-between align-items-center">
            <div className="col-md-6">
              <p className="mb-0" style={{ color: 'var(--nr-text-faint)', fontSize: '0.85rem' }}>
                © {new Date().getFullYear()} NextRide. All rights reserved.
              </p>
            </div>
            <div className="col-md-6 text-md-end mt-2 mt-md-0">
              <a href="#" className="footer-link me-3" style={{ fontSize: '0.85rem' }}>Privacy Policy</a>
              <a href="#" className="footer-link me-3" style={{ fontSize: '0.85rem' }}>Terms of Service</a>
              <a href="#" className="footer-link" style={{ fontSize: '0.85rem' }}>Sitemap</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
