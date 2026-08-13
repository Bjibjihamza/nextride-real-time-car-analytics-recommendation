import React from 'react';

const variants = {
  danger: 'alert-danger',
  success: 'alert-success',
  warning: 'alert-warning',
  info: 'alert-info',
};

const AlertBanner = ({ variant = 'info', children, className = '' }) => (
  <div className={`alert ${variants[variant] || variants.info} d-flex align-items-center ${className}`} role="alert">
    {children}
  </div>
);

export default AlertBanner;
