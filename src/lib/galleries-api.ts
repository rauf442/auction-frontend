// frontend/src/lib/galleries-api.ts
export interface Gallery {
  id?: string;
  name: string;
  location?: string;
  country?: string;
  founded_year?: number;
  director?: string;
  website?: string;
  description?: string;
  about?: string;
  specialties?: string;
  notable_exhibitions?: string;
  represented_artists?: string;
  address?: string;
  phone?: string;
  email?: string;
  gallery_type?: 'commercial' | 'museum' | 'institution' | 'private' | 'cooperative';
  status?: 'active' | 'inactive' | 'archived';
  is_verified?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface GalleriesResponse {
  success: boolean;
  data: Gallery[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface GalleryResponse {
  success: boolean;
  data: Gallery;
}

export interface GalleriesFilters {
  status?: string;
  location?: string;
  country?: string;
  gallery_type?: string;
  search?: string;
  page?: number;
  limit?: number;
  sort_field?: string;
  sort_direction?: 'asc' | 'desc';
}

export interface AIGenerateRequest {
  name: string;
  location?: string;
}

export interface AIGenerateResponse {
  success: boolean;
  data: Partial<Gallery> & {
    ai_generated_fields?: { [key: string]: boolean };
  };
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : 'http://localhost:3001/api';

export class GalleriesAPI {
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

  static async getGalleries(filters: GalleriesFilters = {}): Promise<GalleriesResponse> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.append(key, value.toString());
      }
    });

    return this.makeRequest(`/galleries?${params.toString()}`);
  }

  static async getGallery(id: string): Promise<GalleryResponse> {
    return this.makeRequest(`/galleries/${id}`);
  }

  static async createGallery(gallery: Omit<Gallery, 'id' | 'created_at' | 'updated_at'>): Promise<GalleryResponse> {
    return this.makeRequest('/galleries', {
      method: 'POST',
      body: JSON.stringify(gallery),
    });
  }

  static async updateGallery(id: string, gallery: Partial<Gallery>): Promise<GalleryResponse> {
    return this.makeRequest(`/galleries/${id}`, {
      method: 'PUT',
      body: JSON.stringify(gallery),
    });
  }

  static async deleteGallery(id: string): Promise<{ success: boolean; message: string }> {
    return this.makeRequest(`/galleries/${id}`, {
      method: 'DELETE',
    });
  }

  static async bulkAction(action: string, galleryIds: string[], data?: any): Promise<{ success: boolean; message: string }> {
    return this.makeRequest('/galleries/bulk', {
      method: 'POST',
      body: JSON.stringify({ action, ids: galleryIds, data }),
    });
  }

  static async exportCSV(filters: GalleriesFilters = {}): Promise<void> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.append(key, value.toString());
      }
    });

    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/galleries/export/csv?${params.toString()}`, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to export galleries');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'galleries.csv';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  static async importCSV(file: File): Promise<{ success: boolean; message: string; imported: number; errors: string[] }> {
    const formData = new FormData();
    formData.append('file', file);

    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/galleries/import/csv`, {
      method: 'POST',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  static async generateAI(request: AIGenerateRequest): Promise<AIGenerateResponse> {
    return this.makeRequest('/galleries/generate-ai', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }
} 