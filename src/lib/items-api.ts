// frontend/src/lib/items-api.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : 'http://localhost:3001/api';

console.log('🔗 ITEMS API URL:', API_BASE_URL);

import { autoSyncArtworkToGoogleSheet } from './google-sheets-api';

// Artwork interface matching the actual database schema
export interface Artwork {
  id?: string;
  title: string;                      // Required: Title
  description: string;                // Required: Description
  low_est?: number;                   // Optional: Low Estimate (can be null)
  high_est?: number;                  // Optional: High Estimate (can be null)
  start_price?: number;               // Optional: Start Price
  condition?: string;                 // Optional: Condition
  vendor_id?: number;                 // Optional: Vendor ID (foreign key to clients)
  buyer_id?: number;                  // Optional: Buyer ID (foreign key to clients)

  // Additional auction management fields
  status?: 'draft' | 'active' | 'sold' | 'withdrawn' | 'passed' | 'returned';
  category?: string;
  subcategory?: string;
  materials?: string;
  artist_id?: number;                 // Reference to artist in database
  school_id?: string;                 // School ID (string in database)
  period_age?: string;
  provenance?: string;
  consignment_id?: number;            // Reference to consignment

  // Dimension fields (matching database schema)
  height_inches?: string;
  width_inches?: string;
  height_cm?: string;
  width_cm?: string;
  height_with_frame_inches?: string;
  width_with_frame_inches?: string;
  height_with_frame_cm?: string;
  width_with_frame_cm?: string;
  weight?: string;

  // Certification fields
  artist_certification?: boolean;
  artist_certification_file?: string;
  artist_family_certification?: boolean;
  artist_family_certification_file?: string;
  gallery_certification?: boolean;
  gallery_certification_file?: string;
  gallery_id?: string;
  certified_artist_id?: string;
  restoration_done?: boolean;
  restoration_done_file?: string;
  restoration_by?: string;
  condition_report?: string;

  // Images array (unlimited images)
  images?: string[];

  // Artist information inclusion flags for export descriptions
  include_artist_description?: boolean;
  include_artist_key_description?: boolean;
  include_artist_biography?: boolean;
  include_artist_notable_works?: boolean;
  include_artist_major_exhibitions?: boolean;
  include_artist_awards_honors?: boolean;
  include_artist_market_value_range?: boolean;
  include_artist_signature_style?: boolean;

  // Return fields
  return_date?: string;
  return_location?: string;
  return_reason?: string;
  returned_by_user_id?: string;
  returned_by_user_name?: string;

  // Notes and additional fields
  notes?: string;
  internal_notes?: string;

  // Additional auction fields
  reserve?: number;
  final_price?: number;
  sale_price?: number;
  location?: string;
  storage_location?: string;
  storage_condition?: string;

  // Exhibition and literature
  exhibition_history?: string;
  literature?: string;

  // Technical details
  depth_inches?: string;
  depth_cm?: string;
  weight_lbs?: string;
  weight_kg?: string;
  frame_type?: string;

  // Lot number (can be number or string)
  lot_num?: string | number;

  // Audit fields
  created_at?: string;
  updated_at?: string;
  date_sold?: string;

  // Brand fields (for multi-tenant support)
  brand_id?: number;
  brand_name?: string;
  brand_code?: string;

  // Brand relation (when included from API)
  brands?: {
    id: number;
    name: string;
    code: string;
  };
}

export interface ArtworksResponse {
  success: boolean;
  data: Artwork[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  counts: {
    draft: number;
    active: number;
    sold: number;
    withdrawn: number;
    passed: number;
    returned: number;
  };
}

export interface ArtworkResponse {
  success: boolean;
  data: Artwork;
  message?: string;
}

interface GetArtworksParams {
  status?: string;
  category?: string;
  auction_id?: string;
  consignment_id?: string;
  search?: string;
  page?: number;
  limit?: number;
  sort_field?: string;
  sort_direction?: 'asc' | 'desc';
  brand_code?: string;
  item_ids?: string | string[];
  item_id?: string;
  low_est_min?: string;
  low_est_max?: string;
  high_est_min?: string;
  high_est_max?: string;
  start_price_min?: string;
  start_price_max?: string;
  condition?: string;
  period_age?: string;
  materials?: string;
  artist_id?: string;
  school_id?: string;
  buyer_id?: string;
  vendor_id?: string;
}

// Helper function to get auth token
const getAuthToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token');
  }
  return null;
};

