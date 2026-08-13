import React from 'react';
import { Link } from 'react-router-dom';
import { FaSackDollar, FaStar } from 'react-icons/fa6';
import { LuSparkles } from 'react-icons/lu';

const features = [
  {
    icon: <FaSackDollar size={26} />,
    title: "Get Your Car's Market Price!",
    description:
      "Enter your vehicle's details to get an accurate price estimate based on live market trends and our ML models.",
    cta: 'Predict Price',
    to: '/predict',
  },
  {
    icon: <LuSparkles size={26} />,
    title: 'Explore Personalized Recommendations',
    description:
      'Discover cars that match your budget, brand and feature preferences with AI-driven picks just for you.',
    cta: 'See Recommended Cars',
    to: '/profile?recommendations=true',
    highlight: true,
  },
];

const Explore = () => {
  return (
    <section className="container py-5 my-3">
      <div className="text-center mb-5">
        <span className="section-eyebrow justify-content-center">What can you do here?</span>
        <h2 className="section-title display-6 mb-2">Let's explore together</h2>
        <p style={{ color: 'var(--nr-text-muted)', maxWidth: 520, margin: '0 auto' }}>
          From market valuation to tailored recommendations, everything you need to make a smart car decision.
        </p>
      </div>

      <div className="row justify-content-center g-4">
        {features.map((feature, i) => (
          <div key={feature.title} className="col-md-5">
            <div
              className="h-100 d-flex flex-column p-5 text-center surface position-relative overflow-hidden"
              style={{
                borderRadius: '24px',
                background: feature.highlight
                  ? 'linear-gradient(160deg, rgba(245,179,1,0.10), var(--nr-surface) 60%)'
                  : 'var(--nr-surface)',
                border: feature.highlight ? '1px solid rgba(245,179,1,0.35)' : 'var(--nr-border)',
                transition: 'transform 0.25s ease, box-shadow 0.25s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-6px)';
                e.currentTarget.style.boxShadow = 'var(--nr-shadow)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'var(--nr-shadow-sm)';
              }}
            >
              <span
                className="mx-auto mb-4 d-inline-flex align-items-center justify-content-center rounded-circle"
                style={{
                  width: 64,
                  height: 64,
                  background: feature.highlight ? 'var(--nr-grad-accent)' : 'var(--nr-surface-2)',
                  color: feature.highlight ? '#101014' : 'var(--nr-accent)',
                  border: feature.highlight ? 'none' : '1px solid var(--nr-border)',
                }}
              >
                {feature.icon}
              </span>
              <h3 className="h5 fw-bold mb-3" style={{ color: 'var(--nr-text)' }}>{feature.title}</h3>
              <p className="mb-4 flex-grow-1" style={{ color: 'var(--nr-text-muted)', lineHeight: 1.7 }}>
                {feature.description}
              </p>
              <Link
                to={feature.to}
                className={`btn rounded-pill px-4 py-2 w-100 ${feature.highlight ? 'btn-accent' : 'btn-outline-warning'}`}
              >
                {feature.cta}
                <FaStar size={11} className="ms-2 opacity-50" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Explore;
