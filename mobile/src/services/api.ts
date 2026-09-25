import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { errorText, networkErrorMessage, resolveApiBase } from '@saanpaw/shared';

const DEFAULT_API_BASE = 'http://localhost:4001/api/v1';

/** Host the app was loaded from: the address bar on web, the Metro dev server's address on a phone. */
const appHost = (): string | undefined => {
  if (Platform.OS === 'web') return typeof window === 'undefined' ? undefined : window.location.hostname;
  // `hostUri` is Expo's own documented way to read this (e.g. "192.168.1.5:8081") - reading it
  // straight off React Native internals (NativeModules.SourceCode.scriptURL) is not reliable
  // across Expo Go versions and the new architecture, and silently returned undefined here.
  return Constants.expoConfig?.hostUri?.split(':')[0];
};

export const API_BASE_URL = resolveApiBase(process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_API_BASE, appHost());

export async function apiRequest<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const url = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  const headers = new Headers(init.headers ?? {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (init.body && !headers.has('Content-Type') && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  let response: Response;
  try {
    response = await fetch(url, { ...init, headers });
  } catch {
    throw new Error(networkErrorMessage(API_BASE_URL));
  }
  const contentType = response.headers.get('content-type') ?? '';
  const payload = contentType.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    throw new Error(errorText(payload, response.status));
  }

  return payload as T;
}