// Helper function to create auth headers
const getAuthHeaders = (): HeadersInit => {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

// Helper function to handle API errors
const handleApiError = async (response: Response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }
  return response;
};

export class ArtworksAPI {
  // Get all artworks with optional filtering and pagination
  static async getArtworks(params: GetArtworksParams = {}): Promise<ArtworksResponse> {
    console.log('🔍 ITEMS API: getArtworks called with params:', params);
    console.log('🔍 ITEMS API: API_BASE_URL:', API_BASE_URL);
    // Brand filtering: empty/null brand_code means show all brands, specific brand_code filters by that brand

    const queryParams = new URLSearchParams();

    // Convert item_id to item_ids for backend compatibility
    const processedParams = { ...params };
    if (processedParams.item_id && !processedParams.item_ids) {
      processedParams.item_ids = processedParams.item_id;
      delete processedParams.item_id;
    }

    Object.entries(processedParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, value.toString());
      }
    });

    const fullUrl = `${API_BASE_URL}/items?${queryParams}`;

    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    console.log('🔍 ITEMS API: Response status:', response.status);
    console.log('🔍 ITEMS API: Response ok:', response.ok);

    await handleApiError(response);
    const result = await response.json();
    console.log('🔍 ITEMS API: Response data:', result);
    return result;
  }

  // Get specific artwork by ID
  static async getArtwork(id: string): Promise<ArtworkResponse> {
    const response = await fetch(`${API_BASE_URL}/items/${id}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    await handleApiError(response);
    return response.json();
  }

  // Create new artwork
  static async createArtwork(artworkData: Omit<Artwork, 'id' | 'created_at' | 'updated_at'>, brand?: string): Promise<ArtworkResponse> {
    // Filter out lot_num if present since it doesn't exist in the database schema
    const { lot_num, ...filteredData } = artworkData;
    console.log('🔍 ITEMS API: Creating artwork with data:', filteredData);
    const response = await fetch(`${API_BASE_URL}/items`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(filteredData),
    });

    await handleApiError(response);
    const result = await response.json();
    
    // Auto-sync to Google Sheets if successful
    if (result.success && result.data && brand) {
      try {
        await autoSyncArtworkToGoogleSheet(result.data, brand);
      } catch (error) {
        console.warn('Auto-sync to Google Sheets failed:', error);
      }
    }
    
    return result;
  }

  // Update existing artwork
  static async updateArtwork(id: string, artworkData: Partial<Artwork>, brand?: string): Promise<ArtworkResponse> {
    // Filter out lot_num if present since it doesn't exist in the database schema
    const { lot_num, ...filteredData } = artworkData;
    const response = await fetch(`${API_BASE_URL}/items/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(filteredData),
    });

    await handleApiError(response);
    const result = await response.json();
    
    // Auto-sync to Google Sheets if successful
    if (result.success && result.data && brand) {
      try {
        await autoSyncArtworkToGoogleSheet(result.data, brand);
      } catch (error) {
        console.warn('Auto-sync to Google Sheets failed:', error);
      }
    }
    
    return result;
  }

  // Delete artwork (soft delete by default)
  static async deleteArtwork(id: string, hardDelete = false): Promise<{ success: boolean; message: string }> {
    const queryParams = hardDelete ? '?hard_delete=true' : '';
    const response = await fetch(`${API_BASE_URL}/items/${id}${queryParams}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    await handleApiError(response);
    return response.json();
  }

  // Bulk operations
  static async bulkAction(
    action: 'delete' | 'update_status',
    itemIds: string[],
    data?: { status?: string }
  ): Promise<{ success: boolean; message: string; affected_count: number }> {
    const response = await fetch(`${API_BASE_URL}/items/bulk-action`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        action,
        item_ids: itemIds,
        data
      }),
    });

    await handleApiError(response);
    return response.json();
  }

  // Export items to CSV by platform
  static async exportCSV(params: {
    auction_id?: string;
    status?: string;
    category?: string;
    platform?: 'database' | 'liveauctioneers' | 'easy_live' | 'invaluable' | 'the_saleroom';
    item_ids?: string[];
    brand_code?: string;
    include_all_fields?: boolean;
  } = {}): Promise<void> {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== 'all') {
        if (key === 'item_ids' && Array.isArray(value)) {
          queryParams.append(key, value.join(','));
        } else {
          queryParams.append(key, value.toString());
        }
      }
    });

    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/items/export/csv?${queryParams}`, {
      method: 'GET',
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
    });

    await handleApiError(response);

    // Create blob and download
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const platformSuffix = params.platform || 'database';
    a.download = `items_${platformSuffix}_export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  // Download a CSV template for IMPORT (used in import dialog)
  static async downloadTemplate(platform: 'database' | 'liveauctioneers' | 'easy_live' | 'invaluable' | 'the_saleroom' = 'database') {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/items/import/template?platform=${platform}`, {
      method: 'GET',
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
    });
    await handleApiError(response);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `items_${platform}_import_template.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  // Download a CSV template for EXPORT (used in export dialog)
  static async downloadExportTemplate(platform: 'database' | 'liveauctioneers' | 'easy_live' | 'invaluable' | 'the_saleroom' = 'database') {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/items/export/template?platform=${platform}`, {
      method: 'GET',
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
    });
    await handleApiError(response);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `items_${platform}_export_template.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  // Preview drive folder mapping
  static async previewDriveMapping(driveFolderUrl: string): Promise<{
    success: boolean;
    mapping_preview?: Record<string, { images: { filename: string; url: string; fileId: string }[]; count: number }>;
    total_files?: number;
    mapped_ids?: number;
    error?: string;
  }> {
    const response = await fetch(`${API_BASE_URL}/items/preview/drive-mapping`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        drive_folder_url: driveFolderUrl
      }),
    });

    return response.json();
  }

  // Validate CSV data before upload
  static async validateCSV(csvData: string, platform: 'database' | 'liveauctioneers' | 'easy_live' | 'invaluable' | 'the_saleroom' = 'database'): Promise<{
    success: boolean;
    validation_result?: {
      total_rows: number;
      valid_rows: number;
      errors: string[];
      sample_items: Artwork[];
    };
    error?: string;
  }> {
    const response = await fetch(`${API_BASE_URL}/items/upload/csv`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        csvData,
        validateOnly: true,
        platform
      }),
    });

    return response.json();
  }

  // Upload items from CSV (LiveAuctioneers compatible format)
  static async uploadCSV(
    csvData: string,
    platform: 'database' | 'liveauctioneers' | 'easy_live' | 'invaluable' | 'the_saleroom' = 'database',
    driveFolderUrl?: string,
    options?: { brand_code?: string; include_all_fields?: boolean; auction_id?: number }
  ): Promise<{
    success: boolean;
    message?: string;
    imported_count?: number;
    items?: Artwork[];
    error?: string;
    errors?: string[];
    existing_lot_numbers?: string[];
    duplicate_lot_numbers?: string[];
    auto_sync?: {
      success: boolean;
      message?: string;
      synced_count?: number;
    };
  }> {
    const response = await fetch(`${API_BASE_URL}/items/upload/csv`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        csvData,
        validateOnly: false,
        platform,
        drive_folder_url: driveFolderUrl,
        ...(options?.brand_code && { brand_code: options.brand_code }),
        ...(options?.include_all_fields && { include_all_fields: options.include_all_fields }),
        ...(options?.auction_id && { auction_id: options.auction_id })
      }),
    });

    return response.json();
  }

  // Upload images to a platform FTP (e.g., LiveAuctioneers)
  static async uploadImagesViaFTP(params: {
    host: string;
    user: string;
    password: string;
    secure?: boolean;
    base_dir?: string;
    files: { path: string; content: string; encoding?: 'base64' | 'utf8' }[];
  }): Promise<{ success: boolean; uploaded?: number; error?: string; details?: string }> {
    const response = await fetch(`${API_BASE_URL}/items/images/upload/ftp`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(params),
    })
    return response.json()
  }

  // Auto-upload images to FTP by fetching item image URLs (by auction_id or item_ids)
  static async uploadImagesViaFTPFromItems(params: {
    brand_code: string;
    platform?: 'liveauctioneers';
    auction_id?: string;
    item_ids?: string[];
    base_dir?: string;
    host?: string;
    secure?: boolean;
  }): Promise<{ success?: boolean; uploaded?: number; errors?: string[]; error?: string; details?: string }> {
    const response = await fetch(`${API_BASE_URL}/items/images/upload/ftp/from-items`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(params),
    })
    return response.json()
  }

  // Detect duplicate images among items
  static async detectDuplicateImages(params: {
    brand_code?: string;
    similarity_threshold?: number; // 0.8 = 80% similarity
    status_filter?: string[];
    // Advanced filters
    item_id_filter?: string;
    category?: string;
    low_est_min?: string;
    low_est_max?: string;
    high_est_min?: string;
    high_est_max?: string;
    start_price_min?: string;
    start_price_max?: string;
    condition?: string;
    period_age?: string;
    materials?: string;
    artist_id?: string;
    school_id?: string;
    buyer_id?: string;
    vendor_id?: string;
  } = {}): Promise<{
    success: boolean;
    duplicates?: {
      group_id: string;
      similarity_score: number;
      type?: 'exact_image' | 'exact_title' | 'similar';
      match_value?: string;
      items: {
        id: string;
        title: string;
        lot_num?: string;
        image_url: string;
        status: string;
        created_at: string;
      }[];
    }[];
    total_groups?: number;
    total_items_checked?: number;
    exact_groups?: number;
    similar_groups?: number;
    error?: string;
  }> {
    const response = await fetch(`${API_BASE_URL}/items/detect-duplicates`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(params),
    });

    await handleApiError(response);
    return response.json();
  }

  // Get duplicate detection status (for long-running operations)
  static async getDuplicateDetectionStatus(taskId: string): Promise<{
    success: boolean;
    status: 'pending' | 'running' | 'completed' | 'failed';
    progress?: number;
    result?: any;
    error?: string;
  }> {
    const response = await fetch(`${API_BASE_URL}/items/detect-duplicates/status/${taskId}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    await handleApiError(response);
    return response.json();
  }

  // AI analyze image by URL (for edit mode)
  static async aiAnalyzeUrl(imageUrl: string): Promise<{
    success: boolean;
    result?: {
      title: string;
      description: string;
      category: string;
      materials: string;
      period_age: string;
      condition: string;
      low_est: number;
      high_est: number;
      start_price: number;
      reserve: number;
      artist_id: number | null;
      height_inches: string;
      width_inches: string;
      height_cm: string;
      width_cm: string;
      height_with_frame_inches: string;
      width_with_frame_inches: string;
      height_with_frame_cm: string;
      width_with_frame_cm: string;
      include_artist_description: boolean;
      include_artist_key_description: boolean;
      include_artist_biography: boolean;
      include_artist_notable_works: boolean;
      include_artist_major_exhibitions: boolean;
      include_artist_awards_honors: boolean;
      include_artist_market_value_range: boolean;
      include_artist_signature_style: boolean;
    };
    error?: string;
    details?: string;
  }> {
    const response = await fetch(`${API_BASE_URL}/items/ai-analyze-url`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ imageUrl })
    });

    await handleApiError(response);
    return response.json();
  }
}

