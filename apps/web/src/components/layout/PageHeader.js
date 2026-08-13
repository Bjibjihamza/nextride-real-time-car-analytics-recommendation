import React from 'react';
import { Link } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa6';

const PageHeader = ({ eyebrow, title, subtitle, backTo, backLabel = 'Back', actions }) => (
  <div className="d-flex flex-wrap align-items-center gap-3 mb-4">
    {backTo && (
      <Link to={backTo} className="btn btn-ghost d-inline-flex align-items-center gap-2 flex-shrink-0">
        <FaArrowLeft /> {backLabel}
      </Link>
    )}
    <div className="flex-grow-1">
      {eyebrow && <span className="section-eyebrow">{eyebrow}</span>}
      <h1 className="section-title display-6 mb-0">{title}</h1>
      {subtitle && (
        <p className="mb-0 mt-1" style={{ color: 'var(--nr-text-muted)' }}>
          {subtitle}
        </p>
      )}
    </div>
    {actions && <div className="d-flex gap-2 flex-shrink-0">{actions}</div>}
  </div>
);

export default PageHeader;
