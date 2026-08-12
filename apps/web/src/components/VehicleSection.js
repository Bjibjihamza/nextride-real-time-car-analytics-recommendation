import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FaCircleArrowDown } from 'react-icons/fa6';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';
import VehicleCard from './VehicleCard';

function VehicleSection() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('all');
  const [vehicles, setVehicles] = useState([]);
  const [recommendedVehicles, setRecommendedVehicles] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const limit = 8;

  const BASE_URL = API_BASE_URL;

  const constructImageUrl = useCallback((vehicle) => {
    if (vehicle.image_url && vehicle.image_url.startsWith('http')) {
      return vehicle.image_url;
    }
    if (vehicle.image && vehicle.image.startsWith('http')) {
      return vehicle.image;
    }
    const folderName = vehicle.image_folder || 
      (vehicle.title || `${vehicle.brand || ''} ${vehicle.model || ''}`.trim()).toLowerCase()
        .replace(/[^a-zA-Z0-9\s]/g, '_')
        .replace(/\s+/g, '_');
    if (!vehicle.image_folder) {
      console.warn(`No image_folder found for vehicle "${vehicle.title || `${vehicle.brand} ${vehicle.model}`}", using fallback folder: ${folderName}`);
    }
    const imagePath = `/images/cars/${folderName}/image_1.jpg`;
    return `${BASE_URL}${imagePath}`;
  }, [BASE_URL]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      console.log('Fetching data for page:', page, 'user:', user?.userId);
      const config = user?.token ? { headers: { Authorization: `Bearer ${user.token}` } } : {};

      const allCarsResponse = await axios.get(`${API_BASE_URL}/api/cars?page=${page}&limit=${limit}`, config);
      const allCars = (allCarsResponse.data.cars || []).map(vehicle => ({
        ...vehicle,
        imageSrc: constructImageUrl(vehicle),
        title: vehicle.title || `${vehicle.brand || ''} ${vehicle.model || ''}`.trim() || 'Unknown Vehicle',
      }));
      setVehicles(allCars);
      setTotalPages(Math.ceil(allCarsResponse.data.total / limit) || 1);

      if (user) {
        const [favoritesResponse] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/users/favorites`, config),
        ]);
        const favoriteCars = (favoritesResponse.data.cars || []).map(vehicle => ({
          ...vehicle,
          imageSrc: constructImageUrl(vehicle),
          title: vehicle.title || `${vehicle.brand || ''} ${vehicle.model || ''}`.trim() || 'Unknown Vehicle',
        }));
        setFavorites(favoriteCars);
      } else {
        setRecommendedVehicles([]);
        setFavorites([]);
      }
    } catch (error) {
      console.error('Error fetching data:', error.response?.data || error.message);
      setError('Failed to load vehicles. Please try again later.');
      setVehicles([]);
      setRecommendedVehicles([]);
      setFavorites([]);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  }, [user, page, constructImageUrl]);

  const fetchRecommendations = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const recommendedResponse = await axios.get(`${API_BASE_URL}/api/users/recommendations/generate`, config);
      const recommended = (recommendedResponse.data.cars || []).map(vehicle => ({
        ...vehicle,
        imageSrc: constructImageUrl(vehicle),
        title: vehicle.title || `${vehicle.brand || ''} ${vehicle.model || ''}`.trim() || 'Unknown Vehicle',
      }));
      setRecommendedVehicles(recommended);
    } catch (error) {
      console.error('Error fetching recommendations:', error.response?.data || error.message);
      setError('Failed to load recommendations. Please try again later.');
      setRecommendedVehicles([]);
    } finally {
      setIsLoading(false);
    }
  }, [user, constructImageUrl]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const favoriteIds = useMemo(() => new Set(favorites.map((f) => f.id)), [favorites]);

  const handleSaveToggle = useCallback(
    async (vehicleId, shouldSave) => {
      if (!user) {
        setError('Please log in to save vehicles.');
        return;
      }

      try {
        const config = { headers: { Authorization: `Bearer ${user.token}` } };
        if (shouldSave) {
          await axios.post(`${API_BASE_URL}/api/users/favorites`, { carId: vehicleId }, config);
          const vehicleToAdd =
            vehicles.find((v) => v.id === vehicleId) ||
            recommendedVehicles.find((v) => v.id === vehicleId);
          if (vehicleToAdd && !favoriteIds.has(vehicleId)) {
            setFavorites((prev) => [...prev, vehicleToAdd]);
          }
        } else {
          await axios.delete(`${API_BASE_URL}/api/users/favorites`, {
            headers: { Authorization: `Bearer ${user.token}` },
            data: { carId: vehicleId },
          });
          setFavorites((prev) => prev.filter((f) => f.id !== vehicleId));
        }
      } catch (error) {
        console.error('Error toggling favorite:', error);
        setError('Failed to update favorites. Please try again.');
      }
    },
    [user, vehicles, recommendedVehicles, favoriteIds]
  );

  const handleTabClick = (tab) => {
    setActiveTab(tab);
    setPage(1);
    if (tab === 'recommended' && user) {
      fetchRecommendations();
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
      const section = document.querySelector('.container');
      if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  const parseDate = (dateStr) => {
    if (!dateStr) return null;
    try {
      if (dateStr.match(/^\d{2}\/\d{2}\/\d{4}\s\d{2}:\d{2}$/)) {
        const [datePart, timePart] = dateStr.split(' ');
        const [day, month, year] = datePart.split('/').map(Number);
        const [hours, minutes] = timePart.split(':').map(Number);
        return new Date(year, month - 1, day, hours, minutes);
      }
      if (dateStr.match(/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}$/)) {
        return new Date(dateStr);
      }
      console.warn(`Unrecognized date format: ${dateStr}`);
      return null;
    } catch (error) {
      console.error(`Error parsing date ${dateStr}:`, error);
      return null;
    }
  };

  const displayedVehicles = useMemo(
    () => (activeTab === 'all' ? vehicles : activeTab === 'recommended' ? recommendedVehicles : vehicles),
    [activeTab, vehicles, recommendedVehicles]
  );

  // Pagination range logic: show 5 pages before and after the current page
  const getPaginationRange = () => {
    const maxPagesToShow = 11; // 5 before + current + 5 after
    let start = Math.max(1, page - 5);
    let end = Math.min(totalPages, start + maxPagesToShow - 1);

    // Adjust start if end is at the maximum
    if (end === totalPages) {
      start = Math.max(1, end - maxPagesToShow + 1);
    }

    const pages = [];
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return {
      pages,
      showLeftEllipsis: start > 1,
      showRightEllipsis: end < totalPages,
    };
  };

  const { pages, showLeftEllipsis, showRightEllipsis } = getPaginationRange();

  return (
    <section className="container py-5" style={{ maxWidth: '1400px' }}>
      {error && (
        <div
          className="alert d-flex align-items-center mb-5"
          style={{
            backgroundColor: '#fee2e2',
            border: 'none',
            borderRadius: '8px',
            padding: '16px 24px',
            color: '#b91c1c',
            fontSize: '16px',
            fontWeight: '500',
          }}
        >
          <span>{error}</span>
        </div>
      )}

      <div className="mb-5">
        <h1
          className="fw-bold mb-4"
          style={{
            fontSize: '32px',
            color: '#1a1a1a',
            letterSpacing: '-0.5px',
          }}
        >
          Explore All Vehicles
        </h1>
        <div className="d-flex flex-wrap gap-3">
          <button
            onClick={() => handleTabClick('all')}
            style={{
              padding: '10px 24px',
              borderRadius: '20px',
              border: 'none',
              backgroundColor: activeTab === 'all' ? '#ffc107' : '#f0f0f0',
              color: activeTab === 'all' ? '#fff' : '#666',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'background-color 0.3s ease, color 0.3s ease',
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = activeTab === 'all' ? '#e0a800' : '#e0e0e0')
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = activeTab === 'all' ? '#ffc107' : '#f0f0f0')
            }
          >
            All
          </button>
          <button
            onClick={() => handleTabClick('recommended')}
            disabled={!user}
            style={{
              padding: '10px 24px',
              borderRadius: '20px',
              border: 'none',
              backgroundColor: activeTab === 'recommended' ? '#ffc107' : '#f0f0f0',
              color: activeTab === 'recommended' ? '#fff' : user ? '#666' : '#aaa',
              fontSize: '14px',
              fontWeight: '600',
              cursor: user ? 'pointer' : 'not-allowed',
              transition: 'background-color 0.3s ease, color 0.3s ease',
            }}
            onMouseEnter={(e) =>
              user &&
              (e.currentTarget.style.backgroundColor =
                activeTab === 'recommended' ? '#e0a800' : '#e0e0e0')
            }
            onMouseLeave={(e) =>
              user &&
              (e.currentTarget.style.backgroundColor = activeTab === 'recommended' ? '#ffc107' : '#f0f0f0')
            }
          >
            Recommended for you
          </button>
          <button
            disabled
            style={{
              padding: '10px 24px',
              borderRadius: '20px',
              border: 'none',
              backgroundColor: '#f0f0f0',
              color: '#aaa',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'not-allowed',
            }}
          >
            ...
          </button>
        </div>
      </div>

      {isLoading ? (
        <div
          className="col-12 text-center py-5"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              border: '4px solid #ffc107',
              borderTop: '4px solid transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          />
          <h5
            style={{
              fontSize: '18px',
              color: '#666',
              margin: 0,
            }}
          >
            Loading vehicles...
          </h5>
        </div>
      ) : displayedVehicles.length > 0 ? (
        <div className="row row-cols-1 row-cols-md-2 row-cols-lg-4 g-4">
          {displayedVehicles.map((vehicle) => {
            const parsedDate = parseDate(vehicle.publication_date);
            const isNew = parsedDate ? new Date() - parsedDate < 7 * 24 * 60 * 60 * 1000 : false;

            return (
              <VehicleCard
                key={vehicle.id}
                vehicle={{
                  id: vehicle.id,
                  name: vehicle.title,
                  specs: `${vehicle.fuel_type || ''} ${vehicle.transmission || ''}`.trim(),
                  price: vehicle.price ? `${vehicle.price.toLocaleString()} MAD` : 'Price on request',
                  isNew,
                  imageSrc: vehicle.imageSrc,
                }}
                isSaved={favoriteIds.has(vehicle.id)}
                onSaveToggle={handleSaveToggle}
              />
            );
          })}
        </div>
      ) : (
        <div
          className="col-12 text-center py-5"
          style={{
            backgroundColor: '#f9f9f9',
            borderRadius: '12px',
            padding: '40px',
          }}
        >
          <h5
            style={{
              fontSize: '20px',
              color: '#1a1a1a',
              marginBottom: '8px',
            }}
          >
            No vehicles found
          </h5>
          <p
            style={{
              fontSize: '16px',
              color: '#666',
              margin: 0,
            }}
          >
            Try adjusting your preferences or check back later.
          </p>
        </div>
      )}

      {activeTab === 'all' && totalPages > 1 && (
        <div className="d-flex justify-content-center mt-5">
          <nav aria-label="Page navigation">
            <ul
              className="pagination"
              style={{
                display: 'flex',
                gap: '8px',
                alignItems: 'center',
              }}
            >
              <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
                <button
                  className="page-link"
                  onClick={() => handlePageChange(page - 1)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: page === 1 ? '#f0f0f0' : '#fff',
                    color: page === 1 ? '#aaa' : '#1a1a1a',
                    fontWeight: '500',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                    cursor: page === 1 ? 'not-allowed' : 'pointer',
                    transition: 'background-color 0.3s ease, color 0.3s ease',
                  }}
                  onMouseEnter={(e) =>
                    page !== 1 && (e.currentTarget.style.backgroundColor = '#e0e0e0')
                  }
                  onMouseLeave={(e) =>
                    page !== 1 && (e.currentTarget.style.backgroundColor = '#fff')
                  }
                >
                  Previous
                </button>
              </li>

              {showLeftEllipsis && (
                <>
                  <li className="page-item">
                    <button
                      className="page-link"
                      onClick={() => handlePageChange(1)}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: '#fff',
                        color: '#1a1a1a',
                        fontWeight: '500',
                        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                        transition: 'background-color 0.3s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#e0e0e0')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#fff')}
                    >
                      1
                    </button>
                  </li>
                  <li className="page-item disabled">
                    <span
                      className="page-link"
                      style={{
                        padding: '8px 14px',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: '#fff',
                        color: '#aaa',
                        fontWeight: '500',
                      }}
                    >
                      ...
                    </span>
                  </li>
                </>
              )}

              {pages.map((pageNumber) => (
                <li key={pageNumber} className={`page-item ${page === pageNumber ? 'active' : ''}`}>
                  <button
                    className="page-link"
                    onClick={() => handlePageChange(pageNumber)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: page === pageNumber ? '#ffc107' : '#fff',
                      color: page === pageNumber ? '#fff' : '#1a1a1a',
                      fontWeight: '500',
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                      transition: 'background-color 0.3s ease, color 0s ease',
                    }}
                    onMouseEnter={(e) =>
                      page !== pageNumber && (e.currentTarget.style.backgroundColor = '#e0e0e0')
                    }
                    onMouseLeave={(e) =>
                      page !== pageNumber && (e.currentTarget.style.backgroundColor = '#fff')
                    }
                  >
                    {pageNumber}
                  </button>
                </li>
              ))}

              {showRightEllipsis && (
                <>
                  <li className="page-item disabled">
                    <span
                      className="page-link"
                      style={{
                        padding: '8px 14px',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: '#fff',
                        color: '#aaa',
                        fontWeight: '500',
                      }}
                    >
                      ...
                    </span>
                  </li>
                  <li className="page-item">
                    <button
                      className="page-link"
                      onClick={() => handlePageChange(totalPages)}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: '#fff',
                        color: '#1a1a1a',
                        fontWeight: '500',
                        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                        transition: 'background-color 0.3s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#e0e0e0')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#fff')}
                    >
                      {totalPages}
                    </button>
                  </li>
                </>
              )}

              <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}>
                <button
                  className="page-link"
                  onClick={() => handlePageChange(page + 1)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: page === totalPages ? '#f0f0f0' : '#fff',
                    color: page === totalPages ? '#aaa' : '#1a1a1a',
                    fontWeight: '500',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                    cursor: page === totalPages ? 'not-allowed' : 'pointer',
                    transition: 'background-color 0.3s ease, color 0.3s ease',
                  }}
                  onMouseEnter={(e) =>
                    page !== totalPages && (e.currentTarget.style.backgroundColor = '#e0e0e0')
                  }
                  onMouseLeave={(e) =>
                    page !== totalPages && (e.currentTarget.style.backgroundColor = '#fff')
                  }
                >
                  Next
                </button>
              </li>
            </ul>
          </nav>
        </div>
      )}

      {activeTab === 'all' && page < totalPages && (
        <div
          className="d-flex justify-content-center mt-5"
          style={{
            position: 'relative',
            paddingTop: '50px',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              border: '2px solid #ffc107',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'bounce 1.5s infinite',
            }}
          >
            <FaCircleArrowDown style={{ fontSize: '24px', color: '#ffc107' }} />
          </div>
        </div>
      )}
    </section>
  );
}

export default VehicleSection;