import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaPlus, FaCamera, FaInfoCircle, FaCar, FaCog, FaArrowLeft, FaMagic } from 'react-icons/fa';
import { API_BASE_URL } from '../config';

const AddCarPage = () => {
  const navigate = useNavigate();

  const initialFormData = {
    brand: '',
    model: '',
    condition: '',
    year: '',
    mileage: '',
    fuel_type: '',
    transmission: '',
    fiscal_power: '',
    door_count: '',
    first_owner: false,
    origin: '',
    seller_city: '',
    price: '',
    sector: '',
    title: '',
    predictedPrice: ''
  };

  const initialEquipment = {
    jantes_aluminium: false,
    alarme: false,
    airbags: false,
    abs: false,
    vitres_electriques: false,
    toit_ouvrant: false,
    camera_recul: false,
    climatisation: false,
    esp: false,
    ordinateur_bord: false,
    radar_recul: false,
    gps: false,
    verrouillage_centralise: false,
    regulateur_vitesse: false,
    limiteur_vitesse: false,
    sieges_cuir: false,
    cd_mp3_bluetooth: false,
  };

  const [formData, setFormData] = useState(initialFormData);
  const [equipment, setEquipment] = useState(initialEquipment);
  const [images, setImages] = useState([]);
  const [previewImages, setPreviewImages] = useState([]);
  const [activeTab, setActiveTab] = useState('basic');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [predictionLoading, setPredictionLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('lightgbm');

  const brands = [
    'Audi', 'BMW', 'Citroën', 'Dacia', 'Fiat', 'Ford', 'Honda', 'Hyundai',
    'Kia', 'Mercedes-Benz', 'Mitsubishi', 'Nissan', 'Opel', 'Peugeot',
    'Renault', 'Seat', 'Skoda', 'Toyota', 'Volkswagen', 'Volvo',
  ];

  const cities = [
    'Agadir', 'Casablanca', 'Fès', 'Marrakech', 'Meknès', 'Mohammedia',
    'Oujda', 'Rabat', 'Salé', 'Tanger', 'Tétouan', 'Benguerir', 'El Jadida',
  ];

  const sectors = [
    'Casablanca', 'Rabat', 'Marrakech', 'Fès', 'Tanger', 'Agadir', 'Meknès',
  ];

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleEquipmentChange = (e) => {
    const { name, checked } = e.target;
    setEquipment({
      ...equipment,
      [name]: checked,
    });
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      const totalImages = images.length + files.length;
      if (totalImages > 10) {
        setError('You can upload a maximum of 10 photos.');
        return;
      }
      const newPreviewImages = files.map((file) => URL.createObjectURL(file));
      setPreviewImages([...previewImages, ...newPreviewImages]);
      setImages([...images, ...files]);
      setError('');
    }
  };

  const removeImage = (index) => {
    const updatedPreviewImages = [...previewImages];
    updatedPreviewImages.splice(index, 1);
    setPreviewImages(updatedPreviewImages);

    const updatedImages = [...images];
    updatedImages.splice(index, 1);
    setImages(updatedImages);
  };

  const combineEquipment = () => {
    return Object.entries(equipment)
      .filter(([_, isSelected]) => isSelected)
      .map(([key, _]) => key.split('_').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' '))
      .join(', ');
  };

  const validateTab = (tab) => {
    switch (tab) {
      case 'basic':
        const requiredBasicFields = ['title', 'brand', 'model', 'year', 'condition', 'mileage', 'seller_city', 'sector'];
        for (const field of requiredBasicFields) {
          if (!formData[field]) {
            setError(`Please fill in the ${field.replace('_', ' ')} field.`);
            return false;
          }
        }
        if (formData.year < 1980 || formData.year > 2025) {
          setError('Year must be between 1980 and 2025.');
          return false;
        }
        if (formData.mileage < 0) {
          setError('Mileage cannot be negative.');
          return false;
        }
        break;
      case 'technical':
        const requiredTechnicalFields = ['fuel_type', 'transmission', 'fiscal_power', 'door_count', 'origin'];
        for (const field of requiredTechnicalFields) {
          if (!formData[field]) {
            setError(`Please fill in the ${field.replace('_', ' ')} field.`);
            return false;
          }
        }
        if (formData.fiscal_power < 1 || formData.fiscal_power > 40) {
          setError('Fiscal power must be between 1 and 40.');
          return false;
        }
        break;
      case 'equipment':
        break;
      case 'photos':
        if (images.length === 0) {
          setError('Please upload at least one photo.');
          return false;
        }
        if (!formData.price) {
          setError('Please enter a price.');
          return false;
        }
        if (formData.price <= 0) {
          setError('Price must be greater than 0.');
          return false;
        }
        break;
      default:
        return true;
    }
    setError('');
    return true;
  };

  const handlePredictPrice = async () => {
    if (!validateTab('basic') || !validateTab('technical') || !validateTab('equipment')) return;

    setPredictionLoading(true);
    setError('');

    try {
      const predictionData = {
        ...formData,
        equipment: combineEquipment(),
        model_type: selectedModel,
      };

      // Mock prediction logic (replace with real API call if needed)
      const mockPriceCalculation = () => {
        const basePrice = 100000;
        const yearFactor = parseInt(formData.year, 10) * 2000;
        const mileageFactor = -parseInt(formData.mileage, 10) / 100;
        
        let modelFactor = 0;
        switch (selectedModel) {
          case 'lightgbm':
            modelFactor = 1.05;
            break;
          case 'randomforest':
            modelFactor = 0.98;
            break;
          case 'xgboost':
            modelFactor = 1.02;
            break;
          case 'gbm':
            modelFactor = 0.97;
            break;
          case 'neuralnetwork':
            modelFactor = 1.08;
            break;
          default:
            modelFactor = 1;
        }
        
        return Math.round((basePrice + yearFactor + mileageFactor) * modelFactor);
      };

      const predictedPrice = mockPriceCalculation();
      setFormData((prev) => ({ ...prev, predictedPrice: predictedPrice.toLocaleString() + ' MAD' }));
    } catch (err) {
      setError(err.message || 'Failed to predict price');
    } finally {
      setPredictionLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateTab('photos')) return;

    setLoading(true);
    setError('');

    try {
      const formDataToSend = new FormData();
      Object.keys(formData).forEach((key) => formDataToSend.append(key, formData[key]));
      formDataToSend.append('equipment', combineEquipment());
      images.forEach((image, idx) => formDataToSend.append('images', image));
      formDataToSend.append('image_folder', create_folder_name(formData.title, images.length));

      const response = await fetch(`${API_BASE_URL}/api/cars`, {
        method: 'POST',
        body: formDataToSend,
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Failed to create car');

      setFormData(initialFormData);
      setEquipment(initialEquipment);
      setImages([]);
      setPreviewImages([]);
      setActiveTab('basic');
      navigate('/profile');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNextTab = () => {
    const tabs = ['basic', 'technical', 'equipment', 'photos'];
    const currentIndex = tabs.indexOf(activeTab);
    if (currentIndex < tabs.length - 1 && validateTab(activeTab)) setActiveTab(tabs[currentIndex + 1]);
  };

  const create_folder_name = (title, idx) => {
    const random_part = Array.from({ length: 12 }, () =>
      Math.random().toString(36).charAt(2)
    ).join('');
    return `${random_part}_${idx}`;
  };

  return (
    <div className="container py-5">
      <div className="row mb-4">
        <div className="col d-flex align-items-center">
          <button className="btn btn-outline-secondary me-3" onClick={() => navigate('/profile')}>
            <FaArrowLeft className="me-2" /> Back to Profile
          </button>
          <div>
            <h1 className="fw-bold mb-0">Add Your Vehicle</h1>
            <p className="text-muted">
              List your car for sale or evaluation. Fill in the details below to get started.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger d-flex align-items-center mb-4">
          <FaInfoCircle className="me-2" />
          {error}
        </div>
      )}

      <div className="row">
        <div className="col-lg-9">
          <div className="card shadow-sm rounded-4 mb-4">
            <div className="card-body p-4">
              <ul className="nav nav-pills mb-4">
                <li className="nav-item">
                  <button
                    className={`nav-link ${activeTab === 'basic' ? 'active bg-warning text-dark' : ''}`}
                    onClick={() => setActiveTab('basic')}
                  >
                    <FaCar className="me-2" /> Basic Info
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    className={`nav-link ${activeTab === 'technical' ? 'active bg-warning text-dark' : ''}`}
                    onClick={() => setActiveTab('technical')}
                  >
                    <FaCog className="me-2" /> Technical Details
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    className={`nav-link ${activeTab === 'equipment' ? 'active bg-warning text-dark' : ''}`}
                    onClick={() => setActiveTab('equipment')}
                  >
                    <FaInfoCircle className="me-2" /> Equipment
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    className={`nav-link ${activeTab === 'photos' ? 'active bg-warning text-dark' : ''}`}
                    onClick={() => setActiveTab('photos')}
                  >
                    <FaCamera className="me-2" /> Photos
                  </button>
                </li>
              </ul>

              <form onSubmit={handleSubmit}>
                <div className={activeTab === 'basic' ? '' : 'd-none'}>
                  <h4 className="mb-4 fw-bold">Basic Information</h4>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label htmlFor="title" className="form-label">Listing Title*</label>
                      <input
                        type="text"
                        className="form-control"
                        id="title"
                        name="title"
                        value={formData.title}
                        onChange={handleInputChange}
                        placeholder="e.g. Renault Clio 1.5 dCi 90 Energy Business"
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label htmlFor="brand" className="form-label">Brand*</label>
                      <select
                        className="form-select"
                        id="brand"
                        name="brand"
                        value={formData.brand}
                        onChange={handleInputChange}
                        required
                      >
                        <option value="">Select brand</option>
                        {brands.map((brand) => (
                          <option key={brand} value={brand.toLowerCase()}>{brand}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label htmlFor="model" className="form-label">Model*</label>
                      <input
                        type="text"
                        className="form-control"
                        id="model"
                        name="model"
                        value={formData.model}
                        onChange={handleInputChange}
                        placeholder="e.g. 208, Golf, Clio"
                        required
                      />
                    </div>
                    <div className="col-md-4">
                      <label htmlFor="year" className="form-label">Year*</label>
                      <input
                        type="number"
                        className="form-control"
                        id="year"
                        name="year"
                        value={formData.year}
                        onChange={handleInputChange}
                        min="1980"
                        max="2025"
                        placeholder="e.g. 2018"
                        required
                      />
                    </div>
                    <div className="col-md-4">
                      <label htmlFor="condition" className="form-label">Condition*</label>
                      <select
                        className="form-select"
                        id="condition"
                        name="condition"
                        value={formData.condition}
                        onChange={handleInputChange}
                        required
                      >
                        <option value="">Select condition</option>
                        <option value="excellent">Excellent</option>
                        <option value="très bon">Très bon</option>
                        <option value="bon">Bon</option>
                        <option value="correct">Correct</option>
                        <option value="endommagé">Endommagé</option>
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label htmlFor="mileage" className="form-label">Mileage (km)*</label>
                      <input
                        type="number"
                        className="form-control"
                        id="mileage"
                        name="mileage"
                        value={formData.mileage}
                        onChange={handleInputChange}
                        min="0"
                        placeholder="e.g. 75000"
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label htmlFor="seller_city" className="form-label">Seller City*</label>
                      <select
                        className="form-select"
                        id="seller_city"
                        name="seller_city"
                        value={formData.seller_city}
                        onChange={handleInputChange}
                        required
                      >
                        <option value="">Select city</option>
                        {cities.map((city) => <option key={city} value={city}>{city}</option>)}
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label htmlFor="sector" className="form-label">Sector*</label>
                      <select
                        className="form-select"
                        id="sector"
                        name="sector"
                        value={formData.sector}
                        onChange={handleInputChange}
                        required
                      >
                        <option value="">Select sector</option>
                        {sectors.map((sector) => <option key={sector} value={sector}>{sector}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                <div className={activeTab === 'technical' ? '' : 'd-none'}>
                  <h4 className="mb-4 fw-bold">Technical Details</h4>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label htmlFor="fuel_type" className="form-label">Fuel Type*</label>
                      <select
                        className="form-select"
                        id="fuel_type"
                        name="fuel_type"
                        value={formData.fuel_type}
                        onChange={handleInputChange}
                        required
                      >
                        <option value="">Select fuel type</option>
                        <option value="essence">Essence</option>
                        <option value="diesel">Diesel</option>
                        <option value="hybrid">Hybrid</option>
                        <option value="electric">Electric</option>
                        <option value="gpl">GPL</option>
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label htmlFor="transmission" className="form-label">Transmission*</label>
                      <select
                        className="form-select"
                        id="transmission"
                        name="transmission"
                        value={formData.transmission}
                        onChange={handleInputChange}
                        required
                      >
                        <option value="">Select transmission</option>
                        <option value="Manuelle">Manuelle</option>
                        <option value="Automatique">Automatique</option>
                        <option value="Semi-automatique">Semi-automatique</option>
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label htmlFor="fiscal_power" className="form-label">Fiscal Power*</label>
                      <input
                        type="number"
                        className="form-control"
                        id="fiscal_power"
                        name="fiscal_power"
                        value={formData.fiscal_power}
                        onChange={handleInputChange}
                        min="1"
                        max="40"
                        placeholder="e.g. 8"
                        required
                      />
                    </div>
                    <div className="col-md-4">
                      <label htmlFor="door_count" className="form-label">Door Count*</label>
                      <select
                        className="form-select"
                        id="door_count"
                        name="door_count"
                        value={formData.door_count}
                        onChange={handleInputChange}
                        required
                      >
                        <option value="">Select door count</option>
                        <option value="2">2</option>
                        <option value="3">3</option>
                        <option value="4">4</option>
                        <option value="5">5</option>
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label htmlFor="origin" className="form-label">Origin*</label>
                      <select
                        className="form-select"
                        id="origin"
                        name="origin"
                        value={formData.origin}
                        onChange={handleInputChange}
                        required
                      >
                        <option value="">Select origin</option>
                        <option value="WW au Maroc">WW au Maroc</option>
                        <option value="Importé neuf">Importé neuf</option>
                        <option value="Importé occasion">Importé occasion</option>
                        <option value="Dédouané">Dédouané</option>
                      </select>
                    </div>
                    <div className="col-12">
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="first_owner"
                          name="first_owner"
                          checked={formData.first_owner}
                          onChange={handleInputChange}
                        />
                        <label className="form-check-label" htmlFor="first_owner">
                          First Owner
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className={activeTab === 'equipment' ? '' : 'd-none'}>
                  <h4 className="mb-4 fw-bold">Equipment</h4>
                  <div className="row">
                    {Object.keys(equipment).map((key) => (
                      <div key={key} className="col-md-4 mb-3">
                        <div className="form-check">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            id={key}
                            name={key}
                            checked={equipment[key]}
                            onChange={handleEquipmentChange}
                          />
                          <label className="form-check-label" htmlFor={key}>
                            {key.split('_').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={activeTab === 'photos' ? '' : 'd-none'}>
                  <h4 className="mb-4 fw-bold">Vehicle Photos</h4>
                  <div className="mb-4">
                    <label className="form-label">Upload Photos*</label>
                    <div className="input-group mb-3">
                      <input
                        type="file"
                        className="form-control"
                        id="images"
                        accept="image/*"
                        multiple
                        onChange={handleImageUpload}
                      />
                      <label className="input-group-text" htmlFor="images">
                        <FaCamera className="me-2" /> Upload
                      </label>
                    </div>
                    <small className="text-muted">
                      Add up to 10 photos. The first photo will be used as the main image.
                    </small>
                  </div>
                  {previewImages.length > 0 && (
                    <div>
                      <label className="form-label">Selected Photos</label>
                      <div className="row g-2">
                        {previewImages.map((preview, index) => (
                          <div key={index} className="col-md-3 col-6">
                            <div className="position-relative">
                              <img
                                src={preview}
                                alt={`Preview ${index + 1}`}
                                className="img-thumbnail"
                                style={{ height: '150px', objectFit: 'cover', width: '100%' }}
                              />
                              <button
                                type="button"
                                className="btn btn-sm btn-danger position-absolute top-0 end-0 m-1"
                                onClick={() => removeImage(index)}
                              >
                                ×
                              </button>
                              {index === 0 && <span className="badge bg-warning position-absolute bottom-0 start-0 m-1">Main Photo</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="row g-3 mt-4">
                    <div className="col-md-6">
                      <label htmlFor="price" className="form-label">Price (MAD)*</label>
                      <input
                        type="number"
                        className="form-control"
                        id="price"
                        name="price"
                        value={formData.price}
                        onChange={handleInputChange}
                        placeholder="e.g. 150000"
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label htmlFor="modelSelect" className="form-label">Prediction Model</label>
                      <select
                        className="form-select"
                        id="modelSelect"
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                      >
                        <option value="lightgbm">LightGBM</option>
                        <option value="randomforest">Random Forest</option>
                        <option value="xgboost">XGBoost</option>
                        <option value="gbm">GBM</option>
                        <option value="neuralnetwork">Neural Network</option>
                      </select>
                    </div>
                    <div className="col-12">
                      <button
                        type="button"
                        className="btn btn-info mt-3 w-100"
                        onClick={handlePredictPrice}
                        disabled={predictionLoading}
                      >
                        {predictionLoading ? (
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        ) : (
                          <FaMagic className="me-2" />
                        )}
                        Predict Price
                      </button>
                    </div>
                    {formData.predictedPrice && (
                      <div className="col-12 mt-3">
                        <div className="alert alert-success d-flex align-items-center">
                          <span>Predicted Price: {formData.predictedPrice}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 d-flex justify-content-between">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => {
                      const tabs = ['basic', 'technical', 'equipment', 'photos'];
                      const currentIndex = tabs.indexOf(activeTab);
                      if (currentIndex > 0) {
                        setActiveTab(tabs[currentIndex - 1]);
                        setError('');
                      }
                    }}
                    disabled={activeTab === 'basic'}
                  >
                    Previous
                  </button>
                  {activeTab !== 'photos' ? (
                    <button type="button" className="btn btn-warning" onClick={handleNextTab}>
                      Next
                    </button>
                  ) : (
                    <button type="submit" className="btn btn-warning" disabled={loading}>
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          Submitting...
                        </>
                      ) : (
                        <>
                          <FaPlus className="me-2" /> Add Vehicle
                        </>
                      )}
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
        <div className="col-lg-3">
          <div className="card shadow-sm rounded-4">
            <div className="card-body">
              <h5 className="fw-bold mb-3">Tips for Selling</h5>
              <ul className="list-unstyled text-muted">
                <li className="mb-2">• Provide accurate details to attract buyers.</li>
                <li className="mb-2">• Upload high-quality photos from multiple angles.</li>
                <li className="mb-2">• Highlight key features and equipment.</li>
                <li className="mb-2">• Set a competitive price based on market value.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

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
        .nav-pills .nav-link.active {
          background-color: #ffca28 !important;
          color: #000 !important;
        }
        .nav-pills .nav-link {
          color: #6c757d;
        }
        .nav-pills .nav-link:hover {
          color: #ffca28;
        }
        .btn-info {
          background-color: #17a2b8 !important;
          border-color: #17a2b8 !important;
          color: #fff !important;
        }
        .btn-info:hover {
          background-color: #138496 !important;
          border-color: #138496 !important;
        }
      `}</style>
    </div>
  );
};

export default AddCarPage;