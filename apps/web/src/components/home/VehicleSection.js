import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FaCircleArrowDown, FaCar } from 'react-icons/fa6';
import { useAuth } from '../../context/AuthContext';
import { carService, favoriteService, userService } from '../../services/api';
import { constructImageUrl, formatPrice, normalizeVehicleTitle } from '../../services/images';
import VehicleCard from '../car/VehicleCard';
import SectionHeader from '../ui/SectionHeader';
import SkeletonGrid from '../ui/SkeletonCard';
import EmptyState from '../ui/EmptyState';
import Pagination from '../ui/Pagination';
import AlertBanner from '../ui/AlertBanner';

const LIMIT = 8;

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

  const token = user?.token;

  const decorate = useCallback(
    (items) =>
      (items || []).map((vehicle) => ({
        ...vehicle,
        imageSrc: constructImageUrl(vehicle),
        title: normalizeVehicleTitle(vehicle),
      })),
    []
  );

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await carService.list({ page, limit: LIMIT }, token);
      setVehicles(decorate(response.data.cars));
      setTotalPages(Math.ceil(response.data.total / LIMIT) || 1);

      if (user) {
        const favResponse = await favoriteService.list(token);
        setFavorites(decorate(favResponse.data.cars));
      } else {
        setRecommendedVehicles([]);
        setFavorites([]);
      }
      setError('');
    } catch (err) {
      console.error('Error fetching data:', err.response?.data || err.message);
      setError('Failed to load vehicles. Please try again later.');
      setVehicles([]);
      setRecommendedVehicles([]);
      setFavorites([]);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  }, [user, page, token, decorate]);

  const fetchRecommendations = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const response = await userService.generateRecommendations(token);
      setRecommendedVehicles(decorate(response.data.cars));
    } catch (err) {
      console.error('Error loading recommendations:', err.response?.data || err.message);
      setError('Failed to load recommendations. Please try again later.');
      setRecommendedVehicles([]);
    } finally {
      setIsLoading(false);
    }
  }, [user, token, decorate]);

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
        if (shouldSave) {
          await favoriteService.add(vehicleId, token);
          const toAdd =
            vehicles.find((v) => v.id === vehicleId) ||
            recommendedVehicles.find((v) => v.id === vehicleId);
          if (toAdd && !favoriteIds.has(vehicleId)) {
            setFavorites((prev) => [...prev, toAdd]);
          }
        } else {
          await favoriteService.remove(vehicleId, token);
          setFavorites((prev) => prev.filter((f) => f.id !== vehicleId));
        }
      } catch (err) {
        console.error('Error toggling favorite:', err);
        setError('Failed to update favorites. Please try again.');
      }
    },
    [user, token, vehicles, recommendedVehicles, favoriteIds]
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
      document.getElementById('vehicle-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
      return null;
    } catch (err) {
      return null;
    }
  };

  const displayedVehicles =
    activeTab === 'recommended' ? recommendedVehicles : vehicles;

  return (
    <section id="vehicle-section" className="container py-5" style={{ maxWidth: '1320px' }}>
      {error && <AlertBanner variant="danger" className="mb-4">{error}</AlertBanner>}

      <SectionHeader
        eyebrow="Latest inventory"
        title="Explore All Vehicles"
        subtitle="Fresh listings updated in real time from the Moroccan market."
        action={
          <div className="d-flex flex-wrap gap-2">
            <button
              onClick={() => handleTabClick('all')}
              className={`btn rounded-pill px-4 ${activeTab === 'all' ? 'btn-accent' : 'btn-ghost'}`}
              style={{ fontSize: '0.85rem' }}
            >
              All
            </button>
            <button
              onClick={() => handleTabClick('recommended')}
              disabled={!user}
              className={`btn rounded-pill px-4 ${activeTab === 'recommended' ? 'btn-accent' : 'btn-ghost'}`}
              style={{ fontSize: '0.85rem' }}
            >
              Recommended for you
            </button>
          </div>
        }
      />

      {isLoading ? (
        <SkeletonGrid count={8} />
      ) : displayedVehicles.length > 0 ? (
        <div className="row row-cols-1 row-cols-md-2 row-cols-lg-4 g-4">
          {displayedVehicles.map((vehicle) => {
            const parsedDate = parseDate(vehicle.publication_date);
            const isNew = parsedDate ? new Date() - parsedDate < 7 * 24 * 60 * 60 * 1000 : false;
            const specs = `${vehicle.fuel_type || ''} ${vehicle.transmission || ''}`.trim();

            return (
              <VehicleCard
                key={vehicle.id}
                vehicle={{
                  id: vehicle.id,
                  name: vehicle.title,
                  subtitle: specs,
                  badges: vehicle.year ? [String(vehicle.year)] : [],
                  price: formatPrice(vehicle.price),
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
        <EmptyState
          icon={<FaCar size={52} />}
          title="No vehicles found"
          description="Try adjusting your preferences or check back later."
        />
      )}

      {activeTab === 'all' && (
        <>
          <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} className="mt-5" />

          {page < totalPages && (
            <div className="d-flex justify-content-center mt-4" style={{ paddingTop: 24 }}>
              <button
                className="btn btn-ghost rounded-circle d-inline-flex align-items-center justify-content-center"
                style={{ width: 48, height: 48, animation: 'nr-bounce 1.6s infinite' }}
                onClick={() => handlePageChange(page + 1)}
                aria-label="Load more"
              >
                <FaCircleArrowDown style={{ fontSize: 20, color: 'var(--nr-accent)' }} />
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

export default VehicleSection;