// Platform credentials helpers (used by frontend components to pull saved creds)
export async function getPlatformCredentials(brandCode: string, platform: string) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  const res = await fetch(`${API_BASE_URL}/platform-credentials?brand_code=${encodeURIComponent(brandCode)}&platform=${encodeURIComponent(platform)}`, {
    headers: {
      ...(token && { Authorization: `Bearer ${token}` })
    }
  })
  if (!res.ok) throw new Error('Failed to fetch platform credentials')
  const data = await res.json()
  return Array.isArray(data.data) ? data.data[0] : null
}

// Validation functions
export const validateArtworkData = (data: Partial<Artwork>): string[] => {
  const errors: string[] = [];


  if (!data.title?.trim()) {
    errors.push('Title is required');
  } else if (data.title.length > 200) {
    errors.push('Title must be 200 characters or less');
  }

  if (!data.description?.trim()) {
    errors.push('Description is required');
  }

  if (!data.low_est || data.low_est <= 0) {
    errors.push('Low estimate is required and must be greater than 0');
  }

  if (!data.high_est || data.high_est <= 0) {
    errors.push('High estimate is required and must be greater than 0');
  }

  if (data.low_est && data.high_est && data.low_est >= data.high_est) {
    errors.push('High estimate must be greater than low estimate');
  }

  if (data.start_price && data.low_est && data.start_price > data.low_est) {
    errors.push('Start price cannot be greater than low estimate');
  }

  return errors;
};

