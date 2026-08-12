
import React from 'react';
import { FaStar } from 'react-icons/fa';
import userAvatar from '../assets/images/carannonceimage.png'

function ReviewsSection() {
  // Sample review data
  const reviews = [
    {
      id: 1,
      stars: 5,
      text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Fusce dignissim pretium consectetur. Curabitur tempor posuere massa in.",
      name: "Mr. Your Name",
      title: "Sr. Creative Head"
    },
    {
      id: 2,
      stars: 5,
      text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Fusce dignissim pretium consectetur. Curabitur tempor posuere massa in.",
      name: "Mr. Your Name",
      title: "Sr. Creative Head"
    },
    {
      id: 3,
      stars: 5,
      text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Fusce dignissim pretium consectetur. Curabitur tempor posuere massa in.",
      name: "Mr. Your Name",
      title: "Sr. Creative Head"
    }
  ];

  return (
    <section className="container py-5">
      <div className="text-center mb-5">
        <div className="d-flex justify-content-center gap-2 mb-3">
          {[1, 2, 3, 4, 5].map((star) => (
            <FaStar key={star} className="text-warning fs-4" />
          ))}
        </div>
        <h2 className="display-4 fw-bold">Your Reviews</h2>
      </div>
      
      <div className="row row-cols-1 row-cols-md-3 g-4">
        {reviews.map((review) => (
          <div key={review.id} className="col">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body p-4">
                <div className="d-flex mb-3">
                  {[...Array(review.stars)].map((_, i) => (
                    <FaStar key={i} className="text-warning me-1" />
                  ))}
                </div>
                <p className="card-text text-muted mb-4" style={{ fontStyle: 'italic' }}>
                  "{review.text}"
                </p>
                <div className="d-flex align-items-center">
                  <div className="me-3">
                    <img 
                      src={userAvatar} 
                      alt={review.name} 
                      className="rounded-circle" 
                      width="60" 
                      height="60" 
                    />
                  </div>
                  <div>
                    <h5 className="mb-0 text-warning">{review.name}</h5>
                    <small className="text-muted">{review.title}</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default ReviewsSection;