import React from 'react';
import compared1 from '../../assets/images/compared_1.png';
import compared2 from '../../assets/images/compared_2.png';
import compared3 from '../../assets/images/compared_3.png';

function CompareSection() {
  const comparisons = [
    { id: 1, name: '2024 Tesla Model Y vs 2024 Ford Mustang Mach-E', image: compared1 },
    { id: 2, name: '2024 Honda Accord vs 2024 Toyota Camry', image: compared2 },
    { id: 3, name: '2024 Honda CR-V vs 2024 Toyota RAV4', image: compared3 },
  ];

  return (
    <section className="py-5" style={{ background: 'var(--nr-bg-soft)', borderTop: '1px solid var(--nr-border)', borderBottom: '1px solid var(--nr-border)' }}>
      <div className="container py-3">
        <div className="d-flex flex-wrap justify-content-between align-items-end gap-3 mb-5">
          <div>
            <span className="section-eyebrow">Side by side</span>
            <h2 className="section-title display-6 mb-2">Compare top rated vehicles</h2>
            <p className="mb-0" style={{ color: 'var(--nr-text-muted)' }}>
              Break down the specs that matter before you commit.
            </p>
          </div>
          <a href="/search" className="btn btn-outline-warning rounded-pill px-4">
            Browse all cars
          </a>
        </div>

        <div className="row row-cols-1 row-cols-md-3 g-4">
          {comparisons.map((comparison) => (
            <div key={comparison.id} className="col">
              <div
                className="card h-100 border-0 p-3 overflow-hidden"
                style={{
                  borderRadius: 20,
                  background: 'var(--nr-surface)',
                  border: '1px solid var(--nr-border)',
                  transition: 'transform 0.25s ease, border-color 0.25s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-6px)';
                  e.currentTarget.style.borderColor = 'rgba(245,179,1,0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = 'var(--nr-border)';
                }}
              >
                <div className="text-center mb-3">
                  <img
                    src={comparison.image}
                    alt={comparison.name}
                    className="img-fluid"
                    style={{ width: '100%', objectFit: 'contain', borderRadius: 14 }}
                  />
                </div>
                <div className="card-body p-0 text-center">
                  <p className="mb-0 fw-semibold" style={{ color: 'var(--nr-text)', fontSize: '0.95rem' }}>
                    {comparison.name}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default CompareSection;
