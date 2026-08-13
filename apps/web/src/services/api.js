import axios from 'axios';
import { API_BASE_URL, ML_BASE_URL } from '../config';

const authHeader = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

/* ------------------------------ Cars ------------------------------ */
export const carService = {
  list: ({ page = 1, limit = 8, brand, model } = {}, token) =>
    axios.get(`${API_BASE_URL}/api/cars`, {
      ...(token ? authHeader(token) : {}),
      params: { page, limit, brand, model },
    }),

  get: (id) => axios.get(`${API_BASE_URL}/api/cars/${id}`),

  recordView: ({ userId, carId, viewSource }, token) =>
    axios.post(`${API_BASE_URL}/api/cars/view`, { userId, carId, viewSource }, authHeader(token)),

  create: (formData) => axios.post(`${API_BASE_URL}/api/cars`, formData),

  imageHead: (url) => axios.head(url),

  brandDistribution: (params) => axios.get(`${API_BASE_URL}/api/cars/brands`, { params }),

  bubbleChart: (params) => axios.get(`${API_BASE_URL}/api/cars/bubbles`, { params }),
};

/* ----------------------------- Search ----------------------------- */
export const searchService = {
  search: (body) => axios.post(`${API_BASE_URL}/api/search`, body),
};

/* ---------------------------- Favorites --------------------------- */
export const favoriteService = {
  list: (token) => axios.get(`${API_BASE_URL}/api/users/favorites`, authHeader(token)),
  add: (carId, token) => axios.post(`${API_BASE_URL}/api/users/favorites`, { carId }, authHeader(token)),
  remove: (carId, token) =>
    axios.delete(`${API_BASE_URL}/api/users/favorites`, { ...authHeader(token), data: { carId } }),
};

/* ------------------------------ Auth ------------------------------ */
export const authService = {
  register: (data) => axios.post(`${API_BASE_URL}/api/auth/register`, data),
  login: (data) => axios.post(`${API_BASE_URL}/api/auth/login`, data),
  verify: (token) => axios.get(`${API_BASE_URL}/api/auth/verify`, authHeader(token)),
};

/* ------------------------------ Users ----------------------------- */
export const userService = {
  getProfile: (token) => axios.get(`${API_BASE_URL}/api/users`, authHeader(token)),
  updateProfile: (data, token) => axios.put(`${API_BASE_URL}/api/users`, data, authHeader(token)),
  getPreferences: (token) => axios.get(`${API_BASE_URL}/api/users/preferences`, authHeader(token)),
  updatePreferences: (data, token) => axios.put(`${API_BASE_URL}/api/users/preferences`, data, authHeader(token)),
  getRecommendations: (token) => axios.get(`${API_BASE_URL}/api/users/recommendations`, authHeader(token)),
  generateRecommendations: (token) => axios.get(`${API_BASE_URL}/api/users/recommendations/generate`, authHeader(token)),
  dismissRecommendation: (carId, token) =>
    axios.post(`${API_BASE_URL}/api/users/recommendations/dismiss`, { carId }, authHeader(token)),
};

/* --------------------------- Predictions -------------------------- */
export const predictionService = {
  predict: (data) => axios.post(`${API_BASE_URL}/api/prediction`, data),
  predictML: (data) => axios.post(`${ML_BASE_URL}/predict`, data),
};
