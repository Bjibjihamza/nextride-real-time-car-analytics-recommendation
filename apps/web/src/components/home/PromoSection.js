import React from 'react';
import { FaCheck } from 'react-icons/fa6';
import carImage from '../../assets/images/carannonceimage.png';

function PromoSection() {
  const bullets = [
    'View latest models',
    'Compare vehicles side-by-side',
    'Discover award-winning cars',
  ];

  return (
    <section className="container py-5 my-4">
      <div className="row g-4 align-items-stretch">
        <div
          className="col-12 col-lg-8 position-relative overflow-hidden"
          style={{
            borderRadius: 28,
            background: 'linear-gradient(130deg, rgba(245,179,1,0.16), var(--nr-surface) 55%)',
            border: '1px solid rgba(245,179,1,0.3)',
          }}
        >
          <div className="d-flex flex-column flex-lg-row align-items-center h-100 p-4 p-lg-5">
            <div className="flex-grow-1">
              <span className="section-eyebrow">Ready for the next ride?</span>
              <h2 className="section-title display-5 mb-3">
                Explore the <span className="text-gradient">latest vehicles</span>
              </h2>

              <ul className="list-unstyled mb-4">
                {bullets.map((item) => (
                  <li key={item} className="mb-2 d-flex align-items-center gap-3" style={{ color: 'var(--nr-text-muted)' }}>
                    <span
                      className="d-inline-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                      style={{ width: 24, height: 24, background: 'var(--nr-grad-accent)', color: '#101014' }}
                    >
                      <FaCheck size={12} />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>

              <div className="d-flex flex-wrap gap-3">
                <a href="/search" className="btn btn-accent rounded-pill px-4 py-2">Research New Cars</a>
                <a href="/search" className="btn btn-ghost rounded-pill px-4 py-2">Compare Cars</a>
              </div>
            </div>

            <div className="position-relative mt-4 mt-lg-0 ms-lg-5">
              <div
                className="position-absolute"
                style={{
                  background: 'rgba(245,179,1,0.2)',
                  width: 230,
                  height: 230,
                  borderRadius: '50%',
                  right: 20,
                  top: 10,
                  filter: 'blur(2px)',
                }}
              />
              <img
                src={carImage}
                alt="New vehicle"
                className="img-fluid position-relative"
                style={{ zIndex: 1, maxWidth: 380, borderRadius: 18 }}
              />
            </div>
          </div>
        </div>

        <div
          className="col-12 col-lg-4 d-flex flex-column justify-content-between p-4 p-lg-5"
          style={{
            borderRadius: 28,
            background: 'var(--nr-surface-2)',
            border: '1px solid var(--nr-border)',
          }}
        >
          <div>
            <p className="mb-1" style={{ color: 'var(--nr-text-faint)' }}>Featured storefront</p>
            <h3 className="display-5 fw-bold text-gradient mb-3">Hyundai</h3>
            <p style={{ color: 'var(--nr-text-muted)' }}>
              Hyundai is building a safer road for us all. Their SUVs and EVs have been
              recognized throughout the industry for award-winning safety.
            </p>
          </div>
          <div className="text-center mt-4">
            <img src={carImage} alt="Hyundai" className="img-fluid mb-4" style={{ maxWidth: 170, borderRadius: 14 }} />
            <a href="/search" className="btn btn-outline-warning rounded-pill px-4 py-2 w-100">
              About This Brand
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

export default PromoSection;
