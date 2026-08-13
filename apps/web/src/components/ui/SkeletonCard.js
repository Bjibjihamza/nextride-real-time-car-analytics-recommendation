import React from 'react';

const SkeletonCard = () => (
  <div className="col">
    <div className="surface p-0 overflow-hidden" style={{ borderRadius: 18 }}>
      <div className="skeleton" style={{ paddingTop: '68%' }} />
      <div className="p-3">
        <div className="skeleton mb-2" style={{ height: 16, width: '70%' }} />
        <div className="skeleton" style={{ height: 14, width: '45%' }} />
      </div>
    </div>
  </div>
);

export const SkeletonGrid = ({ count = 8 }) => (
  <div className="row row-cols-1 row-cols-md-2 row-cols-lg-4 g-4">
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonCard key={i} />
    ))}
  </div>
);

export default SkeletonCard;
