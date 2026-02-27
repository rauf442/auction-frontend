// frontend/src/lib/api.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : 'http://localhost:3001/api';

// API client with error handling
class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    // Add auth token if available
    const token = localStorage.getItem('token');
    if (token) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${token}`,
      };
    }

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Request failed');
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Auth endpoints
  async login(email: string, password: string, remember: boolean = false) {
    return this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, remember }),
    });
  }

  async logout() {
    return this.request<{ message: string }>('/auth/logout', {
      method: 'POST',
    });
  }

  async verifyToken() {
    return this.request<{ valid: boolean; user: User }>('/auth/verify');
  }

  // Health check
  async healthCheck() {
    return this.request<{ message: string; status: string; timestamp: string; environment: string }>('/');
  }
}

// Types
export interface User {
  id: string;
  email: string;
  role: 'super_admin' | 'admin' | 'accountant' | 'user';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  user: User | null;
  token: string | null;
  error: string | null;
}

// Export singleton instance
export const apiClient = new ApiClient(API_BASE_URL);

export interface Brand { id: string; code: string; name: string }
export async function fetchBrands(): Promise<Brand[]> {
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    const resp = await fetch(`${API_BASE_URL}/brands`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    })
    if (!resp.ok) return []
    const data = await resp.json()
    return data?.data || []
  } catch {
    return []
  }
} 