import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { FaArrowRight, FaCarSide, FaCog } from 'react-icons/fa';
import axios from 'axios';
import { API_BASE_URL } from '../config';

const PredictionPage = () => {
  const location = useLocation();
  const car = location.state?.car || {};

  const [labels, setLabels] = useState({
    brands: {},
    condition: [],
    door_count: [],
    equipment: [
      "Abs",
      "Airbags",
      "Caméra De Recul",
      "Climatisation",
      "Esp",
      "Jantes Aluminium",
      "Limiteur De Vitesse",
      "Ordinateur De Bord",
      "Radar De Recul",
      "Régulateur De Vitesse",
      "Sièges Cuir",
      "Toit Ouvrant",
      "Verrouillage Centralisé",
      "Vitres Électriques"
    ],
    first_owner: [],
    fiscal_power: [],
    fuel_type: [],
    origin: [],
    sector: [],
    seller_city: [],
    transmission: []
  });
  const [isLabelsLoading, setIsLabelsLoading] = useState(true);
  const [formData, setFormData] = useState({
    userId: 'anonymous',
    brand: car.brand ? car.brand.toLowerCase() : '',
    model: car.model ? car.model.toLowerCase() : '',
    condition: car.condition ? car.condition.toLowerCase() : '',
    year: car.year ? String(car.year) : '',
    mileage: car.mileage ? String(car.mileage) : '',
    fuel_type: car.fuel_type ? car.fuel_type.toLowerCase() : '',
    transmission: car.transmission ? car.transmission.toLowerCase() : '',
    fiscal_power: car.fiscal_power ? String(car.fiscal_power) : '',
    door_count: car.door_count ? String(car.door_count) : '',
    first_owner: car.first_owner ? (car.first_owner === 'Oui' || car.first_owner === 'Yes' ? 'Oui' : 'Non') : '',
    origin: car.origin ? car.origin.toLowerCase() : '',
    seller_city: car.seller_city || '',
    sector: car.sector || '',
    publication_date: new Date().toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).replace(',', '')
  });

  // Initialize equipment state as an empty object until labels are loaded
  const [equipment, setEquipment] = useState({});
  const [predictedPrice, setPredictedPrice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/labels_p.json')
      .then(response => response.json())
      .then(data => {
        // Normalize brands to lowercase
        const normalizedBrands = {};
        for (const brand in data.brands) {
          normalizedBrands[brand.toLowerCase()] = {
            models: data.brands[brand].models
          };
        }

        // Update labels state
        const updatedLabels = {
          ...data,
          brands: normalizedBrands,
          equipment: [
            "Abs",
            "Airbags",
            "Caméra De Recul",
            "Climatisation",
            "Esp",
            "Jantes Aluminium",
            "Limiteur De Vitesse",
            "Ordinateur De Bord",
            "Radar De Recul",
            "Régulateur De Vitesse",
            "Sièges Cuir",
            "Toit Ouvrant",
            "Verrouillage Centralisé",
            "Vitres Électriques"
          ]
        };
        setLabels(updatedLabels);

        // Initialize equipment state after labels are loaded
        const initialEquipment = {};
        updatedLabels.equipment.forEach(item => {
          initialEquipment[item.replace(/\s+/g, '_').toLowerCase()] = false;
        });

        // Apply pre-filled equipment from car if available
        if (car.equipment) {
          const equipmentList = car.equipment.toLowerCase().split(', ').map(item => item.trim());
          equipmentList.forEach(item => {
            const key = item.replace(/\s+/g, '_').toLowerCase();
            if (key in initialEquipment) {
              initialEquipment[key] = true;
            }
          });
        }

        setEquipment(initialEquipment);
        setIsLabelsLoading(false);
      })
      .catch(error => {
        console.error('Error loading labels:', error);
        setError('Failed to load form options.');
        setIsLabelsLoading(false);
      });
  }, [car.equipment]); // Add car.equipment as a dependency to handle updates

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevFormData => {
      const newFormData = {
        ...prevFormData,
        [name]: value
      };
      // Reset dependent fields when a parent field changes
      if (name === 'brand') {
        newFormData.model = '';
        newFormData.year = '';
      } else if (name === 'model') {
        newFormData.year = '';
      }
      return newFormData;
    });
  };

  const handleEquipmentChange = (e) => {
    const { name, checked } = e.target;
    setEquipment(prevEquipment => ({
      ...prevEquipment,
      [name]: checked
    }));
  };

  const combineEquipment = () => {
    return Object.entries(equipment)
      .filter(([_, isSelected]) => isSelected)
      .map(([key, _]) => key.replace('_', ' '))
      .join(', ');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.brand || !formData.model || !formData.year || !formData.mileage || !formData.fuel_type || !formData.transmission || !formData.fiscal_power) {
      setError('Please fill all required fields.');
      return;
    }

    const mileageValue = parseInt(formData.mileage);
    if (isNaN(mileageValue) || mileageValue > 999999) {
      setError('Mileage must be a number and cannot exceed 999,999 km (6 digits).');
      return;
    }

    setLoading(true);
    setError(null);

    const combinedData = {
      ...formData,
      equipment: combineEquipment()
    };

    try {
      const response = await axios.post(`${API_BASE_URL}/api/prediction`, combinedData, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      setPredictedPrice(response.data.prediction.predictedPrice);
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to predict price. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Get available models based on selected brand
  const availableModels = formData.brand && labels.brands[formData.brand] ? Object.keys(labels.brands[formData.brand].models) : [];

  // Get available years based on selected brand and model
  const availableYears = formData.brand && formData.model && labels.brands[formData.brand]?.models[formData.model] ? labels.brands[formData.brand].models[formData.model] : [];

  if (isLabelsLoading) {
    return (
      <div className="text-center py-5">
        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
        Loading form options...
      </div>
    );
  }

  return (
    <div className="container py-5">
      <div className="row mb-5">
        <div className="col">
          <h1 className="fw-bold">Vehicle Price Prediction</h1>
          <p className="text-muted">
            Enter your vehicle details below and get an estimated price based on our advanced neural network model
          </p>
        </div>
      </div>

      <div className="row">
        <div className="col-lg-8">
          <form onSubmit={handleSubmit}>
            <div className="card shadow-sm rounded-4">
              <div className="card-body p-4">
                <h4 className="mb-4 fw-bold">Vehicle Details</h4>
                
                <div className="row g-3">
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
                      {Object.keys(labels.brands).map(brand => (
                        <option key={brand} value={brand}>{brand}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="col-md-6">
                    <label htmlFor="model" className="form-label">Model*</label>
                    <select 
                      className="form-select" 
                      id="model" 
                      name="model" 
                      value={formData.model} 
                      onChange={handleInputChange}
                      required
                      disabled={!formData.brand}
                    >
                      <option value="">Select model</option>
                      {availableModels.map(model => (
                        <option key={model} value={model}>{model}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="col-md-4">
                    <label htmlFor="year" className="form-label">Year*</label>
                    <select 
                      className="form-select" 
                      id="year" 
                      name="year" 
                      value={formData.year} 
                      onChange={handleInputChange}
                      required
                      disabled={!formData.model}
                    >
                      <option value="">Select year</option>
                      {availableYears.map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                  
                  
                  <div className="col-md-4">
                    <label htmlFor="mileage" className="form-label">Mileage (km)*</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      id="mileage" 
                      name="mileage" 
                      value={formData.mileage} 
                      onChange={(e) => {
                        const value = e.target.value;
                        // Allow only digits and limit to 6 digits
                        if (/^\d{0,6}$/.test(value)) {
                          handleInputChange(e);
                        }
                      }}
                      placeholder="e.g. 75000"
                      required
                    />
                  </div>
                  
                  <div className="col-md-4">
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
                      {labels.fuel_type.map(fuel => (
                        <option key={fuel} value={fuel.toLowerCase()}>{fuel}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="col-md-4">
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
                      {labels.transmission.map(trans => (
                        <option key={trans} value={trans.toLowerCase()}>{trans}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="col-md-4">
                    <label htmlFor="fiscal_power" className="form-label">Fiscal Power*</label>
                    <select 
                      className="form-select" 
                      id="fiscal_power" 
                      name="fiscal_power" 
                      value={formData.fiscal_power} 
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Select fiscal power</option>
                      {labels.fiscal_power.map(power => (
                        <option key={power} value={power}>{power}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="col-md-4">
                    <label htmlFor="door_count" className="form-label">Door Count</label>
                    <select 
                      className="form-select" 
                      id="door_count" 
                      name="door_count" 
                      value={formData.door_count} 
                      onChange={handleInputChange}
                    >
                      <option value="">Select door count</option>
                      {labels.door_count.map(count => (
                        <option key={count} value={count}>{count}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="col-md-4">
                    <label htmlFor="origin" className="form-label">Origin</label>
                    <select 
                      className="form-select" 
                      id="origin" 
                      name="origin" 
                      value={formData.origin} 
                      onChange={handleInputChange}
                    >
                      <option value="">Select origin</option>
                      {labels.origin.map(origin => (
                        <option key={origin} value={origin.toLowerCase()}>{origin}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="col-md-4">
                    <label htmlFor="seller_city" className="form-label">Seller City</label>
                    <select 
                      className="form-select" 
                      id="seller_city" 
                      name="seller_city" 
                      value={formData.seller_city} 
                      onChange={handleInputChange}
                    >
                      <option value="">Select city</option>
                      {labels.seller_city.map(city => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="col-md-4">
                    <label htmlFor="sector" className="form-label">Sector</label>
                    <select 
                      className="form-select" 
                      id="sector" 
                      name="sector" 
                      value={formData.sector} 
                      onChange={handleInputChange}
                    >
                      <option value="">Select sector</option>
                      {labels.sector.map(sector => (
                        <option key={sector} value={sector}>{sector}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="col-md-4">
                    <label htmlFor="first_owner" className="form-label">First Owner</label>
                    <select 
                      className="form-select" 
                      id="first_owner" 
                      name="first_owner" 
                      value={formData.first_owner} 
                      onChange={handleInputChange}
                    >
                      <option value="">Select first owner</option>
                      {labels.first_owner.map(owner => (
                        <option key={owner} value={owner}>{owner}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="col-12 mt-4">
                    <h5 className="fw-bold mb-3">Equipment</h5>
                    <div className="row row-cols-1 row-cols-md-3 g-3">
                      {labels.equipment.map(item => {
                        const key = item.replace(/\s+/g, '_').toLowerCase();
                        return (
                          <div className="col" key={key}>
                            <div className="form-check">
                              <input 
                                className="form-check-input" 
                                type="checkbox" 
                                id={key} 
                                name={key} 
                                checked={equipment[key] || false} 
                                onChange={handleEquipmentChange}
                              />
                              <label className="form-check-label" htmlFor={key}>
                                {item}
                              </label>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  <div className="col-12 mt-4">
                    <button 
                      type="submit" 
                      className="btn btn-warning btn-lg px-4 rounded-pill"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          Calculating...
                        </>
                      ) : 'Predict Price'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </form>

          {error && (
            <div className="alert alert-danger mt-4" role="alert">
              {error}
            </div>
          )}
        </div>
        
        <div className="col-lg-4">
          <div className="sticky-top" style={{ top: '20px' }}>
            <div className={`card shadow-sm rounded-4 mb-4 ${predictedPrice ? 'border-warning' : ''}`}>
              <div className="card-body p-4 text-center">
                <h4 className="fw-bold mb-3">Estimated Price</h4>
                
                {predictedPrice ? (
                  <div className="mb-3">
                    <h2 className="display-4 fw-bold text-warning">
                      {predictedPrice.toLocaleString()} MAD
                    </h2>
                    <p className="text-muted mb-0">Based on Neural Network model</p>
                  </div>
                ) : (
                  <div className="py-5 text-muted">
                    <FaCarSide size={50} className="mb-3 text-secondary opacity-50" />
                    <p>Fill the form and click "Predict Price" to get an estimation</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="card shadow-sm rounded-4 mb-4">
              <div className="card-body p-4">
                <div className="d-flex align-items-center mb-4">
                  <div className="bg-warning p-2 rounded-circle me-3">
                    <FaCog className="text-white" />
                  </div>
                  <div>
                    <h5 className="fw-bold mb-0">How It Works</h5>
                    <p className="text-muted mb-0">Our advanced ML model</p>
                  </div>
                </div>
                <p className="mb-0">
                  Our neural network model is trained on more than 60,000 vehicle listings from Avito and Moteur.ma. 
                  Data is processed using Apache Spark and stored in Cassandra, with regular retraining 
                  via Airflow to ensure accuracy.
                </p>
              </div>
            </div>
            
            <div className="card shadow-sm rounded-4">
              <div className="card-body p-4">
                <div className="d-flex align-items-center mb-4">
                  <div className="bg-warning p-2 rounded-circle me-3">
                    <FaArrowRight className="text-white" />
                  </div>
                  <div>
                    <h5 className="fw-bold mb-0">Get Recommendations</h5>
                    <p className="text-muted mb-0">Find similar vehicles</p>
                  </div>
                </div>
                <div className="d-grid">
                  <button className="btn btn-outline-warning">
                    View Similar Vehicles <FaArrowRight className="ms-2" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PredictionPage;