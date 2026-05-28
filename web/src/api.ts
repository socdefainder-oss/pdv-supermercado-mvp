const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3333';

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export function getToken() {
  return localStorage.getItem('pdv.token');
}

export function setToken(token: string) {
  localStorage.setItem('pdv.token', token);
}

export function clearToken() {
  localStorage.removeItem('pdv.token');
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) throw new ApiError(data?.message ?? 'Falha na comunicacao com a API.', response.status);
  return data as T;
}

export const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
export const money = (cents: number) => brl.format((cents || 0) / 100);
export const toCents = (value: string | number) => Math.round(Number(String(value).replace(',', '.')) * 100 || 0);
export const stockNumber = (value: string | number) => Number(value);
