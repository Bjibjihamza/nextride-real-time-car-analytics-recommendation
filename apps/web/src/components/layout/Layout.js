import React from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import { useLocation } from 'react-router-dom';

const Layout = ({ children }) => {
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  return (
    <div className="min-vh-100 d-flex flex-column" style={{ background: 'var(--nr-bg)' }}>
      <Navbar />
      <main className={isHomePage ? 'flex-grow-1' : 'flex-grow-1 page-content'}>{children}</main>
      <Footer />
    </div>
  );
};

export default Layout;
