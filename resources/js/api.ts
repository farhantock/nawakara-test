import {
  User,
  PurchaseRequest,
  CreateRequestPayload,
  ApprovalHistory,
} from './types';

const API_BASE = '/api/v1';

export class ApiError extends Error {
  public status: number;
  public code: string;
  public fields: Record<string, string>;

  constructor(message: string, status: number, code: string, fields: Record<string, string> = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('auth_token');

  // If trying to call a protected endpoint without a token, trigger immediate logout
  const isPublicEndpoint = endpoint.includes('/auth/login');
  if (!token && !isPublicEndpoint) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }
    throw new ApiError('Sesi telah berakhir.', 401, 'UNAUTHENTICATED');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
  const response = await fetch(url, { ...options, headers });

  if (response.status === 204) {
    return null as T;
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorObj = data.error || {};
    const message = errorObj.message || data.message || `Error HTTP ${response.status}`;
    const code = errorObj.code || (response.status === 401 ? 'UNAUTHENTICATED' : 'ERROR');
    const fields = errorObj.fields || data.errors || {};

    if (response.status === 401) {
      localStorage.removeItem('auth_token');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:unauthorized'));
      }
    }

    throw new ApiError(message, response.status, code, fields);
  }

  return data as T;
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
  getMe: () => request<User>('/auth/me'),

  // Requests
  getRequests: (status?: string) => {
    const query = status && status !== 'ALL' ? `?status=${encodeURIComponent(status)}` : '';
    return request<{ data: PurchaseRequest[] }>(`/requests${query}`);
  },
  getRequest: (id: number) => request<PurchaseRequest>(`/requests/${id}`),
  createRequest: (data: CreateRequestPayload) =>
    request<PurchaseRequest>('/requests', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateRequest: (id: number, data: CreateRequestPayload) =>
    request<PurchaseRequest>(`/requests/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  submitRequest: (id: number) =>
    request<PurchaseRequest>(`/requests/${id}/submit`, { method: 'POST' }),
  approveRequest: (id: number, comment?: string) =>
    request<PurchaseRequest>(`/requests/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ comment }),
    }),
  rejectRequest: (id: number, comment: string) =>
    request<PurchaseRequest>(`/requests/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ comment }),
    }),
  getRequestHistory: (id: number) =>
    request<ApprovalHistory[]>(`/requests/${id}/history`),
};
