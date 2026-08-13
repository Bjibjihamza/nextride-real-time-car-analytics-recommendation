import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaUser, FaLock, FaCar, FaEnvelope, FaMapLocationDot, FaCakeCandles } from 'react-icons/fa6';
import { authService, userService } from '../../services/api';

const SignupPage = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    age: '',
    location: '',
    preferredBrands: [],
    preferredFuelTypes: [],
    preferredTransmissions: [],
    preferredEquipment: [],
    budgetMin: '',
    budgetMax: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [step, setStep] = useState(1);
  const [labels, setLabels] = useState({
    brands: [],
    fuel_types: [],
    transmissions: [],
    cities: [],
    equipment: [],
  });
  const [showAllBrands, setShowAllBrands] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLabels = async () => {
      try {
        const response = await fetch('/labels.json');
        if (!response.ok) {
          throw new Error('Failed to fetch labels');
        }
        const data = await response.json();
        setLabels(data);
      } catch (err) {
        setError('Error loading options. Please try again later.');
        console.error(err);
      }
    };
    fetchLabels();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (type === 'checkbox') {
      const [arrayName, itemValue] = name.split('|');
      setFormData((prev) => ({
        ...prev,
        [arrayName]: checked
          ? [...prev[arrayName], itemValue]
          : prev[arrayName].filter((item) => item !== itemValue),
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const nextStep = (e) => {
    e.preventDefault();
    if (step === 1) {
      if (!formData.username || !formData.email || !formData.password || !formData.confirmPassword) {
        setError('Please fill in all required fields');
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        return;
      }
      if (formData.password.length < 8) {
        setError('Password must be at least 8 characters');
        return;
      }
    }

    setError('');
    setStep(step + 1);
  };

  const prevStep = () => {
    setStep(step - 1);
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const userData = {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        age: formData.age ? parseInt(formData.age) : null,
        location: formData.location || null,
      };

      const registerResponse = await authService.register(userData);
      const { user, token } = registerResponse.data;

      const preferencesData = {
        userId: user.id,
        budget_min: formData.budgetMin ? parseInt(formData.budgetMin) : 0,
        budget_max: formData.budgetMax ? parseInt(formData.budgetMax) : 0,
        mileage_min: 0,
        mileage_max: 0,
        preferred_brands: formData.preferredBrands,
        preferred_fuel_types: formData.preferredFuelTypes,
        preferred_transmissions: formData.preferredTransmissions,
        preferred_equipment: formData.preferredEquipment,
        preferred_years: [],
        preferred_door_count: [],
      };

      await userService.updatePreferences(preferencesData, token);

      localStorage.setItem('carUser', JSON.stringify(user));
      localStorage.setItem('carUserPreferences', JSON.stringify(preferencesData));
      localStorage.setItem('carToken', token);

      setLoading(false);
      setSuccess('Account created successfully! Redirecting to login...');

      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Error creating account. Please try again.');
      setLoading(false);
      console.error('Submission error:', err.response?.data);
    }
  };

  const toggleBrands = () => {
    setShowAllBrands(!showAllBrands);
  };

  const displayedBrands = showAllBrands ? labels.brands : labels.brands.slice(0, 15);

  const inputField = (label, icon, children) => (
    <div className="mb-3">
      <label className="form-label">{label}</label>
      <div className="input-group">
        <span className="input-group-text">{icon}</span>
        {children}
      </div>
    </div>
  );

  const checkboxGrid = (label, options, arrayName, formatLabel) => (
    <div className="mb-4">
      <label className="form-label fw-semibold">{label}</label>
      <div className="row row-cols-2 g-2">
        {options.map((opt) => {
          const value = formatLabel ? formatLabel(opt) : opt;
          const id = `${arrayName}-${String(opt).replace(/[^a-zA-Z0-9]/g, '')}`;
          return (
            <div key={id} className="col">
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id={id}
                  name={`${arrayName}|${opt}`}
                  checked={formData[arrayName].includes(opt)}
                  onChange={handleChange}
                />
                <label className="form-check-label" htmlFor={id}>
                  {value}
                </label>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="container py-5 my-2">
      <div className="row justify-content-center">
        <div className="col-md-9 col-lg-7">
          <div className="surface p-4 p-md-5" style={{ borderRadius: 24 }}>
            <div className="text-center mb-4">
              <span
                className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3"
                style={{ width: 72, height: 72, background: 'var(--nr-grad-accent)', color: '#101014' }}
              >
                <FaCar size={30} />
              </span>
              <h2 className="fw-bold mb-1">Create Your Account</h2>
              <p className="mb-0" style={{ color: 'var(--nr-text-muted)' }}>
                Join us to personalize your car shopping experience
              </p>
            </div>

            {error && (
              <div className="alert alert-danger" role="alert">
                {error}
              </div>
            )}
            {success && (
              <div className="alert alert-success" role="alert">
                {success}
              </div>
            )}

            <div className="progress mb-4" style={{ height: 8 }}>
              <div
                className="progress-bar"
                role="progressbar"
                style={{ width: `${step * 50}%` }}
                aria-valuenow={step * 50}
                aria-valuemin="0"
                aria-valuemax="100"
              />
            </div>

            <form onSubmit={handleSubmit}>
              {step === 1 && (
                <>
                  <h5 className="mb-3 fw-bold">Account Information</h5>

                  {inputField(
                    'Username *',
                    <FaUser />,
                    <input type="text" className="form-control" id="username" name="username" placeholder="Choose a username" value={formData.username} onChange={handleChange} required />
                  )}

                  {inputField(
                    'Email *',
                    <FaEnvelope />,
                    <input type="email" className="form-control" id="email" name="email" placeholder="Enter your email" value={formData.email} onChange={handleChange} required />
                  )}

                  {inputField(
                    'Password *',
                    <FaLock />,
                    <input type="password" className="form-control" id="password" name="password" placeholder="Create a password" value={formData.password} onChange={handleChange} required />
                  )}
                  <div className="form-text mb-3" style={{ marginTop: -8 }}>Password must be at least 8 characters</div>

                  {inputField(
                    'Confirm Password *',
                    <FaLock />,
                    <input type="password" className="form-control" id="confirmPassword" name="confirmPassword" placeholder="Confirm your password" value={formData.confirmPassword} onChange={handleChange} required />
                  )}

                  {inputField(
                    'Age',
                    <FaCakeCandles />,
                    <input type="number" className="form-control" id="age" name="age" placeholder="Enter your age" value={formData.age} onChange={handleChange} min="18" max="100" />
                  )}

                  <div className="mb-4">
                    <label htmlFor="location" className="form-label">Location</label>
                    <div className="input-group">
                      <span className="input-group-text"><FaMapLocationDot /></span>
                      <select className="form-select" id="location" name="location" value={formData.location} onChange={handleChange}>
                        <option value="">Select your city</option>
                        {labels.cities.map((city) => (
                          <option key={city} value={city}>{city}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <h5 className="mb-1 fw-bold">Car Preferences</h5>
                  <p className="text-muted mb-4" style={{ color: 'var(--nr-text-muted)' }}>
                    Tell us what you're looking for to get personalized recommendations
                  </p>

                  <div className="mb-4">
                    <label className="form-label fw-semibold">Preferred Brands</label>
                    <div className="row row-cols-2 g-2">
                      {displayedBrands.map((brand) => (
                        <div key={brand} className="col">
                          <div className="form-check">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id={`brand-${brand.replace(/[^a-zA-Z0-9]/g, '')}`}
                              name={`preferredBrands|${brand}`}
                              checked={formData.preferredBrands.includes(brand)}
                              onChange={handleChange}
                            />
                            <label className="form-check-label" htmlFor={`brand-${brand.replace(/[^a-zA-Z0-9]/g, '')}`}>
                              {brand}
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                    {labels.brands.length > 15 && (
                      <div className="mt-3 text-center">
                        <button type="button" className="btn btn-link" onClick={toggleBrands}>
                          {showAllBrands ? 'See Less' : 'See More'}
                        </button>
                      </div>
                    )}
                  </div>

                  {checkboxGrid('Fuel Type', labels.fuel_types, 'preferredFuelTypes')}
                  {checkboxGrid('Transmission', labels.transmissions, 'preferredTransmissions')}
                  {checkboxGrid(
                    'Preferred Equipment',
                    labels.equipment,
                    'preferredEquipment',
                    (opt) => opt.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
                  )}

                  <div className="row mb-4">
                    <div className="col-md-6">
                      <label htmlFor="budgetMin" className="form-label">Budget Min (DH)</label>
                      <div className="input-group">
                        <span className="input-group-text">DH</span>
                        <input type="number" className="form-control" id="budgetMin" name="budgetMin" placeholder="Minimum" value={formData.budgetMin} onChange={handleChange} min="0" />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <label htmlFor="budgetMax" className="form-label">Budget Max (DH)</label>
                      <div className="input-group">
                        <span className="input-group-text">DH</span>
                        <input type="number" className="form-control" id="budgetMax" name="budgetMax" placeholder="Maximum" value={formData.budgetMax} onChange={handleChange} min="0" />
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div className="d-flex justify-content-between mt-4">
                {step > 1 && (
                  <button type="button" className="btn btn-ghost px-4 rounded-pill" onClick={prevStep}>
                    Back
                  </button>
                )}

                {step < 2 ? (
                  <button type="button" className="btn btn-accent px-4 rounded-pill ms-auto" onClick={nextStep}>
                    Next
                  </button>
                ) : (
                  <button type="submit" className="btn btn-accent px-4 rounded-pill ms-auto" disabled={loading}>
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Creating Account...
                      </>
                    ) : (
                      'Create Account'
                    )}
                  </button>
                )}
              </div>

              {step === 1 && (
                <div className="text-center mt-4">
                  <p className="mb-0" style={{ color: 'var(--nr-text-muted)' }}>
                    Already have an account?{' '}
                    <Link to="/login" className="text-decoration-none fw-semibold">
                      Sign In
                    </Link>
                  </p>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
