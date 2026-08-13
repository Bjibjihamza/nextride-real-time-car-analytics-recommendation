import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaUser, FaLock, FaCar } from 'react-icons/fa6';
import { useAuth } from '../../context/AuthContext';

const LoginPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login({
        email: formData.email,
        password: formData.password,
      });
      setLoading(false);
      navigate('/profile');
    } catch (err) {
      setError(err.response?.data?.message || 'Error signing in. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="container py-5 my-3">
      <div className="row justify-content-center">
        <div className="col-md-6 col-lg-4">
          <div className="surface p-4 p-md-5" style={{ borderRadius: 24 }}>
            <div className="text-center mb-4">
              <span
                className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3"
                style={{ width: 72, height: 72, background: 'var(--nr-grad-accent)', color: '#101014' }}
              >
                <FaCar size={30} />
              </span>
              <h2 className="fw-bold mb-1">Welcome Back</h2>
              <p className="mb-0" style={{ color: 'var(--nr-text-muted)' }}>Sign in to access your account</p>
            </div>

            {error && (
              <div className="alert alert-danger" role="alert">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label htmlFor="email" className="form-label">Email</label>
                <div className="input-group">
                  <span className="input-group-text">
                    <FaUser />
                  </span>
                  <input
                    type="email"
                    className="form-control"
                    id="email"
                    name="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="mb-4">
                <div className="d-flex justify-content-between align-items-center">
                  <label htmlFor="password" className="form-label">Password</label>
                  <Link to="/forgot-password" className="text-decoration-none small">
                    Forgot Password?
                  </Link>
                </div>
                <div className="input-group">
                  <span className="input-group-text">
                    <FaLock />
                  </span>
                  <input
                    type="password"
                    className="form-control"
                    id="password"
                    name="password"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="d-grid mb-4">
                <button
                  type="submit"
                  className="btn btn-accent btn-lg rounded-pill"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Signing in...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </button>
              </div>

              <div className="text-center">
                <p className="mb-0" style={{ color: 'var(--nr-text-muted)' }}>
                  Don't have an account?{' '}
                  <Link to="/signup" className="text-decoration-none fw-semibold">
                    Sign Up
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
