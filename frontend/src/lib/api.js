import axios from 'axios';

// 1. Dynamically manage the API production link or switch to local server
const API_BASE_URL = 
  process.env.REACT_APP_API_URL || 
  process.env.NEXT_PUBLIC_API_URL || 
  '/api';

// 2. Export the static local paths for assets
export const LOGO_URL = '/assets/bitverse-logo.png';
export const DEV_PHOTO_URL = '/assets/adesh-yash.png';

// 3. Configure the Axios connection instance
export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

api.toString = () => API_BASE_URL;

// 4. Fallback named export for components importing uppercase 'API'
export const API = api;

// 5. Default export to handle standard 'import api from ...' patterns
export default api;
