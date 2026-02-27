// frontend/src/lib/users-api.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : 'http://localhost:3001/api';

// Get authentication token from localStorage
const getAuthToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token');
  }
  return null;
};

// User interface
export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  position?: string;
  is_active: boolean;
  last_activity?: string;
  two_factor_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserResponse {
  success: boolean;
  data: User[];
  error?: string;
}

export interface CreateUserRequest {
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  position?: string;
  is_active?: boolean;
  two_factor_enabled?: boolean;
}

export interface UpdateUserRequest {
  email?: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  position?: string;
  is_active?: boolean;
  two_factor_enabled?: boolean;
}

export interface BrandMember {
  id: number
  role: 'admin' | 'accountant' | 'user'
  user: Pick<User, 'id' | 'email' | 'first_name' | 'last_name' | 'role'>
}

class UsersAPI {
  private static async makeRequest(endpoint: string, options: RequestInit = {}) {
    const token = getAuthToken();

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Get all users
  static async getUsers(params?: { brand_id?: number }): Promise<UserResponse> {
    const qp = params?.brand_id ? `?brand_id=${params.brand_id}` : ''
    return this.makeRequest(`/users${qp}`);
  }

  // Get user by ID
  static async getUser(id: number): Promise<{ success: boolean; data: User; error?: string }> {
    return this.makeRequest(`/users/${id}`);
  }

  // Create user
  static async createUser(userData: CreateUserRequest): Promise<{ success: boolean; data: User; error?: string }> {
    return this.makeRequest('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  // Update user
  static async updateUser(id: number, userData: UpdateUserRequest): Promise<{ success: boolean; data: User; error?: string }> {
    return this.makeRequest(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  // Delete user
  static async deleteUser(id: number): Promise<{ success: boolean; error?: string }> {
    return this.makeRequest(`/users/${id}`, {
      method: 'DELETE',
    });
  }

  // Update user role
  static async updateUserRole(id: number, role: string): Promise<{ success: boolean; data: User; error?: string }> {
    return this.makeRequest(`/users/${id}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    });
  }
}

export default UsersAPI; 