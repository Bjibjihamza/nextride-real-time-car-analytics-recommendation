import React from 'react';
import { FaFacebook, FaLinkedin, FaYoutube, FaInstagram } from 'react-icons/fa';

function Footer() {
  return (
    <footer className="mt-5">
      {/* Top border line */}
      <hr className="my-4" />
      
      <div className="container py-5">
        <div className="row justify-content-between">
          {/* Logo and social icons - Left column */}
          <div className="col-lg-3 mb-4 mb-lg-0">
            <h2 className="fw-bold text-secondary mb-4" style={{ fontFamily: 'Impact, sans-serif' }}>NextRide</h2>
            
            <div className="d-flex gap-3">
              <a href="#" className="text-secondary fs-5 social-icon">
                <FaFacebook />
              </a>
              <a href="#" className="text-secondary fs-5 social-icon">
                <FaLinkedin />
              </a>
              <a href="#" className="text-secondary fs-5 social-icon">
                <FaYoutube />
              </a>
              <a href="#" className="text-secondary fs-5 social-icon">
                <FaInstagram />
              </a>
            </div>
          </div>
          
          {/* Navigation links - 3 columns */}
          <div className="col-lg-8">
            <div className="row">
              {/* First column of links */}
              <div className="col-md-4 mb-4 mb-md-0">
                <h5 className="fw-bold mb-3">Topic</h5>
                <ul className="list-unstyled">
                  <li className="mb-2">
                    <a href="#" className="text-decoration-none text-dark">Page</a>
                  </li>
                  <li className="mb-2">
                    <a href="#" className="text-decoration-none text-dark">Page</a>
                  </li>
                  <li className="mb-2">
                    <a href="#" className="text-decoration-none text-dark">Page</a>
                  </li>
                </ul>
              </div>
              
              {/* Second column of links */}
              <div className="col-md-4 mb-4 mb-md-0">
                <h5 className="fw-bold mb-3">Topic</h5>
                <ul className="list-unstyled">
                  <li className="mb-2">
                    <a href="#" className="text-decoration-none text-dark">Page</a>
                  </li>
                  <li className="mb-2">
                    <a href="#" className="text-decoration-none text-dark">Page</a>
                  </li>
                  <li className="mb-2">
                    <a href="#" className="text-decoration-none text-dark">Page</a>
                  </li>
                </ul>
              </div>
              
              {/* Third column of links */}
              <div className="col-md-4">
                <h5 className="fw-bold mb-3">Topic</h5>
                <ul className="list-unstyled">
                  <li className="mb-2">
                    <a href="#" className="text-decoration-none text-dark">Page</a>
                  </li>
                  <li className="mb-2">
                    <a href="#" className="text-decoration-none text-dark">Page</a>
                  </li>
                  <li className="mb-2">
                    <a href="#" className="text-decoration-none text-dark">Page</a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Copyright bar */}
      <div className="bg-dark py-3">
        <div className="container">
          <div className="row justify-content-between align-items-center">
            <div className="col-md-6">
              <p className="text-white mb-0 small">
                © {new Date().getFullYear()} NextRide. All rights reserved.
              </p>
            </div>
            <div className="col-md-6 text-md-end mt-2 mt-md-0">
              <a href="#" className="text-white small me-3 text-decoration-none">
                Privacy Policy
              </a>
              <a href="#" className="text-white small me-3 text-decoration-none">
                Terms of Service
              </a>
              <a href="#" className="text-white small text-decoration-none">
                Sitemap
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;