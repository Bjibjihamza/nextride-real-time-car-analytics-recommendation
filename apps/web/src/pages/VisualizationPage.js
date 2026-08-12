import React from 'react';
import BrandDistribution from '../components/BrandDistribution';
import CarBubbleChart from '../components/CarBubbleChart';

// Dashboard page to display multiple visualizations
const Visualizations = () => {
  return (
    <div className="container-fluid py-5">
      <h1 className="text-center fw-bold mb-5">Car Data Visualizations</h1>
      <div className="row">
        <div className="col-12 mb-5">
          <BrandDistribution />
        </div>
        <div className="col-12">
          <CarBubbleChart />
        </div>
      </div>
    </div>
  );
};

export default Visualizations;