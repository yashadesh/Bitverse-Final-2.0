import { useState, useEffect } from 'react';
import axios from 'axios';
import logoImg from '../assets/bitverse-logo.png';
import devImg from '../assets/adesh-yash.png';

// 1. Dynamically manage the API production link or switch to local server
const API_BASE_URL = 
  process.env.REACT_APP_API_URL || 
  process.env.NEXT_PUBLIC_API_URL || 
  '/api';

// 2. Export live dynamic asset URLs so manual file uploads/replacements reflect instantly
export const LOGO_URL = '/api/branding-asset/logo';
export const DEV_PHOTO_URL = '/api/branding-asset/dev_photo';

export const BUNDLED_LOGO_URL = logoImg;
export const BUNDLED_DEV_PHOTO_URL = devImg;

export function useBrandingUrls() {
  const [v, setV] = useState(() => Date.now());

  useEffect(() => {
    const handleUpdate = () => setV(Date.now());
    window.addEventListener('branding_updated', handleUpdate);
    return () => window.removeEventListener('branding_updated', handleUpdate);
  }, []);

  return {
    logoUrl: `/api/branding-asset/logo?v=${v}`,
    devPhotoUrl: `/api/branding-asset/dev_photo?v=${v}`
  };
}

// Helper to handle image loading fallback and automatically retry with bundled or alternate extensions
export const handleImgError = (e, fallbackPath, bundledFallback) => {
  const el = e.currentTarget;
  if (!el.dataset.attempt) {
    el.dataset.attempt = "1";
    el.src = (fallbackPath || '/assets/bitverse-logo.png') + '?v=' + Date.now();
  } else if (el.dataset.attempt === "1" && bundledFallback) {
    el.dataset.attempt = "2";
    el.src = bundledFallback;
  }
};

/**
 * Calculates estimated study reading time for note resources based on content size,
 * file category, and academic density.
 */
export function calcReadTime(file) {
  if (!file) return "~2 min read";
  if (file.read_time_mins || file.estimated_read_time) {
    const mins = file.read_time_mins || file.estimated_read_time;
    return `~${mins} min${mins > 1 ? 's' : ''} read`;
  }

  const sizeKb = ((file.size || 0) / 1024);
  const filename = (file.original_filename || file.display_name || "").toLowerCase();

  if (sizeKb <= 0) {
    if (filename.includes("syllabus") || filename.includes("overview")) return "~3 min read";
    if (filename.includes("module") || filename.includes("unit") || filename.includes("chapter")) return "~15 min read";
    if (filename.includes("pyq") || filename.includes("paper") || filename.includes("question")) return "~10 min read";
    return "~5 min read";
  }

  let minutes = 1;

  if (sizeKb < 40) {
    minutes = 2; // Short note / summary sheet
  } else if (sizeKb < 150) {
    minutes = 5; // Concise module summary / topic sheet
  } else if (sizeKb < 500) {
    minutes = 10; // Full module notes / lecture slide deck
  } else if (sizeKb < 1500) {
    minutes = 20; // Multi-topic comprehensive notes
  } else if (sizeKb < 4000) {
    minutes = 35; // Complete subject notes / formula book
  } else {
    // Large textbook or full course packet
    minutes = Math.min(120, Math.round(35 + (sizeKb - 4000) / 300));
  }

  if (minutes < 60) {
    return `~${minutes} min read`;
  }
  const hours = (minutes / 60).toFixed(1);
  return `~${hours} hr read`;
}

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
