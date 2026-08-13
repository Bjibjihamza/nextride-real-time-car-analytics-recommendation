import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FaSliders, FaMagnifyingGlass } from 'react-icons/fa6';
import { CiSearch } from 'react-icons/ci';
import { useAuth } from '../../context/AuthContext';
import { searchService, favoriteService } from '../../services/api';
import { constructImageUrl, formatPrice } from '../../services/images';
import VehicleCard from '../../components/car/VehicleCard';
import PageHeader from '../../components/layout/PageHeader';
import AlertBanner from '../../components/ui/AlertBanner';
import EmptyState from '../../components/ui/EmptyState';
import Pagination from '../../components/ui/Pagination';
import { SkeletonGrid } from '../../components/ui/SkeletonCard';

const LIMIT = 10;

const EMPTY_FILTERS = {
  brand: '',
  model: '',
  fuelType: '',
  condition: '',
  minPrice: '',
  maxPrice: '',
  minYear: '',
  maxYear: '',
  transmission: '',
  doorCount: '',
  sellerCity: '',
  sector: '',
};

function SearchPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [totalCars, setTotalCars] = useState(0);
  const [favorites, setFavorites] = useState([]);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [sortOption, setSortOption] = useState('relevance');

  const token = user?.token;

  const fetchFavorites = useCallback(async () => {
    if (!token) return;
    try {
      const response = await favoriteService.list(token);
      setFavorites(response.data.cars.map((car) => car.id));
    } catch (err) {
      console.error('Error fetching favorites:', err);
    }
  }, [token]);

  const toggleFavorite = useCallback(
    async (carId, isFavorited) => {
      if (!token) {
        setError('Please log in to add favorites');
        return;
      }
      try {
        if (isFavorited) {
          await favoriteService.remove(carId, token);
          setFavorites((prev) => prev.filter((id) => id !== carId));
        } else {
          await favoriteService.add(carId, token);
          setFavorites((prev) => [...prev, carId]);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Error toggling favorite');
      }
    },
    [token]
  );

  const fetchCars = useCallback(
    async (currentPage = 1) => {
      setLoading(true);
      setError('');
      try {
        const response = await searchService.search({
          userId: user?.id || null,
          searchTerm: searchTerm || undefined,
          brand: filters.brand || undefined,
          model: filters.model || undefined,
          minPrice: filters.minPrice || undefined,
          maxPrice: filters.maxPrice || undefined,
          minYear: filters.minYear || undefined,
          maxYear: filters.maxYear || undefined,
          fuelType: filters.fuelType || undefined,
          transmission: filters.transmission || undefined,
          doorCount: filters.doorCount || undefined,
          sellerCity: filters.sellerCity || undefined,
          sector: filters.sector || undefined,
          page: currentPage,
          limit: LIMIT,
        });

        let fetchedCars = (response.data.cars || []).map((car) => ({
          ...car,
          imageSrc: constructImageUrl(car),
        }));

        switch (sortOption) {
          case 'price-asc':
            fetchedCars.sort((a, b) => (a.price || 0) - (b.price || 0));
            break;
          case 'price-desc':
            fetchedCars.sort((a, b) => (b.price || 0) - (a.price || 0));
            break;
          case 'year-desc':
            fetchedCars.sort((a, b) => (b.year || 0) - (a.year || 0));
            break;
          case 'year-asc':
            fetchedCars.sort((a, b) => (a.year || 0) - (b.year || 0));
            break;
          default:
            break;
        }

        setCars(fetchedCars);
        setTotalCars(response.data.total || fetchedCars.length);
        setPage(currentPage);
      } catch (err) {
        setError(err.response?.data?.message || 'Error fetching cars. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    [searchTerm, filters, sortOption, user?.id]
  );

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  useEffect(() => {
    fetchCars(page);
  }, [fetchCars, page]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchParams({ q: searchTerm });
    setPage(1);
    fetchCars(1);
  };

  const handleFilterChange = (e) => {
    setFilters((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const resetFilters = () => {
    setFilters(EMPTY_FILTERS);
    setSearchTerm('');
    setSearchParams({});
    setPage(1);
    fetchCars(1);
  };

  const getBrands = () => [...new Set(cars.map((car) => car.brand))];
  const getFuelTypes = () => [...new Set(cars.map((car) => car.fuel_type))];
  const getConditions = () => [...new Set(cars.map((car) => car.condition))];
  const getTransmissions = () => [...new Set(cars.map((car) => car.transmission))];
  const getDoorCounts = () => [...new Set(cars.map((car) => car.door_count))].filter((c) => c !== null);
  const getCities = () => [...new Set(cars.map((car) => car.seller_city))];
  const getSectors = () => [...new Set(cars.map((car) => car.sector))].filter((s) => s !== null);

  const totalPages = Math.ceil(totalCars / LIMIT);
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const filterSelect = (label, name, options, placeholder = 'All') => (
    <div className="col-md-3 mb-3">
      <label className="form-label">{label}</label>
      <select className="form-select" name={name} value={filters[name]} onChange={handleFilterChange}>
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="container py-4">
      <PageHeader
        eyebrow="Search"
        title="Find your next car"
        subtitle="Browse thousands of listings and narrow them down with powerful filters."
      />

      <form onSubmit={handleSearch} className="position-relative mb-4" style={{ maxWidth: 680 }}>
        <input
          type="text"
          className="form-control form-control-lg rounded-pill ps-4 pe-5"
          style={{ paddingTop: 14, paddingBottom: 14 }}
          placeholder="Search for cars by brand, model, title..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          aria-label="Search cars"
        />
        <button
          className="btn position-absolute end-0 top-50 translate-middle-y rounded-circle me-2"
          style={{ width: 44, height: 44, background: 'var(--nr-grad-accent)', color: '#101014' }}
          type="submit"
          aria-label="Search"
        >
          <CiSearch size={20} />
        </button>
      </form>

      {error && <AlertBanner variant="danger" className="mb-4">{error}</AlertBanner>}

      <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
        <button
          className={`btn rounded-pill d-inline-flex align-items-center gap-2 px-4 ${showFilters ? 'btn-accent' : 'btn-ghost'}`}
          onClick={() => setShowFilters(!showFilters)}
        >
          <FaSliders /> Filters
        </button>

        <div className="d-flex align-items-center gap-2">
          <span style={{ color: 'var(--nr-text-muted)', fontSize: '0.9rem' }}>Sort by:</span>
          <select
            className="form-select form-select-sm rounded-pill"
            style={{ minWidth: 210 }}
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
          >
            <option value="relevance">Relevance</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="year-desc">Year: Newest First</option>
            <option value="year-asc">Year: Oldest First</option>
          </select>
        </div>
      </div>

      {showFilters && (
        <div className="surface p-4 mb-4" style={{ borderRadius: 20 }}>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="fw-bold mb-0">
              <FaMagnifyingGlass className="me-2" style={{ color: 'var(--nr-accent)' }} />
              Filter Results
            </h5>
            <button className="btn btn-link p-0" onClick={resetFilters}>
              Reset All
            </button>
          </div>

          <div className="row">
            {filterSelect('Brand', 'brand', getBrands(), 'All Brands')}
            <div className="col-md-3 mb-3">
              <label className="form-label">Model</label>
              <input type="text" className="form-control" placeholder="Model" name="model" value={filters.model} onChange={handleFilterChange} />
            </div>
            {filterSelect('Fuel Type', 'fuelType', getFuelTypes(), 'All Fuel Types')}
            {filterSelect('Condition', 'condition', getConditions(), 'All Conditions')}

            <div className="col-md-3 mb-3">
              <label className="form-label">Min Price (MAD)</label>
              <input type="number" className="form-control" placeholder="Min Price" name="minPrice" value={filters.minPrice} onChange={handleFilterChange} min="0" />
            </div>
            <div className="col-md-3 mb-3">
              <label className="form-label">Max Price (MAD)</label>
              <input type="number" className="form-control" placeholder="Max Price" name="maxPrice" value={filters.maxPrice} onChange={handleFilterChange} min="0" />
            </div>
            <div className="col-md-3 mb-3">
              <label className="form-label">Min Year</label>
              <input type="number" className="form-control" placeholder="Min Year" name="minYear" value={filters.minYear} onChange={handleFilterChange} min="1900" max="2025" />
            </div>
            <div className="col-md-3 mb-3">
              <label className="form-label">Max Year</label>
              <input type="number" className="form-control" placeholder="Max Year" name="maxYear" value={filters.maxYear} onChange={handleFilterChange} min="1900" max="2025" />
            </div>

            {filterSelect('Transmission', 'transmission', getTransmissions(), 'All Transmissions')}
            {filterSelect('Door Count', 'doorCount', getDoorCounts(), 'All Door Counts')}
            {filterSelect('City', 'sellerCity', getCities(), 'All Cities')}
            {filterSelect('Sector', 'sector', getSectors(), 'All Sectors')}
          </div>
        </div>
      )}

      <div className="mb-4">
        <h2 className="fw-bold" style={{ fontSize: '1.3rem' }}>
          {loading ? 'Searching...' : `${totalCars} cars found`}
          {searchTerm ? ` for "${searchTerm}"` : ''}
        </h2>
      </div>

      {loading ? (
        <SkeletonGrid count={8} />
      ) : cars.length === 0 ? (
        <EmptyState
          title="No cars found matching your criteria"
          description="Try adjusting your search or filter options"
          action={
            <button className="btn btn-outline-warning rounded-pill mt-2 px-4" onClick={resetFilters}>
              Clear all filters
            </button>
          }
        />
      ) : (
        <>
          <div className="row row-cols-1 row-cols-md-2 row-cols-lg-4 g-4">
            {cars.map((car) => (
              <VehicleCard
                key={car.id}
                vehicle={{
                  id: car.id,
                  name: `${car.brand} ${car.model}`,
                  subtitle: car.title,
                  badges: [car.year, car.fuel_type, car.transmission].filter(Boolean).map(String),
                  location: car.seller_city,
                  price: formatPrice(car.price),
                  isNew: car.condition === 'New',
                  imageSrc: car.imageSrc,
                }}
                isSaved={favorites.includes(car.id)}
                onSaveToggle={toggleFavorite}
              />
            ))}
          </div>

          <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} className="mt-5" />
        </>
      )}
    </div>
  );
}

export default SearchPage;
