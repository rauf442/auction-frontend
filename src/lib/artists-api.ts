// frontend/src/lib/artists-api.ts
export interface Artist {
  id?: string;
  name: string;
  birth_year?: number;
  death_year?: number;
  nationality?: string;
  art_movement?: string;
  medium?: string;
  description?: string;
  key_description?: string;
  biography?: string;
  notable_works?: string;
  exhibitions?: string;
  awards?: string;
  signature_style?: string;
  market_value_range?: string;
  ai_generated_fields?: Record<string, any>;
  ai_generated_at?: string;
  ai_source?: string;
  status?: 'active' | 'inactive' | 'archived';
  is_verified?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ArtistsResponse {
  success: boolean;
  data: Artist[];
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

export interface ArtistResponse {
  success: boolean;
  data: Artist;
}

export interface ArtistsFilters {
  status?: string;
  nationality?: string;
  art_movement?: string;
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
  data: Partial<Artist>;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : 'http://localhost:3001/api';

export class ArtistsAPI {
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

  static async getArtists(filters: ArtistsFilters = {}): Promise<ArtistsResponse> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.append(key, value.toString());
      }
    });

    return this.makeRequest(`/artists?${params.toString()}`);
  }

  static async getArtist(id: string): Promise<ArtistResponse> {
    return this.makeRequest(`/artists/${id}`);
  }

  static async createArtist(artist: Omit<Artist, 'id' | 'created_at' | 'updated_at'>): Promise<ArtistResponse> {
    return this.makeRequest('/artists', {
      method: 'POST',
      body: JSON.stringify(artist),
    });
  }

  static async updateArtist(id: string, artist: Partial<Artist>): Promise<ArtistResponse> {
    return this.makeRequest(`/artists/${id}`, {
      method: 'PUT',
      body: JSON.stringify(artist),
    });
  }

  static async deleteArtist(id: string): Promise<{ success: boolean; message: string }> {
    return this.makeRequest(`/artists/${id}`, {
      method: 'DELETE',
    });
  }

  static async generateAI(request: AIGenerateRequest): Promise<AIGenerateResponse> {
    return this.makeRequest('/artists/generate-ai', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  static async bulkAction(action: string, artistIds: string[], data?: any): Promise<{ success: boolean; message: string }> {
    return this.makeRequest('/artists/bulk', {
      method: 'POST',
      body: JSON.stringify({ action, artist_ids: artistIds, data }),
    });
  }

  static async exportCSV(filters: ArtistsFilters = {}): Promise<void> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.append(key, value.toString());
      }
    });

    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/artists/export/csv?${params.toString()}`, {
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
    a.download = `artists-export-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }
} 