// Helper functions
export const formatCurrency = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '£0'
  }
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'active': return 'bg-green-500';
    case 'sold': return 'bg-blue-500';
    case 'withdrawn': return 'bg-red-500';
    case 'passed': return 'bg-gray-500';
    case 'draft': return 'bg-yellow-500';
    case 'returned': return 'bg-orange-500';
    default: return 'bg-gray-400';
  }
};

export const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'active': return 'Active';
    case 'sold': return 'Sold';
    case 'withdrawn': return 'Withdrawn';
    case 'passed': return 'Passed';
    case 'draft': return 'Draft';
    case 'returned': return 'Returned';
    default: return 'Unknown';
  }
};

export const formatLotNumber = (lotNum: string): string => {
  return lotNum.toUpperCase().trim();
};

export const generateStartPrice = (lowEst: number): number => {
  return Math.round(lowEst * 0.5);
};

// Generate reserve price for AI data (set to same as start price)
export const generateReservePriceForAI = (startPrice: number): number => {
  return startPrice;
};

// Categories for dropdown selections
export const ITEM_CATEGORIES = [
  'Clocks',
  'Watches',
  'Islamic Art',
  'Judaean Art',
  'Christian Art',
  'Tribal Art',
  'Art of Africa',
  'South East Asian Art',
  'Automobilia',
  'Designer Jewellery',
  'Designer Furniture',
  'Antique Furniture',
  'Qajar',
  'Baseball Cards',
  'Match Labels',
  'Cricket Memorabilia',
  'Football Memorabilia',
  'Coins / Numismatics',
  'Philately / Stamps',
  'Documents',
  'Memorabilia',
  'Books',
  'Antique Weapons',
  'Americana',
  'Limited Edition Prints',
  'Ceramic Dolls',
  'Dolls',
  'Lighting',
  'Ottoman Empire',
  'Roman',
  'Greek',
  'Gandhara',
  'Gupta',
  'Satvahana',
  'Khmer',
  'Cambodian',
  'Burma',
  'Thailand',
  'Afghanistan',
  'Pakistan',
  'Persian',
  'Jain',
  'Tantric',
  'Buddhist',
  'Tibet'
];

