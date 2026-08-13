import React from 'react';

const SectionHeader = ({ eyebrow, title, subtitle, action, align = 'left', className = '' }) => {
  const alignClass = align === 'center' ? 'text-center' : '';

  return (
    <div className={`d-flex flex-wrap justify-content-between align-items-end gap-3 mb-5 ${className}`}>
      <div className={align === 'center' ? 'w-100' : ''}>
        {eyebrow && (
          <span className={`section-eyebrow ${align === 'center' ? 'justify-content-center' : ''}`}>
            {eyebrow}
          </span>
        )}
        <h2 className="section-title display-6 mb-2">{title}</h2>
        {subtitle && (
          <p className="mb-0" style={{ color: 'var(--nr-text-muted)', maxWidth: 560 }}>
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
};

export default SectionHeader;
