import React, { memo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiShare2 } from 'react-icons/fi';
import { FaRegHeart, FaHeart } from 'react-icons/fa';
import { MdOutlineArrowOutward } from 'react-icons/md';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';

const VehicleCard = ({ vehicle, isSaved, onSaveToggle }) => {
  const { user } = useAuth();
  const BASE_URL = API_BASE_URL;
  const DEFAULT_IMAGE = `${BASE_URL}/images/cars/default/image_1.jpg`;
  const PLACEHOLDER_IMAGE = `${BASE_URL}/images/cars/placeholder.jpg`; // Ensure this exists
  const [imageSrc, setImageSrc] = useState(vehicle.imageSrc || DEFAULT_IMAGE);
  const [shouldRender, setShouldRender] = useState(true);

  const handleViewDetails = async () => {
    if (user) {
      try {
        await axios.post(
          `${API_BASE_URL}/api/cars/view`,
          {
            userId: user.userId,
            carId: vehicle.id,
            viewSource: 'vehicle_section',
          },
          { headers: { Authorization: `Bearer ${user.token}` } }
        );
      } catch (error) {
        console.error('Error recording car view:', error);
      }
    }
  };

  const handleImageError = (e) => {
    const currentSrc = e.target.src;
    if (currentSrc !== DEFAULT_IMAGE && currentSrc !== PLACEHOLDER_IMAGE) {
      console.warn(`Image failed for vehicle ${vehicle.id}: ${currentSrc}, falling back to default`);
      setImageSrc(DEFAULT_IMAGE);
    } else if (currentSrc !== PLACEHOLDER_IMAGE) {
      console.warn(`Default image failed for vehicle ${vehicle.id}: ${currentSrc}, falling back to placeholder`);
      setImageSrc(PLACEHOLDER_IMAGE);
    } else {
      console.error(`Placeholder image failed for vehicle ${vehicle.id}: ${currentSrc}`);
      setShouldRender(false);
    }
  };

  useEffect(() => {
    setImageSrc(vehicle.imageSrc || DEFAULT_IMAGE);
    setShouldRender(true);
  }, [vehicle.imageSrc]);

  if (!shouldRender) {
    return null;
  }

  return (
    <div className="col">
      <div
        className="card h-100 border-0 position-relative transition-all"
        style={{
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-5px)';
          e.currentTarget.style.boxShadow = '0 8px 20px rgba(0, 0, 0, 0.15)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
        }}
      >
        {vehicle.isNew && (
          <span
            className="position-absolute text-white px-3 py-1 rounded-pill"
            style={{
              top: '12px',
              left: '12px',
              backgroundColor: '#367209',
              fontWeight: '600',
              fontSize: '12px',
              zIndex: 1,
            }}
          >
            New
          </span>
        )}

        <div
          style={{
            position: 'relative',
            paddingTop: '66.67%',
            backgroundColor: '#f5f5f5',
          }}
        >
          <img
            src={imageSrc}
            className="card-img-top"
            alt={vehicle.name || 'Vehicle'}
            loading="lazy"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              borderTopLeftRadius: '12px',
              borderTopRightRadius: '12px',
              transition: 'transform 0.3s ease',
            }}
            onError={handleImageError}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          />
        </div>

        <div className="card-body" style={{ padding: '16px' }}>
          <div className="d-flex justify-content-between align-items-start mb-3">
            <div>
              <h5
                className="card-title fw-bold mb-1"
                style={{
                  fontSize: '16px',
                  color: '#1a1a1a',
                  textTransform: 'uppercase',
                  lineHeight: '1.2',
                }}
              >
                {vehicle.name}
              </h5>
              <p
                className="card-text text-muted mb-0"
                style={{
                  fontSize: '14px',
                  color: '#666',
                }}
              >
                {vehicle.specs}
              </p>
            </div>
            <div className="d-flex gap-2">
              <button
                className="btn btn-light p-1 rounded-circle"
                style={{
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: 'none',
                  backgroundColor: '#f0f0f0',
                  transition: 'background-color 0.3s ease',
                }}
                onClick={() => onSaveToggle(vehicle.id, !isSaved)}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#e0e0e0')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#f0f0f0')}
              >
                {isSaved ? (
                  <FaHeart style={{ color: '#e63946', fontSize: '16px' }} />
                ) : (
                  <FaRegHeart style={{ color: '#666', fontSize: '16px' }} />
                )}
              </button>
              <button
                className="btn btn-light p-1 rounded-circle"
                style={{
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: 'none',
                  backgroundColor: '#f0f0f0',
                  transition: 'background-color 0.3s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#e0e0e0')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#f0f0f0')}
              >
                <FiShare2 style={{ color: '#666', fontSize: '16px' }} />
              </button>
            </div>
          </div>

          <div className="d-flex justify-content-between align-items-center">
            <span
              className="fw-bold"
              style={{
                fontSize: '16px',
                color: '#1a1a1a',
              }}
            >
              {vehicle.price}
            </span>
            <Link
              to={`/car/${vehicle.id}`}
              className="text-decoration-none d-flex align-items-center gap-1"
              style={{
                fontSize: '14px',
                fontWeight: '500',
                color: '#BC7328',
                transition: 'color 0.3s ease',
              }}
              onClick={handleViewDetails}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#a56324')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#BC7328')}
            >
              View Details
              <MdOutlineArrowOutward style={{ fontSize: '16px' }} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(VehicleCard);