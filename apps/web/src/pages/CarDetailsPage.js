import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FaArrowLeft, FaHeart, FaRegHeart, FaShare, FaMapMarkerAlt, FaCalendarAlt, FaTachometerAlt, FaGasPump, FaDoorOpen, FaCog } from 'react-icons/fa';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL, ML_BASE_URL } from '../config';

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
  const [labels, setLabels] = useState({
    brands: {},
    condition: [],
    door_count: [],
    equipment: [],
    first_owner: [],
    fiscal_power: [],
    fuel_type: [],
    origin: [],
    sector: [],
    seller_city: [],
    transmission: []
  });
  const [isLabelsLoading, setIsLabelsLoading] = useState(true);

  const [predictedPrice, setPredictedPrice] = useState(null);
  const [predictionLoading, setPredictionLoading] = useState(false);
  const [predictionError, setPredictionError] = useState(null);

  const BASE_URL = API_BASE_URL;

  useEffect(() => {
    fetch('/labels_p.json')
      .then(response => response.json())
      .then(data => {
        const normalizedBrands = {};
        for (const brand in data.brands) {
          normalizedBrands[brand.toLowerCase()] = {
            models: Object.keys(data.brands[brand].models).reduce((acc, model) => {
              acc[model.toLowerCase()] = data.brands[brand].models[model].map(String);
              return acc;
            }, {})
          };
        }

        const updatedLabels = {
          ...data,
          brands: normalizedBrands,
          equipment: [
            "abs",
            "airbags",
            "caméra_de_recul",
            "climatisation",
            "esp",
            "jantes_aluminium",
            "limiteur_de_vitesse",
            "ordinateur_de_bord",
            "radar_de_recul",
            "régulateur_de_vitesse",
            "sièges_cuir",
            "toit_ouvrant",
            "verrouillage_centralisé",
            "vitres_électriques"
          ],
          condition: data.condition.map(c => c.toLowerCase().replace(/\s+/g, '_')),
          door_count: data.door_count.map(String),
          first_owner: data.first_owner.map(o => o === 'Oui' || o === 'Yes' ? 'Oui' : 'Non'),
          fiscal_power: data.fiscal_power.map(String),
          fuel_type: data.fuel_type.map(f => f.toLowerCase()),
          origin: data.origin.map(o => o.toLowerCase()),
          sector: data.sector.map(s => s.toLowerCase()),
          seller_city: data.seller_city.map(s => s.toLowerCase()),
          transmission: data.transmission.map(t => t.toLowerCase())
        };
        setLabels(updatedLabels);
        setIsLabelsLoading(false);
      })
      .catch(error => {
        console.error('Error loading labels:', error);
        setError('Failed to load form options.');
        setIsLabelsLoading(false);
      });
  }, []);

  useEffect(() => {
    const loadCarDetails = async () => {
      try {
        setLoading(true);

        const carResponse = await axios.get(`${BASE_URL}/api/cars/${carId}`);
        console.log('Car API response:', JSON.stringify(carResponse.data, null, 2));
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
        console.log('Normalized car data being passed to PredictionPage:', JSON.stringify(normalizedCar, null, 2));

        if (normalizedCar.image_folder) {
          const loadedImages = [];
          const maxImages = 5;
          for (let index = 1; index <= maxImages; index++) {
            const imageUrl = `${BASE_URL}/images/cars/${normalizedCar.image_folder}/image_${index}.jpg`;
            try {
              await axios.head(imageUrl);
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
            const favoritesResponse = await axios.get(`${BASE_URL}/api/users/favorites`, {
              headers: { Authorization: `Bearer ${user.token}` },
            });
            const favoriteCars = favoritesResponse.data.cars || [];
            setIsFavorite(favoriteCars.some((favCar) => favCar.id === carId));
          } catch (favError) {
            console.warn('Failed to fetch favorites:', favError.message);
          }
        }

        if (user) {
          try {
            await axios.post(
              `${BASE_URL}/api/cars/view`,
              { userId: user.userId, carId, viewSource: 'detail_page' },
              { headers: { Authorization: `Bearer ${user.token}` } }
            );
          } catch (viewError) {
            console.warn('Failed to log car view:', viewError.message);
          }
        }

        const similarResponse = await axios.get(`${BASE_URL}/api/cars`, {
          params: {
            brand: normalizedCar.brand,
            model: normalizedCar.model,
            limit: 3,
          },
        });
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
    if (!car || isLabelsLoading || predictionLoading || predictedPrice || predictionError) return;

    const predictPrice = async () => {
      console.log('Car data for prediction:', car);

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

      // Normalize and validate fields
      const normalizedBrand = car.brand.toLowerCase().replace(' ', '-'); // Adjust for labels_p.json format (e.g., "land rover" -> "land-rover")
      const normalizedModel = car.model.toLowerCase();
      const normalizedYear = car.year ? String(car.year) : '';

      const validatedBrand = Object.keys(labels.brands).includes(normalizedBrand) ? normalizedBrand : 'unknown';
      const validatedModel = labels.brands[validatedBrand]?.models[normalizedModel] ? normalizedModel : 'unknown';

      // Handle missing or invalid year
      let validatedYear;
      if (!normalizedYear || isNaN(parseInt(normalizedYear))) {
        const availableYears = labels.brands[validatedBrand]?.models[validatedModel] || [];
        if (availableYears.length === 0) {
          validatedYear = 2015; // Default fallback year if no years are available
        } else {
          // Sort years in descending order and select the most recent year <= current year (2025)
          const currentYear = new Date().getFullYear(); // 2025
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

      // Process equipment to match ml_service.py's EQUIPMENT_TYPES
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
          brand: validatedBrand, // "land-rover"
          model: validatedModel, // "range rover evoque"
          condition: validatedCondition, // "excellent" (adjusted to "tres_bon" if not in labels)
          year: validatedYear, // 2020 (or 2025 if year was missing)
          mileage: mileageValue, // 92499
          fuel_type: validatedFuelType, // "diesel"
          transmission: validatedTransmission, // "automatique"
          fiscal_power: validatedFiscalPower, // 8
          door_count: validatedDoorCount, // 5
          first_owner: validatedFirstOwner, // "Oui"
          origin: validatedOrigin, // "ww_au_maroc"
          seller_city: validatedSellerCity, // "aïn chock"
          sector: validatedSector, // "casablanca"
          equipment: combinedEquipment, // "" (since equipment is empty)
          publication_date: car.publication_date || '12/05/2025 12:16', // "12/05/2025 12:16"
        };

        console.log('Prediction request:', {
          url: `${ML_BASE_URL}/predict`,
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          data: predictionData,
        });

        const response = await axios.post(`${ML_BASE_URL}/predict`, predictionData);
        const predictedPriceValue = response.data.prediction.predictedPrice;
        setPredictedPrice(predictedPriceValue);
      } catch (error) {
        console.error('Prediction error details:', {
          message: error.message,
          response: error.response ? error.response.data : 'No response',
          status: error.response ? error.response.status : 'No status',
          request: error.request ? error.request : 'No request',
        });
        setPredictionError('Failed to predict price. Please try again.');
      } finally {
        setPredictionLoading(false);
      }
    };

    predictPrice();
  }, [car, user, isLabelsLoading, labels]);

  const handleFavoriteToggle = async () => {
    if (!user) {
      setError('Please log in to save vehicles.');
      return;
    }

    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      if (isFavorite) {
        await axios.delete(`${BASE_URL}/api/users/favorites`, {
          ...config,
          data: { carId },
        });
        setIsFavorite(false);
      } else {
        await axios.post(`${BASE_URL}/api/users/favorites`, { carId }, config);
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

  if (loading || isLabelsLoading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-warning" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error || !car || !car.brand || !car.model) {
    return (
      <div className="container py-5">
        <div className="alert alert-danger" role="alert">
          {error || 'Car not found or incomplete data!'}
        </div>
        <Link to="/" className="btn btn-warning">
          Return to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <nav aria-label="breadcrumb" className="mb-4">
        <ol className="breadcrumb">
          <li className="breadcrumb-item">
            <Link to="/">Home</Link>
          </li>
          <li className="breadcrumb-item">
            <Link to="/cars">Cars</Link>
          </li>
          <li className="breadcrumb-item">
            <Link to={`/cars/${car.brand.toLowerCase()}`}>{car.brand}</Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            {car.model}
          </li>
        </ol>
      </nav>

      <div className="d-flex justify-content-between align-items-center mb-4">
        <Link to="/" className="btn btn-light d-flex align-items-center">
          <FaArrowLeft className="me-2" /> Back
        </Link>
        <div>
          <button
            className="btn btn-light me-2"
            onClick={handleFavoriteToggle}
            aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            {isFavorite ? <FaHeart className="text-danger" /> : <FaRegHeart />}
          </button>
          <button className="btn btn-light" onClick={handleShareClick} aria-label="Share">
            <FaShare />
          </button>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-lg-7">
          <div className="card border-0 rounded-4 shadow-sm">
            <div className="card-body p-0">
              <div className="position-relative">
                <img
                  src={images[0]}
                  alt={car.title}
                  className="img-fluid rounded-top-4 w-100"
                  style={{ maxHeight: '400px', objectFit: 'cover' }}
                />
                {car.condition === 'New' && (
                  <span className="position-absolute top-0 start-0 bg-success text-white px-3 py-1 m-3 rounded-pill fw-bold">
                    New
                  </span>
                )}
              </div>

              <div className="d-flex overflow-auto p-3 gap-2">
                {images.map((image, index) => (
                  <img
                    key={index}
                    src={image}
                    alt={`${car.title} thumbnail ${index + 1}`}
                    className="img-thumbnail"
                    style={{ width: '100px', height: '70px', objectFit: 'cover', cursor: 'pointer' }}
                    onClick={() => setImages((prev) => [image, ...prev.filter((_, i) => i !== index)])}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-5">
          <div className="card border-0 rounded-4 shadow-sm mb-4">
            <div className="card-body">
              <h2 className="fw-bold mb-2">{car.title}</h2>
              <div className="d-flex mb-3">
                <span className="badge bg-light text-dark me-2">
                  <FaCalendarAlt className="me-1" /> {car.year || 'N/A'}
                </span>
                <span className="badge bg-light text-dark me-2">
                  <FaTachometerAlt className="me-1" /> {(car.mileage || 0).toLocaleString()} km
                </span>
                <span className="badge bg-light text-dark me-2">
                  <FaGasPump className="me-1" /> {car.fuel_type || 'N/A'}
                </span>
                <span className="badge bg-light text-dark">
                  <FaDoorOpen className="me-1" /> {car.door_count || 'N/A'} doors
                </span>
              </div>

              <div className="d-flex align-items-baseline mb-4">
                <h3 className="text-warning fw-bold mb-0">
                  {car.price != null ? `${car.price.toLocaleString()} MAD` : 'Price not specified'}
                </h3>
                {car.price != null && <small className="text-muted ms-2">TTC</small>}
              </div>

              <hr className="my-3" />

              <div className="d-flex align-items-center mb-3">
                <FaMapMarkerAlt className="text-muted me-2" />
                <span>{car.seller_city || 'N/A'}</span>
              </div>

              {predictionLoading && <p>Loading predicted price...</p>}
              {predictionError && <p className="text-danger">{predictionError}</p>}
              {predictedPrice && (
                <p className="text-success mb-4" style={{fontWeight :"600"}}>
                  Predicted Price: {predictedPrice.toLocaleString()} MAD
                </p>
              )}

              <div className="d-grid gap-3">
                <a href="tel:+212600000000" className="btn btn-warning btn-lg">
                  Contact Seller
                </a>
                <div className="card border-0 rounded-4 shadow-sm bg-warning bg-opacity-10">
                  <div className="card-body text-center py-4">
                    <h4 className="fw-bold mb-3">Price Analysis</h4>
                    <p className="mb-4">
                      The predicted price for this {car.brand} {car.model} has been calculated using our ML-powered tool.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 rounded-4 shadow-sm mt-4">
        <div className="card-body">
          <ul className="nav nav-tabs" id="carDetailsTabs" role="tablist">
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${activeTab === 'description' ? 'active' : ''}`}
                onClick={() => setActiveTab('description')}
                id="description-tab"
                type="button"
                role="tab"
              >
                Description
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${activeTab === 'features' ? 'active' : ''}`}
                onClick={() => setActiveTab('features')}
                id="features-tab"
                type="button"
                role="tab"
              >
                Features
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${activeTab === 'technical' ? 'active' : ''}`}
                onClick={() => setActiveTab('technical')}
                id="technical-tab"
                type="button"
                role="tab"
              >
                Technical Specs
              </button>
            </li>
          </ul>

          <div className="tab-content p-3" id="carDetailsTabsContent">
            <div
              className={`tab-pane fade ${activeTab === 'description' ? 'show active' : ''}`}
              role="tabpanel"
              aria-labelledby="description-tab"
            >
              <h5 className="mb-3">
                About this {car.brand} {car.model}
              </h5>
              <p>
                This {car.year || 'N/A'} {car.brand} {car.model} comes with {car.transmission || 'N/A'} transmission and a{' '}
                {(car.fuel_type || '').toLowerCase()} engine. With {(car.mileage || 0).toLocaleString()} kilometers on the odometer,
                this vehicle is in {(car.condition || '').toLowerCase().replace('_', ' ')} condition.
              </p>
              <p>
                The vehicle is {car.first_owner === 'Oui' ? 'first-hand' : 'not first-hand'} and its origin is{' '}
                {(car.origin || '').toLowerCase()}. It was published on{' '}
                {car.publication_date
                  ? new Date(car.publication_date).toLocaleDateString()
                  : 'Unknown date'}
                .
              </p>
              <p>
                This {car.brand} {car.model} is listed by a {(car.sector || '').toLowerCase()} seller located in{' '}
                {car.seller_city || 'N/A'}.
              </p>
            </div>

            <div
              className={`tab-pane fade ${activeTab === 'features' ? 'show active' : ''}`}
              role="tabpanel"
              aria-labelledby="features-tab"
            >
              <h5 className="mb-3">Equipment and Features</h5>
              <div className="row">
                {(car.equipment || '').split(', ').map((item, index) => (
                  <div key={index} className="col-md-4 mb-2">
                    <div className="d-flex align-items-center">
                      <FaCog className="text-warning me-2" />
                      <span>{item}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div
              className={`tab-pane fade ${activeTab === 'technical' ? 'show active' : ''}`}
              role="tabpanel"
              aria-labelledby="technical-tab"
            >
              <h5 className="mb-3">Technical Specifications</h5>
              <div className="row">
                <div className="col-md-6">
                  <table className="table">
                    <tbody>
                      <tr>
                        <th scope="row">Brand</th>
                        <td>{car.brand}</td>
                      </tr>
                      <tr>
                        <th scope="row">Model</th>
                        <td>{car.model}</td>
                      </tr>
                      <tr>
                        <th scope="row">Year</th>
                        <td>{car.year || 'N/A'}</td>
                      </tr>
                      <tr>
                        <th scope="row">Mileage</th>
                        <td>{(car.mileage || 0).toLocaleString()} km</td>
                      </tr>
                      <tr>
                        <th scope="row">Fuel Type</th>
                        <td>{car.fuel_type || 'N/A'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="col-md-6">
                  <table className="table">
                    <tbody>
                      <tr>
                        <th scope="row">Transmission</th>
                        <td>{car.transmission || 'N/A'}</td>
                      </tr>
                      <tr>
                        <th scope="row">Door Count</th>
                        <td>{car.door_count || 'N/A'}</td>
                      </tr>
                      <tr>
                        <th scope="row">Fiscal Power</th>
                        <td>{car.fiscal_power || 'N/A'} CV</td>
                      </tr>
                      <tr>
                        <th scope="row">Condition</th>
                        <td>{car.condition ? car.condition.replace('_', ' ') : 'N/A'}</td>
                      </tr>
                      <tr>
                        <th scope="row">First Owner</th>
                        <td>{car.first_owner || 'N/A'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {similarCars.length > 0 && (
        <div className="mt-5">
          <h4 className="fw-bold mb-4">Similar Vehicles You Might Like</h4>
          <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
            {similarCars.map((similarCar) => (
              <div key={similarCar.id} className="col">
                <div className="card h-100 rounded-4 border-0 shadow-sm">
                  <img
                    src={similarCar.image_url}
                    className="card-img-top p-3"
                    alt={similarCar.title}
                    style={{ height: '200px', objectFit: 'cover' }}
                  />
                  <hr className="m-0" />
                  <div className="card-body">
                    <h5 className="card-title fw-bold mb-1">{similarCar.title}</h5>
                    <p className="card-text text-muted small mb-3">
                      {similarCar.year || 'N/A'} • {(similarCar.mileage || 0).toLocaleString()} km • {similarCar.fuel_type || 'N/A'}
                    </p>
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="fw-bold">
                        {similarCar.price != null ? `${similarCar.price.toLocaleString()} MAD` : 'Price not specified'}
                      </span>
                      <Link to={`/car/${similarCar.id}`} className="text-decoration-none text-warning">
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