import axios from 'axios';
import { env } from '../config/env';

export const api = axios.create({
  baseURL: env.VITE_API_BASE_URL,
});

let accessTokenProvider: (() => string | undefined) | null = null;

export function setAccessTokenProvider(fn: () => string | undefined) {
  accessTokenProvider = fn;
}

let onUnauthorized: (() => void) | null = null;

export function setOnUnauthorized(fn: () => void) {
  onUnauthorized = fn;
}

api.interceptors.request.use((config) => {
  const token = accessTokenProvider?.();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      onUnauthorized?.();
    }
    return Promise.reject(error);
  },
);
