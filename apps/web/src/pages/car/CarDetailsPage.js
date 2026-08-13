import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FaArrowLeft, FaHeart, FaRegHeart, FaShare, FaLocationDot, FaCalendarDays, FaGaugeHigh, FaGasPump, FaDoorOpen, FaCheck, FaRobot } from 'react-icons/fa6';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config';
import { carService, favoriteService, predictionService } from '../../services/api';
import useLabels from '../../hooks/useLabels';

const EQUIPMENT_OPTIONS = [
  'abs', 'airbags', 'caméra_de_recul', 'climatisation', 'esp', 'jantes_aluminium',
  'limiteur_de_vitesse', 'ordinateur_de_bord', 'radar_de_recul', 'régulateur_de_vitesse',
  'sièges_cuir', 'toit_ouvrant', 'verrouillage_centralisé', 'vitres_électriques',
];

function CarDetailsPage() {
  const { carId } = useParams();
  const { user } = useAuth();
  const [car, setCar] = useState(null);
  const [similarCars, setSimilarCars] = useState([]);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [activeTab, setActiveTab] = useState('description');

  const { labels: rawLabels, loading: labelsLoading, error: labelsError } = useLabels('/labels_p.json');

  const labels = useMemo(() => {
    if (!rawLabels) return null;
    const normalizedBrands = {};
    for (const brand in rawLabels.brands) {
      normalizedBrands[brand.toLowerCase()] = {
        models: Object.keys(rawLabels.brands[brand].models).reduce((acc, model) => {
          acc[model.toLowerCase()] = rawLabels.brands[brand].models[model].map(String);
          return acc;
        }, {}),
      };
    }
    return {
      ...rawLabels,
      brands: normalizedBrands,
      equipment: EQUIPMENT_OPTIONS,
      condition: rawLabels.condition.map((c) => c.toLowerCase().replace(/\s+/g, '_')),
      door_count: rawLabels.door_count.map(String),
      first_owner: rawLabels.first_owner.map((o) => (o === 'Oui' || o === 'Yes' ? 'Oui' : 'Non')),
      fiscal_power: rawLabels.fiscal_power.map(String),
      fuel_type: rawLabels.fuel_type.map((f) => f.toLowerCase()),
      origin: rawLabels.origin.map((o) => o.toLowerCase()),
      sector: rawLabels.sector.map((s) => s.toLowerCase()),
      seller_city: rawLabels.seller_city.map((s) => s.toLowerCase()),
      transmission: rawLabels.transmission.map((t) => t.toLowerCase()),
    };
  }, [rawLabels]);

  const [predictedPrice, setPredictedPrice] = useState(null);
  const [predictionLoading, setPredictionLoading] = useState(false);
  const [predictionError, setPredictionError] = useState(null);

  const BASE_URL = API_BASE_URL;

  useEffect(() => {
    if (labelsError) setError(labelsError);
  }, [labelsError]);

  useEffect(() => {
    const loadCarDetails = async () => {
      try {
        setLoading(true);

        const carResponse = await carService.get(carId);
        const carData = carResponse.data.car;

        if (!carData || typeof carData !== 'object' || !carData.brand || !carData.model) {
          throw new Error('Invalid or missing car data in response');
        }

        const normalizedCar = {
          id: carData.id || carId,
          brand: carData.brand ? String(carData.brand).toLowerCase() : '',
          model: carData.model ? String(carData.model).toLowerCase() : '',
          year: carData.year ? String(carData.year) : '',
          mileage: carData.mileage ? String(carData.mileage) : '0',
          fuel_type: carData.fuel_type ? String(carData.fuel_type).toLowerCase() : '',
          transmission: carData.transmission ? String(carData.transmission).toLowerCase() : '',
          fiscal_power: carData.fiscal_power ? String(carData.fiscal_power).replace(' CV', '') : '',
          door_count: carData.door_count ? String(carData.door_count) : '',
          first_owner: carData.first_owner ? (carData.first_owner === 'Oui' || carData.first_owner === 'Yes' ? 'Oui' : 'Non') : '',
          origin: carData.origin ? String(carData.origin).toLowerCase() : '',
          seller_city: carData.seller_city ? String(carData.seller_city).toLowerCase() : '',
          sector: carData.sector ? String(carData.sector).toLowerCase() : '',
          equipment: carData.equipment || '',
          condition: carData.condition ? String(carData.condition).toLowerCase().replace(/\s+/g, '_') : '',
          price: carData.price || null,
          title: carData.title || `${carData.brand} ${carData.model}`,
          publication_date: carData.publication_date || '',
          image_folder: carData.image_folder || 'default'
        };
        setCar(normalizedCar);

        if (normalizedCar.image_folder) {
          const loadedImages = [];
          const maxImages = 5;
          for (let index = 1; index <= maxImages; index++) {
            const imageUrl = `${BASE_URL}/images/cars/${normalizedCar.image_folder}/image_${index}.jpg`;
            try {
              await carService.imageHead(imageUrl);
              loadedImages.push(imageUrl);
            } catch (err) {
              break;
            }
          }
          setImages(loadedImages.length > 0 ? loadedImages : [`${BASE_URL}/images/cars/default/image_1.jpg`]);
        } else {
          setImages([`${BASE_URL}/images/cars/default/image_1.jpg`]);
        }

        if (user) {
          try {
            const favoritesResponse = await favoriteService.list(user.token);
            const favoriteCars = favoritesResponse.data.cars || [];
            setIsFavorite(favoriteCars.some((favCar) => favCar.id === carId));
          } catch (favError) {
            console.warn('Failed to fetch favorites:', favError.message);
          }
        }

        if (user) {
          try {
            await carService.recordView(
              { userId: user.userId, carId, viewSource: 'detail_page' },
              user.token
            );
          } catch (viewError) {
            console.warn('Failed to log car view:', viewError.message);
          }
        }

        const similarResponse = await carService.list({ brand: normalizedCar.brand, model: normalizedCar.model, limit: 3 });
        const similar = similarResponse.data.cars
          .filter((similarCar) => similarCar.id !== carId)
          .map((similarCar) => ({
            ...similarCar,
            image_url: similarCar.image_folder
              ? `${BASE_URL}/images/cars/${similarCar.image_folder}/image_1.jpg`
              : `${BASE_URL}/images/cars/default/image_1.jpg`,
          }));
        setSimilarCars(similar);

        setLoading(false);
      } catch (err) {
        setError(`Failed to load car details: ${err.message}`);
        setLoading(false);
        console.error('Error loading car details:', err.message, err.stack);
      }
    };

    loadCarDetails();
  }, [carId, user]);

  useEffect(() => {
    if (!car || labelsLoading || !labels || predictionLoading || predictedPrice || predictionError) return;

    const predictPrice = async () => {
      const requiredFields = ['brand', 'model', 'mileage', 'fuel_type', 'transmission', 'fiscal_power'];
      for (const field of requiredFields) {
        if (!car[field]) {
          setPredictionError(`Missing required field: ${field}`);
          return;
        }
      }

      const mileageValue = parseFloat(car.mileage);
      if (isNaN(mileageValue) || mileageValue > 999999) {
        setPredictionError('Mileage must be a number and cannot exceed 999,999 km (6 digits).');
        return;
      }

      const normalizedBrand = car.brand.toLowerCase().replace(' ', '-');
      const normalizedModel = car.model.toLowerCase();
      const normalizedYear = car.year ? String(car.year) : '';

      const validatedBrand = Object.keys(labels.brands).includes(normalizedBrand) ? normalizedBrand : 'unknown';
      const validatedModel = labels.brands[validatedBrand]?.models[normalizedModel] ? normalizedModel : 'unknown';

      let validatedYear;
      if (!normalizedYear || isNaN(parseInt(normalizedYear))) {
        const availableYears = labels.brands[validatedBrand]?.models[validatedModel] || [];
        if (availableYears.length === 0) {
          validatedYear = 2015;
        } else {
          const currentYear = new Date().getFullYear();
          const sortedYears = availableYears.map(year => parseInt(year)).sort((a, b) => b - a);
          validatedYear = sortedYears.find(year => year <= currentYear) || sortedYears[sortedYears.length - 1] || 2015;
        }
      } else {
        validatedYear = labels.brands[validatedBrand]?.models[validatedModel]?.includes(normalizedYear)
          ? parseInt(normalizedYear)
          : 2015;
      }

      const validatedFuelType = labels.fuel_type.includes(car.fuel_type.toLowerCase()) ? car.fuel_type.toLowerCase() : 'diesel';
      const validatedTransmission = labels.transmission.includes(car.transmission.toLowerCase()) ? car.transmission.toLowerCase() : 'manuelle';
      const validatedFiscalPower = labels.fiscal_power.includes(car.fiscal_power) ? parseInt(car.fiscal_power) : 6;
      const validatedDoorCount = labels.door_count.includes(car.door_count) ? parseInt(car.door_count) : 4;
      const validatedFirstOwner = labels.first_owner.includes(car.first_owner) ? car.first_owner : 'Non';
      const validatedOrigin = labels.origin.includes(car.origin.toLowerCase()) ? car.origin.toLowerCase().replace('ww au maroc', 'ww_au_maroc') : 'ww_au_maroc';
      const validatedSellerCity = labels.seller_city.includes(car.seller_city.toLowerCase()) ? car.seller_city.toLowerCase() : 'casablanca';
      const validatedSector = labels.sector.includes(car.sector.toLowerCase()) ? car.sector.toLowerCase() : 'particulier';
      const validatedCondition = labels.condition.includes(car.condition.toLowerCase()) ? car.condition.toLowerCase() : 'tres_bon';

      const equipmentList = car.equipment
        ? car.equipment.toLowerCase().split(',').map(item => item.trim().replace(/\s+/g, '_').replace('à_distance', ''))
        : [];
      const equipmentData = labels.equipment.reduce((acc, item) => {
        acc[item] = equipmentList.includes(item);
        return acc;
      }, {});
      const combinedEquipment = Object.entries(equipmentData)
        .filter(([_, isSelected]) => isSelected)
        .map(([key, _]) => key.replace('_', ' '))
        .join(', ');

      setPredictionLoading(true);
      setPredictionError(null);

      try {
        const predictionData = {
          userId: user?.userId || 'anonymous',
          brand: validatedBrand,
          model: validatedModel,
          condition: validatedCondition,
          year: validatedYear,
          mileage: mileageValue,
          fuel_type: validatedFuelType,
          transmission: validatedTransmission,
          fiscal_power: validatedFiscalPower,
          door_count: validatedDoorCount,
          first_owner: validatedFirstOwner,
          origin: validatedOrigin,
          seller_city: validatedSellerCity,
          sector: validatedSector,
          equipment: combinedEquipment,
          publication_date: car.publication_date || '12/05/2025 12:16',
        };

        const response = await predictionService.predictML(predictionData);
        const predictedPriceValue = response.data.prediction.predictedPrice;
        setPredictedPrice(predictedPriceValue);
      } catch (error) {
        console.error('Prediction error details:', {
          message: error.message,
          response: error.response ? error.response.data : 'No response',
        });
        setPredictionError('Failed to predict price. Please try again.');
      } finally {
        setPredictionLoading(false);
      }
    };

    predictPrice();
  }, [car, user, labelsLoading, labels]);

  const handleFavoriteToggle = async () => {
    if (!user) {
      setError('Please log in to save vehicles.');
      return;
    }

    try {
      if (isFavorite) {
        await favoriteService.remove(carId, user.token);
        setIsFavorite(false);
      } else {
        await favoriteService.add(carId, user.token);
        setIsFavorite(true);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      setError('Failed to update favorites. Please try again.');
    }
  };

  const handleShareClick = () => {
    if (navigator.share) {
      navigator
        .share({
          title: car?.title || 'Car Details',
          text: `Check out this ${car?.brand || ''} ${car?.model || ''}!`,
          url: window.location.href,
        })
        .catch((error) => console.log('Error sharing', error));
    } else {
      navigator.clipboard
        .writeText(window.location.href)
        .then(() => alert('Link copied to clipboard!'))
        .catch((err) => console.error('Failed to copy link: ', err));
    }
  };

  if (loading || labelsLoading || !labels) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error || !car || !car.brand || !car.model) {
    return (
      <div className="container py-5 text-center">
        <div className="alert alert-danger d-inline-block">
          {error || 'Car not found or incomplete data!'}
        </div>
        <div>
          <Link to="/" className="btn btn-accent rounded-pill px-4">
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  const badges = [
    { icon: <FaCalendarDays />, text: car.year || 'N/A' },
    { icon: <FaGaugeHigh />, text: `${(car.mileage || 0).toLocaleString()} km` },
    { icon: <FaGasPump />, text: car.fuel_type || 'N/A' },
    { icon: <FaDoorOpen />, text: `${car.door_count || 'N/A'} doors` },
  ];

  const specRows = [
    ['Brand', car.brand],
    ['Model', car.model],
    ['Year', car.year || 'N/A'],
    ['Mileage', `${(car.mileage || 0).toLocaleString()} km`],
    ['Fuel Type', car.fuel_type || 'N/A'],
    ['Transmission', car.transmission || 'N/A'],
    ['Door Count', car.door_count || 'N/A'],
    ['Fiscal Power', car.fiscal_power ? `${car.fiscal_power} CV` : 'N/A'],
    ['Condition', car.condition ? car.condition.replace(/_/g, ' ') : 'N/A'],
    ['First Owner', car.first_owner || 'N/A'],
    ['Origin', (car.origin || 'N/A').replace(/_/g, ' ')],
    ['Sector', (car.sector || 'N/A').replace(/_/g, ' ')],
  ];

  const equipmentList = (car.equipment || '').split(', ').filter(Boolean);

  return (
    <div className="container py-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <Link to="/search" className="btn btn-ghost d-inline-flex align-items-center gap-2">
          <FaArrowLeft /> Back
        </Link>
        <div className="d-flex gap-2">
          <button
            className={`btn rounded-pill px-4 ${isFavorite ? 'btn-accent' : 'btn-ghost'}`}
            onClick={handleFavoriteToggle}
          >
            {isFavorite ? <FaHeart className="me-2" style={{ color: '#101014' }} /> : <FaRegHeart className="me-2" />}
            {isFavorite ? 'Saved' : 'Save'}
          </button>
          <button className="btn btn-ghost rounded-pill px-4" onClick={handleShareClick}>
            <FaShare className="me-2" /> Share
          </button>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-lg-7">
          <div className="surface overflow-hidden" style={{ borderRadius: 22 }}>
            <div className="position-relative">
              <img
                src={images[0]}
                alt={car.title}
                className="w-100"
                style={{ height: 'min(440px, 55vw)', objectFit: 'cover' }}
              />
              {car.condition === 'new' && (
                <span className="position-absolute badge badge-success m-3" style={{ left: 0, top: 0 }}>
                  New
                </span>
              )}
            </div>

            {images.length > 1 && (
              <div className="d-flex overflow-auto gap-2 p-3">
                {images.map((image, index) => (
                  <button
                    key={index}
                    className="border-0 p-0 overflow-hidden"
                    style={{
                      width: 90,
                      height: 64,
                      borderRadius: 10,
                      cursor: 'pointer',
                      opacity: index === 0 ? 1 : 0.65,
                      transition: 'opacity 0.2s',
                    }}
                    onClick={() => {
                      setImages((prev) => {
                        const reordered = [prev[index], ...prev.filter((_, i) => i !== index)];
                        return reordered;
                      });
                    }}
                  >
                    <img src={image} alt={`${car.title} thumbnail ${index + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="col-lg-5">
          <div className="surface p-4 mb-4" style={{ borderRadius: 22 }}>
            <h1 className="fw-bold mb-3" style={{ fontSize: '1.6rem', letterSpacing: '-0.02em' }}>{car.title}</h1>

            <div className="d-flex flex-wrap gap-2 mb-4">
              {badges.map((badge, i) => (
                <span key={i} className="pill">
                  {badge.icon} {badge.text}
                </span>
              ))}
            </div>

            <div className="d-flex align-items-baseline justify-content-between mb-4">
              <div>
                <div className="fw-bold" style={{ fontSize: '1.9rem', color: 'var(--nr-accent)', letterSpacing: '-0.02em' }}>
                  {car.price != null ? `${car.price.toLocaleString()} MAD` : 'Price not specified'}
                </div>
                {car.price != null && <small style={{ color: 'var(--nr-text-faint)' }}>TTC</small>}
              </div>
              <span className="d-inline-flex align-items-center gap-1" style={{ color: 'var(--nr-text-muted)', fontSize: '0.9rem' }}>
                <FaLocationDot style={{ color: 'var(--nr-accent)' }} /> {car.seller_city || 'N/A'}
              </span>
            </div>

            <div
              className="mb-4"
              style={{ borderRadius: 14, background: 'var(--nr-bg-soft)', border: '1px solid rgba(245,179,1,0.3)', padding: 16 }}
            >
              <div className="d-flex align-items-center gap-2 mb-2">
                <FaRobot style={{ color: 'var(--nr-accent)' }} />
                <span className="fw-bold" style={{ fontSize: '0.9rem' }}>AI Price Analysis</span>
              </div>
              {predictionLoading ? (
                <p className="mb-0 d-flex align-items-center gap-2" style={{ color: 'var(--nr-text-muted)' }}>
                  <span className="spinner-border spinner-border-sm" /> Computing predicted price...
                </p>
              ) : predictionError ? (
                <p className="mb-0" style={{ color: 'var(--nr-danger)', fontSize: '0.85rem' }}>{predictionError}</p>
              ) : predictedPrice ? (
                <p className="mb-0" style={{ color: 'var(--nr-success)', fontWeight: 600 }}>
                  Predicted market value: <strong>{predictedPrice.toLocaleString()} MAD</strong>
                </p>
              ) : null}
            </div>

            <div className="d-grid gap-2">
              <a href="tel:+212600000000" className="btn btn-accent btn-lg rounded-pill">
                Contact Seller
              </a>
              <a href="/predict" className="btn btn-ghost rounded-pill">
                Get an exact price prediction
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="surface p-4 mt-4" style={{ borderRadius: 22 }}>
        <ul className="nav nav-tabs mb-4" id="carDetailsTabs" role="tablist">
          <li className="nav-item" role="presentation">
            <button className={`nav-link ${activeTab === 'description' ? 'active' : ''}`} onClick={() => setActiveTab('description')} type="button">
              Description
            </button>
          </li>
          <li className="nav-item" role="presentation">
            <button className={`nav-link ${activeTab === 'features' ? 'active' : ''}`} onClick={() => setActiveTab('features')} type="button">
              Features
            </button>
          </li>
          <li className="nav-item" role="presentation">
            <button className={`nav-link ${activeTab === 'technical' ? 'active' : ''}`} onClick={() => setActiveTab('technical')} type="button">
              Technical Specs
            </button>
          </li>
        </ul>

        <div className="tab-content">
          {activeTab === 'description' && (
            <div>
              <h5 className="fw-bold mb-3">About this {car.brand} {car.model}</h5>
              <p style={{ color: 'var(--nr-text-muted)', lineHeight: 1.8 }}>
                This {car.year || 'N/A'} {car.brand} {car.model} comes with {car.transmission || 'N/A'} transmission and a{' '}
                {(car.fuel_type || '').toLowerCase()} engine. With {(car.mileage || 0).toLocaleString()} kilometers on the odometer,
                this vehicle is in {(car.condition || '').replace(/_/g, ' ')} condition.
              </p>
              <p style={{ color: 'var(--nr-text-muted)', lineHeight: 1.8 }}>
                The vehicle is {car.first_owner === 'Oui' ? 'first-hand' : 'not first-hand'} and its origin is{' '}
                {(car.origin || '').replace(/_/g, ' ')}. It was published on{' '}
                {car.publication_date
                  ? new Date(car.publication_date).toLocaleDateString()
                  : 'an unknown date'}
                .
              </p>
              <p style={{ color: 'var(--nr-text-muted)', lineHeight: 1.8 }}>
                This {car.brand} {car.model} is listed by a {(car.sector || '').replace(/_/g, ' ')} seller located in{' '}
                {car.seller_city || 'N/A'}.
              </p>
            </div>
          )}

          {activeTab === 'features' && (
            <div>
              <h5 className="fw-bold mb-3">Equipment and Features</h5>
              {equipmentList.length > 0 ? (
                <div className="row row-cols-2 row-cols-md-3 g-3">
                  {equipmentList.map((item, index) => (
                    <div key={index} className="d-flex align-items-center gap-2">
                      <span
                        className="d-inline-flex align-items-center justify-content-center rounded-circle"
                        style={{ width: 22, height: 22, background: 'var(--nr-accent-soft)', color: 'var(--nr-accent)' }}
                      >
                        <FaCheck size={11} />
                      </span>
                      <span style={{ color: 'var(--nr-text-muted)' }}>{item}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: 'var(--nr-text-faint)' }}>No equipment details available for this vehicle.</p>
              )}
            </div>
          )}

          {activeTab === 'technical' && (
            <div>
              <h5 className="fw-bold mb-3">Technical Specifications</h5>
              <div className="row g-3">
                {specRows.map(([label, value]) => (
                  <div className="col-md-6" key={label}>
                    <div
                      className="d-flex justify-content-between align-items-center px-3 py-2"
                      style={{ background: 'var(--nr-bg-soft)', borderRadius: 12, border: '1px solid var(--nr-border)' }}
                    >
                      <span style={{ color: 'var(--nr-text-muted)' }}>{label}</span>
                      <span className="fw-semibold" style={{ color: 'var(--nr-text)' }}>{value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {similarCars.length > 0 && (
        <div className="mt-5">
          <div className="d-flex align-items-end justify-content-between mb-4">
            <div>
              <span className="section-eyebrow">Keep browsing</span>
              <h4 className="fw-bold mb-0">Similar Vehicles You Might Like</h4>
            </div>
          </div>
          <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
            {similarCars.map((similarCar) => (
              <div key={similarCar.id} className="col">
                <div
                  className="card h-100 border-0 overflow-hidden"
                  style={{ borderRadius: 18, border: '1px solid var(--nr-border)', transition: 'transform 0.25s ease, border-color 0.25s ease' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-5px)';
                    e.currentTarget.style.borderColor = 'rgba(245,179,1,0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.borderColor = 'var(--nr-border)';
                  }}
                >
                  <div style={{ height: 190, overflow: 'hidden', background: 'var(--nr-bg-soft)' }}>
                    <img
                      src={similarCar.image_url}
                      className="w-100"
                      alt={similarCar.title}
                      style={{ height: '100%', objectFit: 'cover' }}
                      onError={(e) => { e.currentTarget.src = `${BASE_URL}/images/cars/default/image_1.jpg`; }}
                    />
                  </div>
                  <div className="card-body d-flex flex-column p-3">
                    <h6 className="fw-bold mb-1" style={{ fontSize: '0.95rem' }}>{similarCar.title}</h6>
                    <p className="mb-3" style={{ color: 'var(--nr-text-faint)', fontSize: '0.82rem' }}>
                      {similarCar.year || 'N/A'} • {(similarCar.mileage || 0).toLocaleString()} km • {similarCar.fuel_type || 'N/A'}
                    </p>
                    <div className="d-flex justify-content-between align-items-center mt-auto pt-2" style={{ borderTop: '1px solid var(--nr-border)' }}>
                      <span className="fw-bold" style={{ color: 'var(--nr-accent)' }}>
                        {similarCar.price != null ? `${similarCar.price.toLocaleString()} MAD` : 'Price N/A'}
                      </span>
                      <Link to={`/car/${similarCar.id}`} className="text-decoration-none fw-semibold" style={{ color: 'var(--nr-text-muted)', fontSize: '0.85rem' }}>
                        View Details
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default CarDetailsPage;
