import React from 'react';
import icon4 from "../assets/images/icon-4.png";
import { Link } from 'react-router-dom';

const Explore = () => {
  return (
    <div className="container py-5">
      <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
        <img src={icon4} style={{ margin: 'auto', marginBottom: '30px' }} />
      </div>

      <h1 className="text-center fw-bold mb-5">Let's explore together!</h1>

      <div className="row justify-content-center g-5">
        <div className="col-md-4">
          <div className="p-5 pb-4 h-100 text-center shadow-sm" style={{ borderRadius: '50px', backgroundColor: "rgba(217,217,217,0.1)" }}>
            <h2 className="fs-3 fw-bold mb-3" style={{ color: "rgba(0, 0, 0, .7)" }}>Get Your Car's Market Price!</h2>

            <p className="text-muted mb-4" style={{ lineHeight: "25px", opacity: '.7', fontWeight: '500', padding: "10px" }}>
              Enter the details of your car to get an accurate price estimate based on
              current market trends.
            </p>

            <button className="btn btn-warning text-white fw-bold w-100 rounded-pill fs-5l" style={{ fontSize: "20px", padding: "15px" }}>
              <Link className="nav-link" to="/predict">Predict Price</Link>
            </button>
          </div>
        </div>

        <div className="col-md-4">
          <div className="p-5 pb-4 h-100 text-center shadow-sm d-flex align-items-center justify-content-between flex-column" style={{ borderRadius: '50px', backgroundColor: "rgba(217,217,217,0.1)" }}>
            <h2 className="fs-3 fw-bold mb-3" style={{ color: "rgba(0, 0, 0, .7)" }}>Explore Personalized Car Recommendations</h2>

            <p className="text-muted mb-4" style={{ lineHeight: "25px", opacity: '.7', fontWeight: '500', padding: "10px" }}>
              Discover cars that match your preferences and budget.
            </p>

            <button className="btn btn-warning text-white fw-bold w-100 rounded-pill fs-5l" style={{ fontSize: "20px", padding: "15px", backgroundColor: '#BC7328', border: 'none' }}>
              <Link className="nav-link" to="/profile?recommendations=true">See Recommended Cars</Link>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Explore;