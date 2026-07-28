import axios from 'axios';
import logoImg from '../assets/bitverse-logo.png';
import devImg from '../assets/adesh-yash.png';

// 1. Dynamically manage the API production link or switch to local server
const API_BASE_URL = 
  process.env.REACT_APP_API_URL || 
  process.env.NEXT_PUBLIC_API_URL || 
  '/api';

// 2. Export Webpack bundled image assets with static path fallbacks
export const LOGO_URL = logoImg || '/assets/bitverse-logo.png';
export const DEV_PHOTO_URL = devImg || '/assets/adesh-yash.png';

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
