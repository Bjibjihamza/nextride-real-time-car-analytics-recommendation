import React from 'react';

const EmptyState = ({ icon, title, description, action, className = '' }) => (
  <div className={`text-center py-5 surface ${className}`} style={{ borderRadius: 20 }}>
    {icon && (
      <div className="mb-3" style={{ color: 'var(--nr-text-faint)' }}>
        {icon}
      </div>
    )}
    <h5 className="fw-bold mb-2">{title}</h5>
    {description && (
      <p className="mb-0" style={{ color: 'var(--nr-text-muted)' }}>
        {description}
      </p>
    )}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export default EmptyState;
