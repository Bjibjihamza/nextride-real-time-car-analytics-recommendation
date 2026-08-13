import React from 'react';

const Spinner = ({ label = 'Loading...', minHeight = '50vh', centered = true }) => {
  const content = (
    <div className="d-flex flex-column align-items-center gap-3">
      <div className="spinner-border" role="status">
        <span className="visually-hidden">Loading...</span>
      </div>
      {label && <span style={{ color: 'var(--nr-text-muted)' }}>{label}</span>}
    </div>
  );

  if (!centered) return content;

  return (
    <div className="d-flex justify-content-center align-items-center" style={{ minHeight }}>
      {content}
    </div>
  );
};

export default Spinner;