// Periods for dropdown selections
export const ITEM_PERIODS = [
  'Medieval',
  'Ancient',
  'Early 20th Century',
  'Mid 20th Century',
  '18th / 19th Century',
  'Art Nouveau Period',
  'Chalcolithic Period',
  'Iron Age',
  'Bronze Age',
  'Angkor Period'
];

// Materials for dropdown selections
export const ITEM_MATERIALS = [
  'Gouache',
  'Tempera',
  'Etchings',
  'Lithography',
  'Oleograph',
  'Jade',
  'Jadeite',
  'Hardstone',
  'Terracotta',
  'Bronze',
  'Brass',
  'Wood',
  'Mixed Metal',
  'Gilt Bronze',
  'Tribal Silver',
  'Enameled Silver'
];

export const ITEM_CONDITIONS = [
  'Excellent',
  'Very Good',
  'Good',
  'Fair',
  'Poor',
  'As Found',
  'Restored',
  'Original Condition'
];

export const ITEM_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'sold', label: 'Sold' },
  { value: 'withdrawn', label: 'Withdrawn' },
  { value: 'passed', label: 'Passed' },
  { value: 'returned', label: 'Returned' }
]; 


// ============= Replica of clients google sheet =============

export interface SyncStatus {
  pollingActive: boolean;
  scheduledActive: boolean;
  lastSyncTimestamps: Record<string, string>;
  syncInProgress: string[];
}


export interface SyncResult {
  success: boolean;
  message: string;
  changesProcessed?: number;
}

