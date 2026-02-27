// frontend/src/lib/schools-api.ts
export interface School {
  id?: string;
  name: string;
  founded_year?: number;
  closed_year?: number;
  location?: string;
  country?: string;
  school_type?: string;
  art_movements?: string;
  specialties?: string;
  description?: string;
  history?: string;
  notable_alumni?: string;
  teaching_philosophy?: string;
  programs_offered?: string;
  facilities?: string;
  reputation_notes?: string;
  ai_generated_fields?: Record<string, any>;
  ai_generated_at?: string;
  ai_source?: string;
  status?: 'active' | 'inactive' | 'archived';
  is_verified?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface SchoolsResponse {
  success: boolean;
  data: School[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  counts: {
    active: number;
    inactive: number;
    archived: number;
  };
}

export interface SchoolResponse {
  success: boolean;
  data: School;
}

export interface SchoolsFilters {
  status?: string;
  country?: string;
  school_type?: string;
  search?: string;
  page?: number;
  limit?: number;
  sort_field?: string;
  sort_direction?: 'asc' | 'desc';
}

export interface AIGenerateRequest {
  name: string;
}

export interface AIGenerateResponse {
  success: boolean;
  data: Partial<School>;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : 'http://localhost:3001/api';

export class SchoolsAPI {
  private static async makeRequest(endpoint: string, options: RequestInit = {}) {
    const token = localStorage.getItem('token');

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

  static async getSchools(filters: SchoolsFilters = {}): Promise<SchoolsResponse> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.append(key, value.toString());
      }
    });

    return this.makeRequest(`/schools?${params.toString()}`);
  }

  static async getSchool(id: string): Promise<SchoolResponse> {
    return this.makeRequest(`/schools/${id}`);
  }

  static async createSchool(school: Omit<School, 'id' | 'created_at' | 'updated_at'>): Promise<SchoolResponse> {
    return this.makeRequest('/schools', {
      method: 'POST',
      body: JSON.stringify(school),
    });
  }

  static async updateSchool(id: string, school: Partial<School>): Promise<SchoolResponse> {
    return this.makeRequest(`/schools/${id}`, {
      method: 'PUT',
      body: JSON.stringify(school),
    });
  }

  static async deleteSchool(id: string): Promise<{ success: boolean; message: string }> {
    return this.makeRequest(`/schools/${id}`, {
      method: 'DELETE',
    });
  }

  static async generateAI(request: AIGenerateRequest): Promise<AIGenerateResponse> {
    return this.makeRequest('/schools/generate-ai', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  static async bulkAction(action: string, schoolIds: string[], data?: any): Promise<{ success: boolean; message: string }> {
    return this.makeRequest('/schools/bulk', {
      method: 'POST',
      body: JSON.stringify({ action, school_ids: schoolIds, data }),
    });
  }

  static async exportCSV(filters: SchoolsFilters = {}): Promise<void> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.append(key, value.toString());
      }
    });

    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/schools/export/csv?${params.toString()}`, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to export CSV');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `schools-export-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }
} 