import React, { useState, useEffect, useRef } from 'react';
import { FaUser, FaEnvelope, FaMapLocationDot, FaCar, FaHeart, FaBell, FaCalendarDays, FaPen, FaFloppyDisk, FaXmark, FaGaugeHigh } from 'react-icons/fa6';
import { MdFavorite } from 'react-icons/md';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config';
import { userService, favoriteService } from '../../services/api';
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
        const token = user.token;
        const userResponse = await userService.getProfile(token);
        const userData = userResponse.data.user;
        setUserData(userData);
        setFormData({ username: userData.username || '', email: userData.email || '', age: userData.age || '', location: userData.location || '' });

        const preferencesResponse = await userService.getPreferences(token);
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

        const favoritesResponse = await favoriteService.list(token);
        const uniqueFavorites = Array.from(
          new Map(
            favoritesResponse.data.cars.map(car => [
              car.id || car.car_id,
              { ...car, id: car.id || car.car_id, imageSrc: constructImageUrl(car), title: car.title || `${car.brand || ''} ${car.model || ''}`.trim() || 'Unknown Car' }
            ])
          ).values()
        );
        setFavorites(uniqueFavorites);

        const recommendationsResponse = await userService.getRecommendations(token);
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

      const token = user.token;
      await userService.updateProfile({
        username: formData.username,
        email: formData.email,
        age: formData.age ? parseInt(formData.age) : undefined,
        location: formData.location || undefined,
      }, token);

      await userService.updatePreferences({
        preferred_brands: preferencesData.preferred_brands,
        preferred_fuel_types: preferencesData.preferred_fuel_types,
        preferred_transmissions: preferencesData.preferred_transmissions,
        budget_min: preferencesData.budget_min ? parseInt(preferencesData.budget_min) : undefined,
        budget_max: preferencesData.budget_max ? parseInt(preferencesData.budget_max) : undefined,
        mileage_min: preferencesData.mileage_min ? parseInt(preferencesData.mileage_min) : undefined,
        mileage_max: preferencesData.mileage_max ? parseInt(preferencesData.mileage_max) : undefined,
        preferred_years: preferencesData.preferred_years,
        preferred_door_count: preferencesData.preferred_door_count,
      }, token);

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
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <span className="ms-3" style={{ color: 'var(--nr-text-muted)' }}>Loading...</span>
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
      <div className="card h-100 border-0 overflow-hidden" style={{ borderRadius: 18, border: '1px solid var(--nr-border)', transition: 'transform 0.2s' }}>
        <div className="row g-0 h-100">
          <div className="col-4 position-relative" style={{ background: 'var(--nr-bg-soft)' }}>
            <img
              src={imageSrc}
              alt={car.title || car.name}
              className="w-100"
              style={{ height: '100%', objectFit: 'cover' }}
              onError={handleImageError}
              loading="lazy"
            />
            <span
              className="position-absolute start-0 bottom-0 badge fw-semibold"
              style={{ background: 'rgba(10,14,23,0.82)', color: 'var(--nr-text)', fontSize: '0.78rem', margin: 8, left: 0, bottom: 0 }}
            >
              {car.price ? `${car.price.toLocaleString()} DH` : 'Price N/A'}
            </span>
            {isNew && (
              <span className="position-absolute badge bg-warning" style={{ top: 8, right: 8, fontSize: '0.72rem', fontWeight: 700 }}>
                New
              </span>
            )}
          </div>
          <div className="col-8 d-flex flex-column">
            <div className="card-body p-3 d-flex flex-column justify-content-between">
              <div>
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <h5 className="card-title mb-0" style={{ fontSize: '0.98rem', lineHeight: 1.3 }}>{car.title || car.name}</h5>
                  <button
                    className="btn btn-sm p-0 border-0"
                    style={{ color: isInFavorites ? 'var(--nr-danger)' : 'var(--nr-text-faint)' }}
                    onClick={() => onSaveToggle(car.car_id || car.id, !isInFavorites)}
                    aria-label="Toggle favorite"
                  >
                    <FaHeart size={15} />
                  </button>
                </div>
                <p className="mb-2" style={{ color: 'var(--nr-text-faint)', fontSize: '0.82rem' }}>{car.year ? `${car.year} • ${car.fuel_type || 'N/A'}` : 'N/A'}</p>
                {car.recommendation_reason && (
                  <p className="mb-3" style={{ color: 'var(--nr-text-muted)', fontSize: '0.82rem' }}>
                    {car.recommendation_reason}
                  </p>
                )}
              </div>
              <div className="d-grid gap-2">
                <Link to={`/car/${car.car_id || car.id}`} className="btn btn-accent btn-sm rounded-pill w-100">
                  View Details
                </Link>
                {onDismiss && (
                  <button
                    className="btn btn-outline-danger btn-sm rounded-pill w-100"
                    onClick={() => onDismiss(car.car_id || car.id)}
                  >
                    <FaXmark className="me-1" /> Not Interested
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const sidebarItems = [
    { key: 'profile', label: 'Profile Information', icon: <FaUser />, ref: profileRef },
    { key: 'preferences', label: 'Car Preferences', icon: <FaCar />, ref: preferencesRef },
    { key: 'favorites', label: 'Saved Cars', icon: <FaHeart />, ref: favoritesRef },
    { key: 'recommendations', label: 'Recommendations', icon: <FaBell />, ref: recommendationsRef },
  ];

  const editActions = () => (
    <div className="d-flex gap-2">
      <button className="btn btn-accent rounded-pill px-3" onClick={handleSaveProfile}>
        <FaFloppyDisk className="me-2" /> Save
      </button>
      <button className="btn btn-ghost rounded-pill px-3" onClick={handleCancelEdit}>
        <FaXmark className="me-2" /> Cancel
      </button>
    </div>
  );

  const readOnlyField = (label, icon, value) => (
    <div className="col-md-6 mb-3">
      <label className="form-label">{label}</label>
      <div className="input-group">
        <span className="input-group-text">{icon}</span>
        <input type="text" className="form-control" value={value} readOnly />
      </div>
    </div>
  );

  const editableField = (label, icon, name, value, type = 'text', min, max) => (
    <div className="col-md-6 mb-3">
      <label htmlFor={name} className="form-label">{label}</label>
      <div className="input-group">
        <span className="input-group-text">{icon}</span>
        <input type={type} className="form-control" id={name} name={name} value={value} onChange={handleInputChange} min={min} max={max} />
      </div>
    </div>
  );

  const badgeList = (items, emptyText) =>
    items && items.length > 0 ? (
      <div className="d-flex flex-wrap gap-2">
        {items.map(item => (
          <span key={item} className="pill">{item}</span>
        ))}
      </div>
    ) : (
      <p className="mb-0" style={{ color: 'var(--nr-text-faint)' }}>{emptyText}</p>
    );

  const editCheckboxGrid = (label, arrayName, options, format) => (
    <div className="mb-4">
      <h6 className="fw-bold mb-3">{label}</h6>
      <div className="row row-cols-2 row-cols-md-3 g-2">
        {options.map((opt) => {
          const id = `${arrayName}-${String(opt).replace(/[^a-zA-Z0-9]/g, '')}`;
          return (
            <div key={id} className="col">
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id={id}
                  name={`${arrayName}-${opt}`}
                  checked={preferencesData[arrayName].includes(opt)}
                  onChange={handlePreferenceChange}
                />
                <label className="form-check-label" htmlFor={id}>
                  {format ? format(opt) : opt}
                </label>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="container py-4">
      {error && (
        <div className="alert alert-danger d-flex align-items-center mb-4">
          <FaXmark className="me-2" />
          {error}
        </div>
      )}

      <div className="row g-4">
        <div className="col-lg-3">
          <div className="surface overflow-hidden" style={{ borderRadius: 22, position: 'sticky', top: 100 }}>
            <div className="p-4 text-center" style={{ background: 'linear-gradient(150deg, rgba(245,179,1,0.22), var(--nr-surface) 75%)', borderBottom: '1px solid var(--nr-border)' }}>
              <div
                className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3"
                style={{ width: 84, height: 84, background: 'var(--nr-surface-2)', border: '2px solid var(--nr-accent)' }}
              >
                <FaUser size={36} style={{ color: 'var(--nr-accent)' }} />
              </div>
              <h5 className="fw-bold mb-1">{userData.username}</h5>
              <p className="mb-0" style={{ color: 'var(--nr-text-faint)', fontSize: '0.85rem' }}>
                Member since {new Date(userData.created_at).toLocaleDateString()}
              </p>
            </div>
            <div className="list-group list-group-flush p-3" style={{ gap: 6 }}>
              {sidebarItems.map((item) => (
                <button
                  key={item.key}
                  className={`list-group-item list-group-item-action d-flex align-items-center rounded-pill ${activeTab === item.key ? 'active' : ''}`}
                  style={{ border: 'none', borderRadius: 999 }}
                  onClick={() => handleTabChange(item.key, item.ref)}
                >
                  <span className="me-3">{item.icon}</span> {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="col-lg-9">
          <div className="surface p-4 p-lg-5" style={{ borderRadius: 22 }}>
            <div ref={profileRef}>
              {activeTab === 'profile' && (
                <>
                  <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
                    <h4 className="fw-bold mb-0">Profile Information</h4>
                    {!editMode ? (
                      <button className="btn btn-outline-warning rounded-pill px-4" onClick={() => setEditMode(true)}>
                        <FaPen className="me-2" /> Edit Profile
                      </button>
                    ) : (
                      editActions()
                    )}
                  </div>
                  <div className="row">
                    {!editMode ? (
                      <>
                        {readOnlyField('Username', <FaUser />, userData.username)}
                        {readOnlyField('Email', <FaEnvelope />, userData.email)}
                        {readOnlyField('Age', <FaCalendarDays />, userData.age || 'Not specified')}
                        {readOnlyField('Location', <FaMapLocationDot />, userData.location || 'Not specified')}
                      </>
                    ) : (
                      <>
                        {editableField('Username', <FaUser />, 'username', formData.username)}
                        {editableField('Email', <FaEnvelope />, 'email', formData.email, 'email')}
                        {editableField('Age', <FaCalendarDays />, 'age', formData.age, 'number', 18, 100)}
                        <div className="col-md-6 mb-3">
                          <label htmlFor="location" className="form-label">Location</label>
                          <div className="input-group">
                            <span className="input-group-text"><FaMapLocationDot /></span>
                            <select className="form-select" id="location" name="location" value={formData.location} onChange={handleInputChange}>
                              <option value="">Select your city</option>
                              {labels.cities.map(city => <option key={city} value={city}>{city}</option>)}
                            </select>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>

            <div ref={preferencesRef}>
              {activeTab === 'preferences' && (
                <>
                  <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
                    <h4 className="fw-bold mb-0">Car Preferences</h4>
                    {!editMode ? (
                      <button className="btn btn-outline-warning rounded-pill px-4" onClick={() => setEditMode(true)}>
                        <FaPen className="me-2" /> Edit Preferences
                      </button>
                    ) : (
                      editActions()
                    )}
                  </div>

                  {!editMode ? (
                    <>
                      <div className="mb-4">
                        <h6 className="fw-bold mb-3">Preferred Brands</h6>
                        {badgeList(preferences.preferred_brands, 'No preferred brands selected')}
                      </div>
                      <div className="mb-4">
                        <h6 className="fw-bold mb-3">Fuel Types</h6>
                        {badgeList(preferences.preferred_fuel_types, 'No preferred fuel types selected')}
                      </div>
                      <div className="mb-4">
                        <h6 className="fw-bold mb-3">Transmission</h6>
                        {badgeList(preferences.preferred_transmissions, 'No preferred transmissions selected')}
                      </div>
                      <div className="row mb-4">
                        <div className="col-md-6">
                          <h6 className="fw-bold mb-3">Budget Range</h6>
                          <div className="surface-2 p-3">
                            <div className="d-flex justify-content-between">
                              <div>
                                <p className="mb-1" style={{ color: 'var(--nr-text-faint)', fontSize: '0.85rem' }}>Minimum</p>
                                <h6>{preferences.budget_min ? `${preferences.budget_min.toLocaleString()} DH` : 'Not specified'}</h6>
                              </div>
                              <div className="text-end">
                                <p className="mb-1" style={{ color: 'var(--nr-text-faint)', fontSize: '0.85rem' }}>Maximum</p>
                                <h6>{preferences.budget_max ? `${preferences.budget_max.toLocaleString()} DH` : 'Not specified'}</h6>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="col-md-6">
                          <h6 className="fw-bold mb-3">Mileage Range</h6>
                          <div className="surface-2 p-3">
                            <div className="d-flex justify-content-between">
                              <div>
                                <p className="mb-1" style={{ color: 'var(--nr-text-faint)', fontSize: '0.85rem' }}>Minimum</p>
                                <h6>{preferences.mileage_min ? `${preferences.mileage_min.toLocaleString()} km` : 'Not specified'}</h6>
                              </div>
                              <div className="text-end">
                                <p className="mb-1" style={{ color: 'var(--nr-text-faint)', fontSize: '0.85rem' }}>Maximum</p>
                                <h6>{preferences.mileage_max ? `${preferences.mileage_max.toLocaleString()} km` : 'Not specified'}</h6>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="mb-4">
                        <h6 className="fw-bold mb-3">Preferred Years</h6>
                        {badgeList(preferences.preferred_years, 'No preferred years selected')}
                      </div>
                      <div className="mb-4">
                        <h6 className="fw-bold mb-3">Preferred Door Count</h6>
                        {badgeList(
                          preferences.preferred_door_count.map(d => `${d} doors`),
                          'No preferred door counts selected'
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      {editCheckboxGrid('Preferred Brands', 'preferred_brands', labels.brands)}
                      {editCheckboxGrid('Fuel Types', 'preferred_fuel_types', labels.fuel_types)}
                      {editCheckboxGrid('Transmission', 'preferred_transmissions', labels.transmissions)}

                      <div className="row mb-4">
                        <div className="col-md-6">
                          <h6 className="fw-bold mb-3">Budget Range</h6>
                          <div className="row">
                            <div className="col-md-6">
                              <label htmlFor="budget_min" className="form-label">Min (DH)</label>
                              <div className="input-group">
                                <span className="input-group-text">DH</span>
                                <input type="number" className="form-control" id="budget_min" name="budget_min" placeholder="Minimum" value={preferencesData.budget_min} onChange={handlePreferenceChange} min="0" />
                              </div>
                            </div>
                            <div className="col-md-6">
                              <label htmlFor="budget_max" className="form-label">Max (DH)</label>
                              <div className="input-group">
                                <span className="input-group-text">DH</span>
                                <input type="number" className="form-control" id="budget_max" name="budget_max" placeholder="Maximum" value={preferencesData.budget_max} onChange={handlePreferenceChange} min="0" />
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="col-md-6">
                          <h6 className="fw-bold mb-3">Mileage Range</h6>
                          <div className="row">
                            <div className="col-md-6">
                              <label htmlFor="mileage_min" className="form-label">Min (km)</label>
                              <div className="input-group">
                                <span className="input-group-text"><FaGaugeHigh /></span>
                                <input type="number" className="form-control" id="mileage_min" name="mileage_min" placeholder="Minimum" value={preferencesData.mileage_min} onChange={handlePreferenceChange} min="0" />
                              </div>
                            </div>
                            <div className="col-md-6">
                              <label htmlFor="mileage_max" className="form-label">Max (km)</label>
                              <div className="input-group">
                                <span className="input-group-text"><FaGaugeHigh /></span>
                                <input type="number" className="form-control" id="mileage_max" name="mileage_max" placeholder="Maximum" value={preferencesData.mileage_max} onChange={handlePreferenceChange} min="0" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {editCheckboxGrid('Preferred Years', 'preferred_years', labels.years)}
                      {editCheckboxGrid('Preferred Door Count', 'preferred_door_count', labels.door_counts, (d) => `${d} doors`)}
                    </>
                  )}
                </>
              )}
            </div>

            <div ref={favoritesRef}>
              {activeTab === 'favorites' && (
                <>
                  <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
                    <h4 className="fw-bold mb-0">Saved Cars</h4>
                    <Link to="/search" className="btn btn-accent rounded-pill px-4">
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
                                await favoriteService.remove(carId, user.token);
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
                      <MdFavorite size={56} className="mb-3" style={{ color: 'var(--nr-text-faint)' }} />
                      <h5 className="fw-bold">No saved cars</h5>
                      <p className="mb-0" style={{ color: 'var(--nr-text-muted)' }}>Cars you save will appear here</p>
                      <Link to="/search" className="btn btn-accent rounded-pill mt-3 px-4">
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
                  <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
                    <h4 className="fw-bold mb-0">Recommended For You</h4>
                    <Link to="/predict" className="btn btn-accent rounded-pill px-4">
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
                    <div className="row row-cols-1 row-cols-md-2 g-4">
                      {recommendations.map(car => (
                        <div key={car.car_id} className="col">
                          <CarCard
                            car={car}
                            isFavorite={favorites.some(fav => fav.id === (car.car_id || car.id))}
                            onSaveToggle={async (carId, shouldSave) => {
                              try {
                                if (shouldSave) {
                                  await favoriteService.add(carId, user.token);
                                  setFavorites([...favorites, { ...car, id: carId }]);
                                  setSnackbar({ open: true, message: 'Car added to favorites!', severity: 'success' });
                                } else {
                                  await favoriteService.remove(carId, user.token);
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
                                await userService.dismissRecommendation(carId, user.token);
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
                      <FaBell size={56} className="mb-3" style={{ color: 'var(--nr-text-faint)' }} />
                      <h5 className="fw-bold">No recommendations yet</h5>
                      <p className="mb-0" style={{ color: 'var(--nr-text-muted)' }}>Update your preferences to get personalized recommendations</p>
                      <button
                        className="btn btn-accent rounded-pill mt-3 px-4"
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
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ backgroundColor: snackbar.severity === 'success' ? '#f5b301' : '#d32f2f', color: snackbar.severity === 'success' ? '#101014' : '#fff', '.MuiAlert-icon': { color: snackbar.severity === 'success' ? '#101014' : '#fff' } }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default UserProfilePage;