const createHeaders = (): HeadersInit => {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

export const getSyncStatus = async (): Promise<{ success: boolean; status: SyncStatus }> => {
  const response = await fetch(`${API_BASE_URL}/items/sync-manager/status`, {
    method: 'GET',
    headers: createHeaders()
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  return response.json();
};


export const triggerManualSync = async (): Promise<SyncResult> => {
  const response = await fetch(`${API_BASE_URL}/items/sync-manager/manual`, {
    method: 'POST',
    headers: createHeaders(),
    body: JSON.stringify({})
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  return response.json();
};

export const startScheduledSync = async (): Promise<{ success: boolean; message: string }> => {
  const response = await fetch(`${API_BASE_URL}/items/sync-manager/start-scheduled`, {
    method: 'POST',
    headers: createHeaders(),
    body: JSON.stringify({})
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  return response.json();
};

export const stopScheduledSync = async (): Promise<{ success: boolean; message: string }> => {
  const response = await fetch(`${API_BASE_URL}/items/sync-manager/stop-scheduled`, {
    method: 'POST',
    headers: createHeaders(),
    body: JSON.stringify({})
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  return response.json();
};

/**
 * Start polling sync
 */
export const startPollingSync = async (intervalMinutes: number = 15): Promise<{ success: boolean; message: string }> => {
  const response = await fetch(`${API_BASE_URL}/items/sync-manager/start-polling`, {
    method: 'POST',
    headers: createHeaders(),
    body: JSON.stringify({ interval_minutes: intervalMinutes })
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  return response.json();
};

/**
 * Stop polling sync
 */
export const stopPollingSync = async (): Promise<{ success: boolean; message: string }> => {
  const response = await fetch(`${API_BASE_URL}/items/sync-manager/stop-polling`, {
    method: 'POST',
    headers: createHeaders(),
    body: JSON.stringify({})
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  return response.json();
};

/**
 * Sync items to Google Sheets (existing functionality)
 */
export const syncitemsToGoogleSheets = async (sheetUrl: string, clientIds?: number[]): Promise<{ success: boolean; message: string; count: number }> => {
  const response = await fetch(`${API_BASE_URL}/items/sync-to-google-sheet`, {
    method: 'POST',
    headers: createHeaders(),
    body: JSON.stringify({
      sheet_url: sheetUrl,
      client_ids: clientIds
    })
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  return response.json();
};

/**
 * Sync from Google Sheets to database (existing functionality)
 */
export const syncitemsFromGoogleSheets = async (sheetUrl: string, defaultBrand?: string): Promise<{ success: boolean; message: string; imported?: number; upserted?: number }> => {
  const response = await fetch(`${API_BASE_URL}/items/sync-google-sheet`, {
    method: 'POST',
    headers: createHeaders(),
    body: JSON.stringify({
      sheet_url: sheetUrl,
      default_brand: defaultBrand
    })
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  return response.json();
};


// Debug function to check authentication and sync status
export const debugSyncManager = async (): Promise<{ success: boolean; message: string; details?: any }> => {
  console.log('🔧 Debug: Checking authentication and sync manager status');

  const token = getAuthToken();
  console.log('🔑 Auth token present:', !!token);
  console.log('🔗 API Base URL:', API_BASE_URL);

  if (!token) {
    return {
      success: false,
      message: 'No authentication token found. Please log in first.',
      details: {
        tokenPresent: false,
        apiUrl: API_BASE_URL
      }
    };
  }

  try {
    // Test sync status endpoint
    const statusResponse = await fetch(`${API_BASE_URL}/items/sync-manager/status`, {
      method: 'GET',
      headers: createHeaders()
    });

    if (!statusResponse.ok) {
      console.error('❌ Sync status endpoint failed:', statusResponse.status, statusResponse.statusText);
      return {
        success: false,
        message: `Sync status endpoint failed: ${statusResponse.status} ${statusResponse.statusText}`,
        details: {
          status: statusResponse.status,
          statusText: statusResponse.statusText,
          url: statusResponse.url,
          authenticated: true
        }
      };
    }

    const statusData = await statusResponse.json();
    console.log('✅ Sync status endpoint successful:', statusData);

    return {
      success: true,
      message: 'Sync manager is working correctly',
      details: {
        authenticated: true,
        syncStatus: statusData,
        apiUrl: API_BASE_URL
      }
    };

  } catch (error: any) {
    console.error('❌ Sync manager debug failed:', error);
    return {
      success: false,
      message: `Sync manager debug failed: ${error.message}`,
      details: {
        error: error.message,
        authenticated: true,
        apiUrl: API_BASE_URL
      }
    };
  }
};
