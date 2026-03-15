import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '../stores/authStore';

// Change this to your local IP during development (e.g. http://192.168.1.x:3000)
// In production, this will be your VPS domain
export const API_BASE_URL = __DEV__
  ? 'http://10.0.0.167:3000'
  : 'https://api.yourdomain.com';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Attach access token to every request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401: attempt token refresh, then retry original request
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refreshToken = await SecureStore.getItemAsync('youssouf_refresh_token');
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        // Store new access token
        await SecureStore.setItemAsync('youssouf_access_token', data.accessToken);
        useAuthStore.setState({ accessToken: data.accessToken });

        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch {
        // Refresh failed — sign out
        useAuthStore.getState().clearAuth();
      }
    }
    return Promise.reject(error);
  }
);
