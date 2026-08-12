import React from 'react';
import carImage from '../assets/images/carannonceimage.png'
import hyundaiLogo from '../assets/images/carannonceimage.png'

function PromoSection() {
  return (
    <section className="container py-5">
      <hr className="my-4" />
      
      <div className="row g-4">
        {/* Left yellow card */}
        <div className="col-12 col-lg-8">
          <div className="card border-0 shadow-sm rounded-4 h-100" style={{ backgroundColor: '#FFE992' }}>
            <div className="card-body p-4 p-lg-5 d-flex flex-column flex-lg-row align-items-center">
              <div className="me-lg-5 mb-4 mb-lg-0">
                <h2 className="fw-bold fs-1 mb-2">Ready for the next ride?</h2>
                <h3 className="fw-bold fs-1 mb-4">Explore the latest vehicles</h3>
                
                <ul className="list-unstyled mb-4">
                  <li className="mb-2">
                    <span className="bullet me-2">•</span> View latest models
                  </li>
                  <li className="mb-2">
                    <span className="bullet me-2">•</span> Compare vehicles side-by-side
                  </li>
                  <li className="mb-2">
                    <span className="bullet me-2">•</span> Discover award winning cars
                  </li>
                </ul>
                
                <div className="d-flex flex-wrap gap-3">
                  <button className="btn btn-dark rounded-pill px-4 py-2">
                    Research New Cars
                  </button>
                  <button className="btn btn-outline-dark rounded-pill px-4 py-2">
                    Compare Cars
                  </button>
                </div>
              </div>
              
              <div className="position-relative">
                <div className="position-absolute" style={{ 
                  backgroundColor: '#E6CA7B', 
                  width: '200px', 
                  height: '200px', 
                  borderRadius: '50%',
                  right: '30px',
                  top: '10px',
                  zIndex: 0
                }}></div>
                <img 
                  src={carImage} 
                  alt="New vehicle" 
                  className="img-fluid position-relative" 
                  style={{ zIndex: 1, maxWidth: '400px' }}
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Right featured brand card */}
        <div className="col-12 col-lg-4">
          <div className="card border-0 shadow-sm rounded-4 h-100 bg-light">
            <div className="card-body p-4 p-lg-5 d-flex flex-column align-items-center">
              <p className="text-muted mb-1">Featured storefront</p>
              <h3 className="display-5 fw-bold mb-3">Hyundai</h3>
              
              <img 
                src={hyundaiLogo} 
                alt="Hyundai logo" 
                className="img-fluid mb-4" 
                style={{ maxWidth: '150px' }}
              />
              
              <p className="text-center mb-4">
                Hyundai is making a safer road for us all. 
                Their SUVs and EVs have been recognized 
                throughout the industry for their award-
                winning safety.
              </p>
              
              <button className="btn btn-outline-dark rounded-pill px-4 py-2 mt-auto">
                About This Brand
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <hr className="my-4" />
    </section>
  );
}

export default PromoSection;