import React, { memo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiShare2 } from 'react-icons/fi';
import { FaRegHeart, FaHeart, FaLocationDot } from 'react-icons/fa6';
import { MdOutlineArrowOutward } from 'react-icons/md';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config';
import { DEFAULT_IMAGE, PLACEHOLDER_IMAGE } from '../../services/images';
import Pill from '../ui/Pill';

const VehicleCard = ({ vehicle, isSaved, onSaveToggle }) => {
  const { user } = useAuth();
  const [imageSrc, setImageSrc] = useState(vehicle.imageSrc || DEFAULT_IMAGE);
  const [shouldRender, setShouldRender] = useState(true);

  const handleViewDetails = async () => {
    if (user) {
      try {
        await axios.post(
          `${API_BASE_URL}/api/cars/view`,
          { userId: user.userId, carId: vehicle.id, viewSource: 'vehicle_section' },
          { headers: { Authorization: `Bearer ${user.token}` } }
        );
      } catch (error) {
        console.error('Error recording car view:', error);
      }
    }
  };

  const handleImageError = () => {
    if (imageSrc !== DEFAULT_IMAGE) {
      setImageSrc(DEFAULT_IMAGE);
    } else if (imageSrc !== PLACEHOLDER_IMAGE) {
      setImageSrc(PLACEHOLDER_IMAGE);
    } else {
      setShouldRender(false);
    }
  };

  useEffect(() => {
    setImageSrc(vehicle.imageSrc || DEFAULT_IMAGE);
    setShouldRender(true);
  }, [vehicle.imageSrc]);

  if (!shouldRender) return null;

  return (
    <div className="col">
      <div
        className="card h-100 border-0 position-relative overflow-hidden"
        style={{
          borderRadius: 18,
          background: 'var(--nr-surface)',
          border: '1px solid var(--nr-border)',
          boxShadow: 'var(--nr-shadow-sm)',
          transition: 'transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-6px)';
          e.currentTarget.style.boxShadow = 'var(--nr-shadow)';
          e.currentTarget.style.borderColor = 'rgba(245,179,1,0.45)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'var(--nr-shadow-sm)';
          e.currentTarget.style.borderColor = 'var(--nr-border)';
        }}
      >
        {vehicle.isNew && (
          <span className="position-absolute badge badge-success m-3" style={{ zIndex: 3, left: 0, top: 0 }}>
            New
          </span>
        )}

        <div style={{ position: 'relative', paddingTop: '68%', backgroundColor: 'var(--nr-bg-soft)', overflow: 'hidden' }}>
          <img
            src={imageSrc}
            className="w-100"
            alt={vehicle.name || 'Vehicle'}
            loading="lazy"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              height: '100%',
              objectFit: 'cover',
              transition: 'transform 0.45s ease',
            }}
            onError={handleImageError}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.07)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          />
          <div
            className="position-absolute"
            style={{
              inset: 0,
              background: 'linear-gradient(to top, rgba(10,14,23,0.55), transparent 45%)',
              pointerEvents: 'none',
            }}
          />
        </div>

        <div className="card-body d-flex flex-column p-3" style={{ flex: 1 }}>
          <div className="d-flex justify-content-between align-items-start mb-2">
            <div className="me-2" style={{ minWidth: 0 }}>
              <h5
                className="fw-bold mb-1 text-truncate"
                style={{
                  fontSize: '0.95rem',
                  color: 'var(--nr-text)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.02em',
                  lineHeight: 1.25,
                }}
              >
                {vehicle.name}
              </h5>
              {vehicle.subtitle && (
                <p className="mb-0 text-truncate" style={{ fontSize: '0.8rem', color: 'var(--nr-text-faint)' }}>
                  {vehicle.subtitle}
                </p>
              )}
            </div>
            <div className="d-flex gap-1 flex-shrink-0">
              <button
                className="btn btn-ghost rounded-circle p-2"
                style={{ width: 34, height: 34 }}
                onClick={() => onSaveToggle(vehicle.id, !isSaved)}
                aria-label={isSaved ? 'Remove from favorites' : 'Add to favorites'}
              >
                {isSaved ? (
                  <FaHeart style={{ color: 'var(--nr-danger)', fontSize: 15 }} />
                ) : (
                  <FaRegHeart style={{ color: 'var(--nr-text-muted)', fontSize: 15 }} />
                )}
              </button>
              <button className="btn btn-ghost rounded-circle p-2" style={{ width: 34, height: 34 }} aria-label="Share">
                <FiShare2 style={{ color: 'var(--nr-text-muted)', fontSize: 15 }} />
              </button>
            </div>
          </div>

          {(vehicle.badges || []).length > 0 && (
            <div className="d-flex flex-wrap gap-2 mt-1 mb-2">
              {vehicle.badges.map((badge) => (
                <Pill key={badge}>{badge}</Pill>
              ))}
            </div>
          )}

          {vehicle.location && (
            <p className="d-flex align-items-center gap-1 mb-2" style={{ color: 'var(--nr-text-faint)', fontSize: '0.8rem' }}>
              <FaLocationDot size={11} style={{ color: 'var(--nr-accent)' }} /> {vehicle.location}
            </p>
          )}

          <div
            className="d-flex justify-content-between align-items-center mt-auto pt-3"
            style={{ borderTop: '1px solid var(--nr-border)' }}
          >
            <span className="fw-bold" style={{ fontSize: '1rem', color: 'var(--nr-accent)' }}>
              {vehicle.price}
            </span>
            <Link
              to={`/car/${vehicle.id}`}
              className="text-decoration-none d-inline-flex align-items-center gap-1 fw-semibold"
              style={{ fontSize: '0.82rem', color: 'var(--nr-text-muted)' }}
              onClick={handleViewDetails}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--nr-accent)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--nr-text-muted)')}
            >
              View Details
              <MdOutlineArrowOutward style={{ fontSize: 15 }} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(VehicleCard);
