import React from 'react';
import compared1 from '../assets/images/compared_1.png';
import compared2 from '../assets/images/compared_2.png';
import compared3 from '../assets/images/compared_3.png';

function CompareSection() {
  // Sample comparison data
  const comparisons = [
    {
      id: 1,
      name: "2024 Tesla Model Y vs 2024 Ford Mustang Mach-E",
      image: compared1,
    },
    {
      id: 2,
      name: "2024 Honda Accord vs 2024 Toyota Camry",
      image: compared2,
    },
    {
      id: 3,
      name: "2024 Honda CR-V vs 2024 Toyota RAV4",
      image: compared3,
    }
  ];

  return (
    <section className="container py-5">
      <h1 className="fw-bold mb-4">Compare top rated vehicles</h1>
      
      <div className="row row-cols-1 row-cols-md-3 g-4">
        {comparisons.map((comparison) => (
          <div key={comparison.id} className="col"  >
            <div className="card h-100 border-0 shadow-sm rounded-4 p-3"  >
              <div className="text-center mb-3">
                <img 
                  src={comparison.image} 
                  alt={comparison.name}
                  className="img-fluid mb-2" 
                  style={{ width: '100%', objectFit: 'contain' }}
                />
              </div>
              
              <div className="card-body p-0 text-center">
                <p className="card-text"  style={{    fontWeight: "600",
    fontSize: "16px",
    color: "#212529cc"
}} >
                  {comparison.name}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default CompareSection;