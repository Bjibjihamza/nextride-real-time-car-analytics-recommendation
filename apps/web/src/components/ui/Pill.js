import React from 'react';

const Pill = ({ children, icon, className = '' }) => (
  <span className={`pill ${className}`}>
    {icon && <span style={{ display: 'inline-flex', color: 'var(--nr-accent)' }}>{icon}</span>}
    {children}
  </span>
);

export default Pill;
