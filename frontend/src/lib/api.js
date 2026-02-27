import axios from 'axios';

const getBaseURL = () => {
  let url = import.meta.env.VITE_API_URL || '';
  
  if (!url) {
    return '/api/';
  }

  // Remove any trailing slashes at first
  url = url.replace(/\/+$/, '');
  
  // If it doesn't end with /api, append it
  if (!url.endsWith('/api')) {
    url = `${url}/api`;
  }
  
  // Always return with a single trailing slash
  return `${url}/`;
};

const api = axios.create({
  baseURL: getBaseURL(),
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('eventhq_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !err.config.url.includes('/auth/login')) {
      localStorage.removeItem('eventhq_token');
      localStorage.removeItem('eventhq_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
