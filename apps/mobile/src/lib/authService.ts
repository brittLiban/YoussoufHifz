import * as SecureStore from 'expo-secure-store';
import { api } from './api';
import { useAuthStore, AuthUser } from '../stores/authStore';

const REFRESH_TOKEN_KEY = 'youssouf_refresh_token';

interface AuthResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

export async function login(email: string, password: string): Promise<void> {
  const { data } = await api.post<AuthResponse>('/auth/login', { email, password });
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, data.refreshToken);
  await useAuthStore.getState().setAuth(data.user, data.accessToken);
}

export async function register(
  email: string,
  password: string,
  displayName: string,
  role: AuthUser['role']
): Promise<void> {
  const { data } = await api.post<AuthResponse>('/auth/register', {
    email,
    password,
    displayName,
    role,
  });
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, data.refreshToken);
  await useAuthStore.getState().setAuth(data.user, data.accessToken);
}

export async function logout(): Promise<void> {
  try {
    const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    if (refreshToken) {
      await api.post('/auth/logout', { refreshToken });
    }
  } catch {
    // Best-effort — always clear local state
  } finally {
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    await useAuthStore.getState().clearAuth();
  }
}
