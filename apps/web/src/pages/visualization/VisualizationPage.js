import React from 'react';
import BrandDistribution from '../../components/charts/BrandDistribution';
import CarBubbleChart from '../../components/charts/CarBubbleChart';

const Visualizations = () => {
  return (
    <div className="container py-4">
      <div className="mb-5">
        <span className="section-eyebrow">Data dashboard</span>
        <h1 className="section-title display-5 mb-2">Car Data Visualizations</h1>
        <p className="mb-0" style={{ color: 'var(--nr-text-muted)', maxWidth: 640 }}>
          Explore live market analytics: brand distribution and price dynamics across thousands of Moroccan listings.
        </p>
      </div>

      <div className="d-flex flex-column gap-5">
        <BrandDistribution />
        <CarBubbleChart />
      </div>
    </div>
  );
};

export default Visualizations;
