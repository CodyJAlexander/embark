const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

function getToken(): string | null {
  return localStorage.getItem('embark-api-token');
}

export function setToken(token: string): void {
  localStorage.setItem('embark-api-token', token);
}

export function clearToken(): void {
  localStorage.removeItem('embark-api-token');
}

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  code?: string;
  total?: number;
  page?: number;
  limit?: number;
  pages?: number;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { skipRedirectOn401?: boolean } = {}
): Promise<ApiResponse<T>> {
  const { skipRedirectOn401, ...fetchOptions } = options;
  options = fetchOptions;
  const token = getToken();

  // Normalize headers safely — handles Headers object, string[][], or plain object
  const existingHeaders = Object.fromEntries(
    new Headers(options.headers ?? {}).entries()
  );

  const headers: Record<string, string> = { ...existingHeaders };

  // Only set Content-Type for requests that have a body
  if (options.body !== undefined) {
    headers['Content-Type'] ??= 'application/json';
  }

  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { ...options, headers });
  } catch {
    return { data: null, error: 'Network error — could not reach the server', code: 'NETWORK_ERROR' };
  }

  if (res.status === 401) {
    clearToken();
    if (!skipRedirectOn401) window.location.href = '/';
    return { data: null, error: 'Unauthorized', code: 'UNAUTHORIZED' };
  }

  // Guard against non-JSON responses (HTML error pages, 204 No Content, etc.)
  try {
    return await res.json() as ApiResponse<T>;
  } catch {
    return { data: null, error: `Unexpected server response (${res.status})`, code: 'PARSE_ERROR' };
  }
}

export const api = {
  get:    <T>(path: string)                => apiFetch<T>(path),
  post:   <T>(path: string, body: unknown) => apiFetch<T>(path, { method: 'POST',   body: JSON.stringify(body) }),
  patch:  <T>(path: string, body: unknown) => apiFetch<T>(path, { method: 'PATCH',  body: JSON.stringify(body) }),
  put:    <T>(path: string, body: unknown) => apiFetch<T>(path, { method: 'PUT',    body: JSON.stringify(body) }),
  delete: <T>(path: string)               => apiFetch<T>(path, { method: 'DELETE' }),
};
