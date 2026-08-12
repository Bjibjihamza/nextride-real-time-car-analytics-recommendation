import React, { useState, useEffect, useRef } from 'react';
import { FaUser, FaEnvelope, FaMapMarkerAlt, FaCar, FaHeart, FaBell, FaCalendarAlt, FaEdit, FaSave, FaTimes } from 'react-icons/fa';
import { MdFavorite } from 'react-icons/md';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config';
import { Snackbar, Alert } from '@mui/material';

const UserProfilePage = () => {
  const { user, loading, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [preferences, setPreferences] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [activeTab, setActiveTab] = useState('profile');
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({ username: '', email: '', age: '', location: '' });
  const [preferencesData, setPreferencesData] = useState({
    preferred_brands: [],
    preferred_fuel_types: [],
    preferred_transmissions: [],
    budget_min: '',
    budget_max: '',
    mileage_min: '',
    mileage_max: '',
    preferred_years: [],
    preferred_door_count: [],
  });
  const [labels, setLabels] = useState({
    brands: [],
    fuel_types: [],
    transmissions: [],
    cities: [],
    years: [...Array(2025 - 1950 + 1).keys()].map(i => 1950 + i),
    door_counts: [3, 5, 7],
  });
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const profileRef = useRef(null);
  const preferencesRef = useRef(null);
  const favoritesRef = useRef(null);
  const recommendationsRef = useRef(null);

  const brandMap = Object.fromEntries(labels.brands.map(b => [b.toLowerCase(), b]));
  const fuelMap = Object.fromEntries(labels.fuel_types.map(f => [f.toLowerCase(), f]));
  const transmissionMap = Object.fromEntries(labels.transmissions.map(t => [t.toLowerCase(), t]));

  const DEFAULT_IMAGE = '/images/cars/default/image_1.jpg';
  const PLACEHOLDER_IMAGE = '/images/cars/placeholder.jpg';
  const BASE_URL = API_BASE_URL;

  // Fetch labels from labels.json
  useEffect(() => {
    const fetchLabels = async () => {
      try {
        const response = await fetch('/labels.json');
        if (!response.ok) {
          throw new Error('Failed to fetch labels');
        }
        const data = await response.json();
        setLabels(prev => ({
          ...prev,
          brands: data.brands || [],
          fuel_types: data.fuel_types || [],
          transmissions: data.transmissions || [],
          cities: data.cities || [],
        }));
      } catch (err) {
        setError('Error loading options. Please try again later.');
        console.error('Error fetching labels:', err);
      }
    };
    fetchLabels();
  }, []);

  const constructImageUrl = (car) => {
    if (car.image_url && car.image_url.startsWith('http')) return car.image_url;
    if (car.image && car.image.startsWith('http')) return car.image;
    const folderName = car.image_folder || (car.title || `${car.brand || ''} ${car.model || ''}`.trim()).toLowerCase().replace(/[^a-zA-Z0-9\s]/g, '_').replace(/\s+/g, '_');
    const imagePath = `/images/cars/${folderName}/image_1.jpg`;
    return `${BASE_URL}${imagePath}`;
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

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
      return;
    }

    const queryParams = new URLSearchParams(location.search);
    if (queryParams.get('favorites') === 'true') {
      setActiveTab('favorites');
      favoritesRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else if (queryParams.get('recommendations') === 'true') {
      setActiveTab('recommendations');
      recommendationsRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else if (queryParams.get('preferences') === 'true') {
      setActiveTab('preferences');
      preferencesRef.current?.scrollIntoView({ behavior: 'smooth' });
    }

    const fetchUserData = async () => {
      if (!user?.userId || !user?.token) {
        setError('Authentication error. Please log in again.');
        logout();
        navigate('/login');
        return;
      }
      try {
        const config = { headers: { Authorization: `Bearer ${user.token}` } };
        const userResponse = await axios.get(`${BASE_URL}/api/users`, config);
        const userData = userResponse.data.user;
        setUserData(userData);
        setFormData({ username: userData.username || '', email: userData.email || '', age: userData.age || '', location: userData.location || '' });

        const preferencesResponse = await axios.get(`${BASE_URL}/api/users/preferences`, config);
        const preferencesData = preferencesResponse.data.preferences || {};
        const normalizedPreferences = {
          preferred_brands: (preferencesData.preferred_brands || []).map(brand => brandMap[brand.toLowerCase()] || brand).filter(brand => labels.brands.includes(brand)),
          preferred_fuel_types: (preferencesData.preferred_fuel_types || []).map(fuel => fuelMap[fuel.toLowerCase()] || fuel).filter(fuel => labels.fuel_types.includes(fuel)),
          preferred_transmissions: (preferencesData.preferred_transmissions || []).map(trans => transmissionMap[trans.toLowerCase()] || trans).filter(trans => labels.transmissions.includes(trans)),
          budget_min: preferencesData.budget_min || '',
          budget_max: preferencesData.budget_max || '',
          mileage_min: preferencesData.mileage_min || '',
          mileage_max: preferencesData.mileage_max || '',
          preferred_years: (preferencesData.preferred_years || []).filter(year => labels.years.includes(year)),
          preferred_door_count: (preferencesData.preferred_door_count || []).filter(doors => labels.door_counts.includes(doors)),
        };
        setPreferences(normalizedPreferences);
        setPreferencesData(normalizedPreferences);

        const favoritesResponse = await axios.get(`${BASE_URL}/api/users/favorites`, config);
        const uniqueFavorites = Array.from(
          new Map(
            favoritesResponse.data.cars.map(car => [
              car.id || car.car_id,
              { ...car, id: car.id || car.car_id, imageSrc: constructImageUrl(car), title: car.title || `${car.brand || ''} ${car.model || ''}`.trim() || 'Unknown Car' }
            ])
          ).values()
        );
        setFavorites(uniqueFavorites);

        const recommendationsResponse = await axios.get(`${BASE_URL}/api/users/recommendations`, config);
        setRecommendations(recommendationsResponse.data.cars.map(car => ({ ...car, car_id: car.car_id || car.id, imageSrc: constructImageUrl(car), name: car.name || car.title || `${car.brand || ''} ${car.model || ''}`.trim() || 'Unknown Car' })));
      } catch (error) {
        console.error('Error fetching user data:', error);
        if (error.response?.status === 401) {
          setError('Session expired. Please log in again.');
          logout();
          navigate('/login');
        } else {
          setError('Failed to load profile data. Please try again.');
        }
      }
    };

    if (!loading && user) fetchUserData();
  }, [user, loading, navigate, location.search, logout, labels.brands, labels.fuel_types, labels.transmissions]);

  const handleInputChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handlePreferenceChange = (e) => {
    const { name, type, checked } = e.target;
    const [arrayName, itemValue] = name.split('-');
    if (type === 'checkbox') {
      setPreferencesData(prev => ({
        ...prev,
        [arrayName]: checked ? [...(prev[arrayName] || []), parseInt(itemValue) || itemValue] : (prev[arrayName] || []).filter(item => item !== (parseInt(itemValue) || itemValue))
      }));
    } else {
      setPreferencesData({ ...preferencesData, [name]: e.target.value });
    }
  };

  const handleSaveProfile = async () => {
    try {
      setError('');
      if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
        setError('Invalid email address');
        return;
      }
      if (formData.age && (formData.age < 18 || formData.age > 100)) {
        setError('Age must be between 18 and 100');
        return;
      }
      if (preferencesData.budget_min && preferencesData.budget_max && parseInt(preferencesData.budget_min) > parseInt(preferencesData.budget_max)) {
        setError('Minimum budget cannot exceed maximum budget');
        return;
      }
      if (preferencesData.mileage_min && preferencesData.mileage_max && parseInt(preferencesData.mileage_min) > parseInt(preferencesData.mileage_max)) {
        setError('Minimum mileage cannot exceed maximum mileage');
        return;
      }

      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      await axios.put(`${BASE_URL}/api/users`, {
        username: formData.username,
        email: formData.email,
        age: formData.age ? parseInt(formData.age) : undefined,
        location: formData.location || undefined,
      }, config);

      await axios.put(`${BASE_URL}/api/users/preferences`, {
        preferred_brands: preferencesData.preferred_brands,
        preferred_fuel_types: preferencesData.preferred_fuel_types,
        preferred_transmissions: preferencesData.preferred_transmissions,
        budget_min: preferencesData.budget_min ? parseInt(preferencesData.budget_min) : undefined,
        budget_max: preferencesData.budget_max ? parseInt(preferencesData.budget_max) : undefined,
        mileage_min: preferencesData.mileage_min ? parseInt(preferencesData.mileage_min) : undefined,
        mileage_max: preferencesData.mileage_max ? parseInt(preferencesData.mileage_max) : undefined,
        preferred_years: preferencesData.preferred_years,
        preferred_door_count: preferencesData.preferred_door_count,
      }, config);

      setUserData({ ...userData, ...formData });
      setPreferences(preferencesData);
      setEditMode(false);
      setSnackbar({ open: true, message: 'Profile updated successfully!', severity: 'success' });
    } catch (error) {
      console.error('Error saving profile:', error);
      setError(error.response?.data?.message || 'Failed to save profile.');
    }
  };

  const handleCancelEdit = () => {
    setFormData({ username: userData?.username || '', email: userData?.email || '', age: userData?.age || '', location: userData?.location || '' });
    setPreferencesData(preferences || {
      preferred_brands: [], preferred_fuel_types: [], preferred_transmissions: [],
      budget_min: '', budget_max: '', mileage_min: '', mileage_max: '',
      preferred_years: [], preferred_door_count: [],
    });
    setEditMode(false);
    setError('');
  };

  const handleTabChange = (tab, ref) => {
    setActiveTab(tab);
    ref.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleCloseSnackbar = () => setSnackbar({ ...snackbar, open: false });

  if (loading || !userData || !preferences) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border text-warning" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <span className="ms-2">Loading...</span>
      </div>
    );
  }

  const CarCard = ({ car, isFavorite, onSaveToggle, onDismiss }) => {
    const [imageSrc, setImageSrc] = useState(car.imageSrc || PLACEHOLDER_IMAGE);
    const isInFavorites = favorites.some(fav => fav.id === (car.car_id || car.id));
    const parsedDate = parseDate(car.publication_date);
    const isNew = parsedDate ? new Date() - parsedDate < 7 * 24 * 60 * 60 * 1000 : false;

    const handleImageError = (e) => {
      const currentSrc = e.target.src;
      if (currentSrc !== `${BASE_URL}${DEFAULT_IMAGE}` && currentSrc !== `${BASE_URL}${PLACEHOLDER_IMAGE}`) {
        setImageSrc(`${BASE_URL}${DEFAULT_IMAGE}`);
      } else if (currentSrc !== `${BASE_URL}${PLACEHOLDER_IMAGE}`) {
        setImageSrc(`${BASE_URL}${PLACEHOLDER_IMAGE}`);
      }
    };

    return (
      <div className="card h-100 border-0 shadow-sm rounded-3 overflow-hidden transition-all" style={{ transition: 'transform 0.2s', minHeight: '200px' }}>
        <div className="row g-0 h-100">
          <div className="col-4 position-relative">
            <img
              src={imageSrc}
              alt={car.title || car.name}
              className="img-fluid rounded-start"
              style={{ height: '100%', width: '100%', objectFit: 'cover' }}
              onError={handleImageError}
              loading="lazy"
            />
            <span className="position-absolute top-0 start-0 bg-dark bg-opacity-75 text-white px-2 py-1 rounded-bottom-end w-100" style={{ fontSize: '0.85rem' }}>
              {car.price ? `${car.price.toLocaleString()} DH` : 'Price N/A'}
            </span>
            {isNew && (
              <span className="position-absolute top-0 end-0 bg-warning text-dark px-2 py-1 rounded-bottom-start" style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>
                New
              </span>
            )}
          </div>
          <div className="col-8 d-flex flex-column">
            <div className="card-body p-3 d-flex flex-column justify-content-between">
              <div>
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <h5 className="card-title mb-0 text-truncate" style={{ fontSize: '1rem' }}>{car.title || car.name}</h5>
                  <button
                    className="btn btn-sm p-0 border-0"
                    style={{ color: isInFavorites ? '#dc3545' : '#6c757d' }}
                    onClick={() => onSaveToggle(car.car_id || car.id, !isInFavorites)}
                  >
                    <FaHeart size={16} />
                  </button>
                </div>
                <p className="text-muted small mb-2">{car.year ? `${car.year} • ${car.fuel_type || 'N/A'}` : 'N/A'}</p>
                {car.recommendation_reason && (
                  <p className="text-muted small mb-3" style={{ fontSize: '0.85rem' }}>
                    {car.recommendation_reason}
                  </p>
                )}
              </div>
              <div className="d-grid gap-2">
                <Link
                  to={`/car/${car.car_id || car.id}`}
                  className="btn btn-warning btn-sm w-100"
                >
                  View Details
                </Link>
                {onDismiss && (
                  <button
                    className="btn btn-outline-danger btn-sm w-100 d-flex align-items-center justify-content-center"
                    onClick={() => onDismiss(car.car_id || car.id)}
                  >
                    <FaTimes className="me-1" /> Not Interested
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="container py-5">
      {error && (
        <div className="alert alert-danger d-flex align-items-center mb-4">
          <FaTimes className="me-2" />
          {error}
        </div>
      )}
      <div className="row">
        <div className="col-lg-3 mb-4">
          <div className="card shadow rounded-3 overflow-hidden">
            <div className="card-body p-0">
              <div className="bg-warning p-4 text-center">
                <div className="bg-white rounded-circle p-3 d-inline-flex mb-3" style={{ width: '100px', height: '100px', alignItems: 'center', justifyContent: 'center' }}>
                  <FaUser size={50} className="text-warning" />
                </div>
                <h5 className="text-white mb-1">{userData.username}</h5>
                <p className="text-white mb-0">Member since {new Date(userData.created_at).toLocaleDateString()}</p>
              </div>
              <div className="list-group list-group-flush">
                <button
                  className={`list-group-item list-group-item-action d-flex align-items-center ${activeTab === 'profile' ? 'active bg-warning text-white' : ''}`}
                  onClick={() => handleTabChange('profile', profileRef)}
                >
                  <FaUser className="me-3" /> Profile Information
                </button>
                <button
                  className={`list-group-item list-group-item-action d-flex align-items-center ${activeTab === 'preferences' ? 'active bg-warning text-white' : ''}`}
                  onClick={() => handleTabChange('preferences', preferencesRef)}
                >
                  <FaCar className="me-3" /> Car Preferences
                </button>
                <button
                  className={`list-group-item list-group-item-action d-flex align-items-center ${activeTab === 'favorites' ? 'active bg-warning text-white' : ''}`}
                  onClick={() => handleTabChange('favorites', favoritesRef)}
                >
                  <FaHeart className="me-3" /> Saved Cars
                </button>
                <button
                  className={`list-group-item list-group-item-action d-flex align-items-center ${activeTab === 'recommendations' ? 'active bg-warning text-white' : ''}`}
                  onClick={() => handleTabChange('recommendations', recommendationsRef)}
                >
                  <FaBell className="me-3" /> Recommendations
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="col-lg-9">
          <div className="card shadow rounded-3 p-4">
            <div ref={profileRef}>
              {activeTab === 'profile' && (
                <>
                  <h4 className="mb-4 fw-bold">Profile Information</h4>
                  <div className="d-flex justify-content-between align-items-center mb-4">
                    {!editMode ? (
                      <button
                        className="btn btn-outline-warning rounded-pill px-4"
                        onClick={() => setEditMode(true)}
                      >
                        <FaEdit className="me-2" /> Edit Profile
                      </button>
                    ) : (
                      <div>
                        <button
                          className="btn btn-warning rounded-pill me-2"
                          onClick={handleSaveProfile}
                        >
                          <FaSave className="me-2" /> Save
                        </button>
                        <button
                          className="btn btn-outline-secondary rounded-pill"
                          onClick={handleCancelEdit}
                        >
                          <FaTimes className="me-2" /> Cancel
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label htmlFor="username" className="form-label text-muted">Username</label>
                      {!editMode ? (
                        <div className="input-group">
                          <span className="input-group-text bg-light">
                            <FaUser className="text-muted" />
                          </span>
                          <input type="text" className="form-control bg-light" value={userData.username} readOnly />
                        </div>
                      ) : (
                        <div className="input-group">
                          <span className="input-group-text">
                            <FaUser className="text-muted" />
                          </span>
                          <input
                            type="text"
                            className="form-control"
                            id="username"
                            name="username"
                            value={formData.username}
                            onChange={handleInputChange}
                          />
                        </div>
                      )}
                    </div>
                    <div className="col-md-6 mb-3">
                      <label htmlFor="email" className="form-label text-muted">Email</label>
                      {!editMode ? (
                        <div className="input-group">
                          <span className="input-group-text bg-light">
                            <FaEnvelope className="text-muted" />
                          </span>
                          <input type="text" className="form-control bg-light" value={userData.email} readOnly />
                        </div>
                      ) : (
                        <div className="input-group">
                          <span className="input-group-text">
                            <FaEnvelope className="text-muted" />
                          </span>
                          <input
                            type="email"
                            className="form-control"
                            id="email"
                            name="email"
                            value={formData.email}
                            onChange={handleInputChange}
                          />
                        </div>
                      )}
                    </div>
                    <div className="col-md-6 mb-3">
                      <label htmlFor="age" className="form-label text-muted">Age</label>
                      {!editMode ? (
                        <div className="input-group">
                          <span className="input-group-text bg-light">
                            <FaCalendarAlt className="text-muted" />
                          </span>
                          <input type="text" className="form-control bg-light" value={userData.age || 'Not specified'} readOnly />
                        </div>
                      ) : (
                        <div className="input-group">
                          <span className="input-group-text">
                            <FaCalendarAlt className="text-muted" />
                          </span>
                          <input
                            type="number"
                            className="form-control"
                            id="age"
                            name="age"
                            value={formData.age}
                            onChange={handleInputChange}
                            min="18"
                            max="100"
                          />
                        </div>
                      )}
                    </div>
                    <div className="col-md-6 mb-3">
                      <label htmlFor="location" className="form-label text-muted">Location</label>
                      {!editMode ? (
                        <div className="input-group">
                          <span className="input-group-text bg-light">
                            <FaMapMarkerAlt className="text-muted" />
                          </span>
                          <input type="text" className="form-control bg-light" value={userData.location || 'Not specified'} readOnly />
                        </div>
                      ) : (
                        <div className="input-group">
                          <span className="input-group-text">
                            <FaMapMarkerAlt className="text-muted" />
                          </span>
                          <select
                            className="form-select"
                            id="location"
                            name="location"
                            value={formData.location}
                            onChange={handleInputChange}
                          >
                            <option value="">Select your city</option>
                            {labels.cities.map(city => <option key={city} value={city}>{city}</option>)}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
            <div ref={preferencesRef}>
              {activeTab === 'preferences' && (
                <>
                  <h4 className="mb-4 fw-bold">Car Preferences</h4>
                  <div className="d-flex justify-content-between align-items-center mb-4">
                    {!editMode ? (
                      <button
                        className="btn btn-outline-warning rounded-pill px-4"
                        onClick={() => setEditMode(true)}
                      >
                        <FaEdit className="me-2" /> Edit Preferences
                      </button>
                    ) : (
                      <div>
                        <button
                          className="btn btn-warning rounded-pill me-2"
                          onClick={handleSaveProfile}
                        >
                          <FaSave className="me-2" /> Save
                        </button>
                        <button
                          className="btn btn-outline-secondary rounded-pill"
                          onClick={handleCancelEdit}
                        >
                          <FaTimes className="me-2" /> Cancel
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="mb-4">
                    <h5 className="mb-3">Preferred Brands</h5>
                    {!editMode ? (
                      <div className="d-flex flex-wrap gap-2">
                        {preferences.preferred_brands && preferences.preferred_brands.length > 0 ? (
                          preferences.preferred_brands.map(brand => (
                            <span key={brand} className="badge bg-light text-dark py-2 px-3 rounded-pill">
                              {brand}
                            </span>
                          ))
                        ) : (
                          <p className="text-muted">No preferred brands selected</p>
                        )}
                      </div>
                    ) : (
                      <div className="row row-cols-2 row-cols-md-3 g-2">
                        {labels.brands.map(brand => (
                          <div key={brand} className="col">
                            <div className="form-check">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                id={`brand-${brand.replace(/[^a-zA-Z0-9]/g, '')}`}
                                name={`preferred_brands-${brand}`}
                                checked={preferencesData.preferred_brands.includes(brand)}
                                onChange={handlePreferenceChange}
                              />
                              <label className="form-check-label" htmlFor={`brand-${brand.replace(/[^a-zA-Z0-9]/g, '')}`}>
                                {brand}
                              </label>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="mb-4">
                    <h5 className="mb-3">Fuel Types</h5>
                    {!editMode ? (
                      <div className="d-flex flex-wrap gap-2">
                        {preferences.preferred_fuel_types && preferences.preferred_fuel_types.length > 0 ? (
                          preferences.preferred_fuel_types.map(fuel => (
                            <span key={fuel} className="badge bg-light text-dark py-2 px-3 rounded-pill">
                              {fuel}
                            </span>
                          ))
                        ) : (
                          <p className="text-muted">No preferred fuel types selected</p>
                        )}
                      </div>
                    ) : (
                      <div className="row row-cols-2 row-cols-md-3 g-2">
                        {labels.fuel_types.map(fuel => (
                          <div key={fuel} className="col">
                            <div className="form-check">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                id={`fuel-${fuel}`}
                                name={`preferred_fuel_types-${fuel}`}
                                checked={preferencesData.preferred_fuel_types.includes(fuel)}
                                onChange={handlePreferenceChange}
                              />
                              <label className="form-check-label" htmlFor={`fuel-${fuel}`}>
                                {fuel}
                              </label>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="mb-4">
                    <h5 className="mb-3">Transmission</h5>
                    {!editMode ? (
                      <div className="d-flex flex-wrap gap-2">
                        {preferences.preferred_transmissions && preferences.preferred_transmissions.length > 0 ? (
                          preferences.preferred_transmissions.map(transmission => (
                            <span key={transmission} className="badge bg-light text-dark py-2 px-3 rounded-pill">
                              {transmission}
                            </span>
                          ))
                        ) : (
                          <p className="text-muted">No preferred transmissions selected</p>
                        )}
                      </div>
                    ) : (
                      <div className="row row-cols-2 g-2">
                        {labels.transmissions.map(transmission => (
                          <div key={transmission} className="col">
                            <div className="form-check">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                id={`transmission-${transmission}`}
                                name={`preferred_transmissions-${transmission}`}
                                checked={preferencesData.preferred_transmissions.includes(transmission)}
                                onChange={handlePreferenceChange}
                              />
                              <label className="form-check-label" htmlFor={`transmission-${transmission}`}>
                                {transmission}
                              </label>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="row mb-4">
                    <div className="col-md-6">
                      <h5 className="mb-3">Budget Range</h5>
                      {!editMode ? (
                        <div className="card bg-light">
                          <div className="card-body">
                            <div className="d-flex justify-content-between">
                              <div>
                                <p className="text-muted mb-1">Minimum</p>
                                <h5>{preferences.budget_min ? `${preferences.budget_min.toLocaleString()} DH` : 'Not specified'}</h5>
                              </div>
                              <div>
                                <p className="text-muted mb-1">Maximum</p>
                                <h5>{preferences.budget_max ? `${preferences.budget_max.toLocaleString()} DH` : 'Not specified'}</h5>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="row">
                          <div className="col-md-6">
                            <label htmlFor="budget_min" className="form-label">Min (DH)</label>
                            <div className="input-group">
                              <span className="input-group-text bg-light">DH</span>
                              <input
                                type="number"
                                className="form-control"
                                id="budget_min"
                                name="budget_min"
                                placeholder="Minimum"
                                value={preferencesData.budget_min}
                                onChange={handlePreferenceChange}
                                min="0"
                              />
                            </div>
                          </div>
                          <div className="col-md-6">
                            <label htmlFor="budget_max" className="form-label">Max (DH)</label>
                            <div className="input-group">
                              <span className="input-group-text bg-light">DH</span>
                              <input
                                type="number"
                                className="form-control"
                                id="budget_max"
                                name="budget_max"
                                placeholder="Maximum"
                                value={preferencesData.budget_max}
                                onChange={handlePreferenceChange}
                                min="0"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="col-md-6">
                      <h5 className="mb-3">Mileage Range</h5>
                      {!editMode ? (
                        <div className="card bg-light">
                          <div className="card-body">
                            <div className="d-flex justify-content-between">
                              <div>
                                <p className="text-muted mb-1">Minimum</p>
                                <h5>{preferences.mileage_min ? `${preferences.mileage_min.toLocaleString()} km` : 'Not specified'}</h5>
                              </div>
                              <div>
                                <p className="text-muted mb-1">Maximum</p>
                                <h5>{preferences.mileage_max ? `${preferences.mileage_max.toLocaleString()} km` : 'Not specified'}</h5>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="row">
                          <div className="col-md-6">
                            <label htmlFor="mileage_min" className="form-label">Min (km)</label>
                            <div className="input-group">
                              <span className="input-group-text bg-light">km</span>
                              <input
                                type="number"
                                className="form-control"
                                id="mileage_min"
                                name="mileage_min"
                                placeholder="Minimum"
                                value={preferencesData.mileage_min}
                                onChange={handlePreferenceChange}
                                min="0"
                              />
                            </div>
                          </div>
                          <div className="col-md-6">
                            <label htmlFor="mileage_max" className="form-label">Max (km)</label>
                            <div className="input-group">
                              <span className="input-group-text bg-light">km</span>
                              <input
                                type="number"
                                className="form-control"
                                id="mileage_max"
                                name="mileage_max"
                                placeholder="Maximum"
                                value={preferencesData.mileage_max}
                                onChange={handlePreferenceChange}
                                min="0"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mb-4">
                    <h5 className="mb-3">Preferred Years</h5>
                    {!editMode ? (
                      <div className="d-flex flex-wrap gap-2">
                        {preferences.preferred_years && preferences.preferred_years.length > 0 ? (
                          preferences.preferred_years.map(year => (
                            <span key={year} className="badge bg-light text-dark py-2 px-3 rounded-pill">
                              {year}
                            </span>
                          ))
                        ) : (
                          <p className="text-muted">No preferred years selected</p>
                        )}
                      </div>
                    ) : (
                      <div className="row row-cols-2 row-cols-md-3 g-2">
                        {labels.years.map(year => (
                          <div key={year} className="col">
                            <div className="form-check">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                id={`year-${year}`}
                                name={`preferred_years-${year}`}
                                checked={preferencesData.preferred_years.includes(year)}
                                onChange={handlePreferenceChange}
                              />
                              <label className="form-check-label" htmlFor={`year-${year}`}>
                                {year}
                              </label>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="mb-4">
                    <h5 className="mb-3">Preferred Door Count</h5>
                    {!editMode ? (
                      <div className="d-flex flex-wrap gap-2">
                        {preferences.preferred_door_count && preferences.preferred_door_count.length > 0 ? (
                          preferences.preferred_door_count.map(doors => (
                            <span key={doors} className="badge bg-light text-dark py-2 px-3 rounded-pill">
                              {doors} doors
                            </span>
                          ))
                        ) : (
                          <p className="text-muted">No preferred door counts selected</p>
                        )}
                      </div>
                    ) : (
                      <div className="row row-cols-2 g-2">
                        {labels.door_counts.map(doors => (
                          <div key={doors} className="col">
                            <div className="form-check">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                id={`doors-${doors}`}
                                name={`preferred_door_count-${doors}`}
                                checked={preferencesData.preferred_door_count.includes(doors)}
                                onChange={handlePreferenceChange}
                              />
                              <label className="form-check-label" htmlFor={`doors-${doors}`}>
                                {doors} doors
                              </label>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
            <div ref={favoritesRef}>
              {activeTab === 'favorites' && (
                <>
                  <h4 className="mb-4 fw-bold">Saved Cars</h4>
                  <div className="d-flex justify-content-between align-items-center mb-4">
                    <Link to="/predict" className="btn btn-warning rounded-pill px-4">
                      Find More Cars
                    </Link>
                  </div>
                  {favorites.length > 0 ? (
                    <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
                      {favorites.map(car => (
                        <div key={car.id} className="col">
                          <CarCard
                            car={car}
                            isFavorite
                            onSaveToggle={async (carId) => {
                              try {
                                await axios.delete(`${BASE_URL}/api/users/favorites`, {
                                  headers: { Authorization: `Bearer ${user.token}` },
                                  data: { userId: user.userId, carId }
                                });
                                setFavorites(favorites.filter(f => f.id !== carId));
                                setSnackbar({ open: true, message: 'Car removed from favorites!', severity: 'success' });
                              } catch (error) {
                                console.error(`Error removing favorite car ${carId}:`, error.response?.data || error.message);
                                setError(error.response?.data?.message || 'Failed to remove favorite.');
                              }
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-5">
                      <MdFavorite size={60} className="text-muted mb-3" />
                      <h5>No saved cars</h5>
                      <p className="text-muted">Cars you save will appear here</p>
                      <Link to="/predict" className="btn btn-warning rounded-pill mt-3">
                        Find Cars to Save
                      </Link>
                    </div>
                  )}
                </>
              )}
            </div>
            <div ref={recommendationsRef}>
              {activeTab === 'recommendations' && (
                <>
                  <h4 className="mb-4 fw-bold">Recommended For You</h4>
                  <div className="d-flex justify-content-between align-items-center mb-4">
                    <Link to="/predict" className="btn btn-warning rounded-pill px-4">
                      Get Custom Recommendations
                    </Link>
                  </div>
                  <div className="alert alert-warning d-flex align-items-center mb-4">
                    <FaBell className="me-2" />
                    <div>
                      <strong>Personalized Picks:</strong> These recommendations are based on your preferences and browsing history.
                    </div>
                  </div>
                  {recommendations.length > 0 ? (
                    <div className="row row-cols-1 row-cols-md-2 row-cols-lg-2 g-4">
                      {recommendations.map(car => (
                        <div key={car.car_id} className="col">
                          <CarCard
                            car={car}
                            isFavorite={favorites.some(fav => fav.id === (car.car_id || car.id))}
                            onSaveToggle={async (carId, shouldSave) => {
                              try {
                                if (shouldSave) {
                                  await axios.post(`${BASE_URL}/api/users/favorites`, { carId }, {
                                    headers: { Authorization: `Bearer ${user.token}` }
                                  });
                                  setFavorites([...favorites, { ...car, id: carId }]);
                                  setSnackbar({ open: true, message: 'Car added to favorites!', severity: 'success' });
                                } else {
                                  await axios.delete(`${BASE_URL}/api/users/favorites`, {
                                    headers: { Authorization: `Bearer ${user.token}` },
                                    data: { userId: user.userId, carId }
                                  });
                                  setFavorites(favorites.filter(f => f.id !== carId));
                                  setSnackbar({ open: true, message: 'Car removed from favorites!', severity: 'success' });
                                }
                              } catch (error) {
                                console.error(`Error toggling favorite car ${carId}:`, error.response?.data || error.message);
                                setError(error.response?.data?.message || 'Failed to update favorite.');
                              }
                            }}
                            onDismiss={async (carId) => {
                              try {
                                await axios.post(`${BASE_URL}/api/users/recommendations/dismiss`, { carId }, {
                                  headers: { Authorization: `Bearer ${user.token}` }
                                });
                                setRecommendations(recommendations.filter(r => r.car_id !== carId));
                                setSnackbar({ open: true, message: 'Recommendation dismissed!', severity: 'success' });
                              } catch (error) {
                                console.error(`Error dismissing car ${carId}:`, error.response?.data || error.message);
                                setError(error.response?.data?.message || 'Failed to dismiss recommendation.');
                              }
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-5">
                      <FaBell size={60} className="text-muted mb-3" />
                      <h5>No recommendations yet</h5>
                      <p className="text-muted">Update your preferences to get personalized recommendations</p>
                      <button
                        className="btn btn-warning rounded-pill mt-3"
                        onClick={() => handleTabChange('preferences', preferencesRef)}
                      >
                        Update Preferences
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ backgroundColor: snackbar.severity === 'success' ? '#ffca28' : '#d32f2f', color: snackbar.severity === 'success' ? '#000' : '#fff', '.MuiAlert-icon': { color: snackbar.severity === 'success' ? '#000' : '#fff' } }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
      <style>{`
        .btn-warning {
          background-color: #ffca28 !important;
          border-color: #ffca28 !important;
          color: #000 !important;
        }
        .btn-warning:hover {
          background-color: #e0b000 !important;
          border-color: #e0b000 !important;
        }
        .btn-outline-warning {
          border-color: #ffca28 !important;
          color: #ffca28 !important;
        }
        .btn-outline-warning:hover {
          background-color: #ffca28 !important;
          color: #000 !important;
        }
      `}</style>
    </div>
  );
};

export default UserProfilePage;