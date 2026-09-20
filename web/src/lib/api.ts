/// <reference types="vite/client" />

import { errorText, networkErrorMessage, resolveApiBase } from '@saanpaw/shared';

const DEFAULT_API_BASE = 'http://localhost:4001/api/v1';

export const API_BASE_URL = resolveApiBase(import.meta.env.VITE_API_BASE_URL ?? DEFAULT_API_BASE, window.location.hostname);

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  const headers = new Headers(init.headers ?? {});

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
