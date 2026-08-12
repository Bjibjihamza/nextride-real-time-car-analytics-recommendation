// Centralised API endpoints. Override at build time with:
//   REACT_APP_API_URL  (e.g. http://localhost:5002)
//   REACT_APP_ML_URL   (e.g. http://localhost:5001)
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5002';
export const ML_BASE_URL = process.env.REACT_APP_ML_URL || 'http://localhost:5001';
