import axios from 'axios';

// Production: set VITE_API_URL (e.g. https://your-backend.onrender.com/api)
// Local dev: falls back to /api and uses the Vite proxy in vite.config.js
const baseURL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach the JWT token to every outgoing request.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
