import React from 'react';
import { FaStar, FaQuoteLeft, FaUser } from 'react-icons/fa6';

function ReviewsSection() {
  const reviews = [
    {
      id: 1,
      stars: 5,
      text: 'I listed my Clio and the AI price prediction was spot on. Sold it within a week at exactly the estimated value.',
      name: 'Yassine B.',
      title: 'Sold a car in Casablanca',
    },
    {
      id: 2,
      stars: 5,
      text: 'The recommendations engine got my budget and fuel preference perfectly. Found my first hybrid in two days.',
      name: 'Salma E.',
      title: 'First-time buyer in Rabat',
    },
    {
      id: 3,
      stars: 5,
      text: 'Comparing models side-by-side made the decision so much easier. Best car-buying tool I have used in Morocco.',
      name: 'Omar T.',
      title: 'Upgraded to an SUV in Marrakech',
    },
  ];

  return (
    <section className="py-5" style={{ background: 'var(--nr-bg-soft)', borderTop: '1px solid var(--nr-border)', borderBottom: '1px solid var(--nr-border)' }}>
      <div className="container py-3">
        <div className="text-center mb-5">
          <div className="d-flex justify-content-center gap-1 mb-3">
            {[1, 2, 3, 4, 5].map((star) => (
              <FaStar key={star} style={{ color: 'var(--nr-accent)' }} />
            ))}
          </div>
          <span className="section-eyebrow justify-content-center">Rated by drivers</span>
          <h2 className="section-title display-6 mb-2">What drivers say</h2>
        </div>

        <div className="row row-cols-1 row-cols-md-3 g-4">
          {reviews.map((review) => (
            <div key={review.id} className="col">
              <div
                className="card border-0 h-100 p-3"
                style={{ borderRadius: 20, background: 'var(--nr-surface)', border: '1px solid var(--nr-border)' }}
              >
                <div className="card-body p-3 d-flex flex-column">
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <div className="d-flex gap-1">
                      {[...Array(review.stars)].map((_, i) => (
                        <FaStar key={i} style={{ color: 'var(--nr-accent)' }} />
                      ))}
                    </div>
                    <FaQuoteLeft style={{ color: 'var(--nr-text-faint)', opacity: 0.5 }} size={22} />
                  </div>

                  <p className="card-text flex-grow-1 mb-4" style={{ color: 'var(--nr-text-muted)', lineHeight: 1.7 }}>
                    "{review.text}"
                  </p>

                  <div className="d-flex align-items-center">
                    <span
                      className="d-inline-flex align-items-center justify-content-center rounded-circle me-3"
                      style={{ width: 48, height: 48, background: 'var(--nr-surface-3)', color: 'var(--nr-accent)' }}
                    >
                      <FaUser size={18} />
                    </span>
                    <div>
                      <h6 className="mb-0 fw-bold" style={{ color: 'var(--nr-text)' }}>{review.name}</h6>
                      <small style={{ color: 'var(--nr-text-faint)' }}>{review.title}</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default ReviewsSection;
