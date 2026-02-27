// frontend/src/lib/clients-api.ts

// Client interface with integer ID
export interface Client {
  id?: number; // Changed from string to number
  brand?: string; // Brand code used for dynamic display prefix (e.g., MSABER)
  brand_code?: string; // Provided by backend enrichment
  brand_name?: string; // Provided by backend enrichment
  brand_id?: string; // FK to brands table
  title?: string;
  first_name: string;
  last_name: string;
  salutation?: string;
  birth_date?: string;
  preferred_language?: string;
  time_zone?: string;
  tags?: string;
  email?: string;
  phone_number?: string;
  company_name?: string;
  vat_number?: string;
  has_no_email?: boolean;
  vat_applicable?: boolean;
  secondary_email?: string;
  secondary_phone_number?: string;
  instagram_url?: string;
  client_type?: 'buyer' | 'vendor' | 'supplier' | 'buyer_vendor'; // Combined field for easier filtering
  default_vat_scheme?: string;
  default_ldl?: string;
  default_consignment_charges?: string;
  billing_address1?: string;
  billing_address2?: string;
  billing_address3?: string;
  billing_city?: string;
  billing_post_code?: string;
  billing_country?: string;
  billing_region?: string;
  bank_account_details?: string;
  bank_address?: string;
  buyer_premium?: number;
  vendor_premium?: number;
  shipping_same_as_billing?: boolean;
  shipping_address1?: string;
  shipping_address2?: string;
  shipping_address3?: string;
  shipping_city?: string;
  shipping_post_code?: string;
  shipping_country?: string;
  shipping_region?: string;
  status?: 'active' | 'suspended' | 'pending' | 'deleted' | 'archived';
  role?: string;
  paddle_no?: string;
  identity_cert?: string;
  platform?: 'Liveauctioneer' | 'The saleroom' | 'Invaluable' | 'Easylive auctions' | 'Private' | 'Others';
  // Bidder Analytics fields
  card_on_file?: boolean;
  auctions_attended?: number;
  bids_placed?: number;
  items_won?: number;
  tax_exemption?: boolean;
  payment_rate?: number;
  avg_hammer_price_low?: number;
  avg_hammer_price_high?: number;
  disputes_open?: number;
  disputes_closed?: number;
  bidder_notes?: string;
  created_at?: string;
  updated_at?: string;
}

// Response interface for paginated results
export interface ClientsResponse {
  success: boolean;
  data: Client[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  counts: {
    active: number;
    suspended: number;
    pending: number;
    archived: number;
    deleted: number;
  };
}

// Single client response interface
export interface ClientResponse {
  success: boolean;
  data: Client;
  message?: string;
}

export interface ClientOverviewResponse {
  success: boolean;
  data: {
    client: Client;
    purchases: any[];
    consignments: any[];
    invoices: any[];
    logistics: any[];
  };
}

// Bulk action request interface
export interface BulkActionRequest {
  action: 'delete' | 'update_status';
  client_ids: number[];
  data?: {
    status?: string;
  };
}

// CSV validation response interface
export interface CSVValidationResponse {
  success: boolean;
  validation_result: {
    total_rows: number;
    valid_rows: number;
    errors: string[];
    sample_clients: Client[];
  };
}

// CSV upload response interface
export interface CSVUploadResponse {
  success: boolean;
  message: string;
  imported_count: number;
  clients: Client[];
  errors: string[];
  existing_emails: string[];
  duplicate_emails: string[];
}

// Utility function to format client display (MSA-XXX format)
export const formatClientDisplay = (client: Client): string => {
  // Compute dynamically from brand code (brand_code or brand) + id
  console.log('🔍 Client:', client.brand_code, client.brand, client.brand_id);
  const rawBrand = client.brand_code || client.brand || '';
  const prefix = rawBrand.trim().length > 0
    ? rawBrand.trim().toUpperCase().slice(0, 3)
    : '';
  return client.id ? `${prefix}-${client.id.toString().padStart(3, '0')}` : 'Unknown';
};

// Utility function to get client full name
export const getClientFullName = (client: Client): string => {
  return `${client.first_name} ${client.last_name}`.trim();
};

// Utility function to get client display name (includes company if available)
export const getClientDisplayName = (client: Client): string => {
  const fullName = getClientFullName(client);
  return client.company_name ? `${fullName} (${client.company_name})` : fullName;
};

// Utility function to get client type display
export const getClientTypeDisplay = (client: Client): string => {
  switch (client.client_type) {
    case 'buyer_vendor':
      return 'Buyer & Vendor';
    case 'buyer':
      return 'Buyer';
    case 'vendor':
      return 'Vendor';
    case 'supplier':
      return 'Supplier';
    default:
      return 'Buyer';
  }
};

// Utility function to get client type color for badges
export const getClientTypeColor = (client: Client): string => {
  switch (client.client_type) {
    case 'buyer_vendor':
      return 'bg-purple-100 text-purple-800';
    case 'buyer':
      return 'bg-green-100 text-green-800';
    case 'vendor':
      return 'bg-blue-100 text-blue-800';
    case 'supplier':
      return 'bg-orange-100 text-orange-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

// Utility function to determine client type from boolean flags
export const determineClientType = (client: Client): 'buyer' | 'vendor' | 'supplier' | 'buyer_vendor' => {
  return client.client_type || 'buyer';
};

// Base API URL - Use environment URLs directly
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : 'http://localhost:3001/api';

console.log('🔗 API URL:', API_BASE_URL);

// Debug function to test backend connectivity
export const testBackendConnectivity = async (): Promise<{ success: boolean; message: string; details?: any }> => {
  const backendUrl = API_BASE_URL.replace('/api', '');
  console.log('🔍 Testing backend connectivity:', { backendUrl, apiBaseUrl: API_BASE_URL });

  try {
    // Test health check endpoint
    const healthResponse = await fetch(`${backendUrl}/`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!healthResponse.ok) {
      return {
        success: false,
        message: `Backend health check failed: ${healthResponse.status} ${healthResponse.statusText}`,
        details: {
          status: healthResponse.status,
          statusText: healthResponse.statusText,
          url: healthResponse.url
        }
      };
    }

    const healthData = await healthResponse.json();
    console.log('✅ Backend health check successful:', healthData);

    return {
      success: true,
      message: 'Backend is reachable and healthy',
      details: healthData
    };
  } catch (error: any) {
    console.error('❌ Backend connectivity test failed:', error);
    return {
      success: false,
      message: `Cannot connect to backend: ${error.message}`,
      details: {
        error: error.message,
        backendUrl,
        apiBaseUrl: API_BASE_URL,
        nodeEnv: process.env.NODE_ENV,
        nextPublicApiUrl: process.env.NEXT_PUBLIC_API_URL
      }
    };
  }
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
    const statusResponse = await fetch(`${API_BASE_URL}/clients/sync-manager/status`, {
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

// Get authentication token from localStorage or cookies
const getAuthToken = (): string | null => {
  return localStorage.getItem('token');
};

// Create headers with authentication
const createHeaders = (): HeadersInit => {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

// Handle API response errors with detailed logging
const handleApiError = async (response: Response): Promise<never> => {
  const url = response.url;
  const method = response.status >= 500 ? 'SERVER_ERROR' : 'CLIENT_ERROR';
  const contentType = response.headers.get('content-type');

  console.error(`🚨 API ${method}:`, {
    url,
    status: response.status,
    statusText: response.statusText,
    headers: Object.fromEntries(response.headers.entries()),
    timestamp: new Date().toISOString()
  });

  // Handle authentication errors specifically
  if (response.status === 401 || response.status === 403) {
    console.error('🔐 Authentication failed. Please check if user is logged in.');
    console.error('🔑 Token status:', {
      hasToken: !!getAuthToken(),
      tokenPreview: getAuthToken() ? getAuthToken()!.substring(0, 20) + '...' : 'none'
    });
    throw new Error('Authentication required. Please log in and try again.');
  }

  if (response.status === 404) {
    console.error('🛣️ Route not found. Check if the backend is running and routes are registered.');
    throw new Error('API endpoint not found. Please check backend configuration.');
  }

  if (contentType && contentType.includes('application/json')) {
    try {
      const errorData = await response.json();
      console.error('📋 Error response body:', errorData);
      throw new Error(errorData.error || errorData.message || `HTTP error! status: ${response.status}`);
    } catch (parseError) {
      console.error('❌ Failed to parse error response as JSON:', parseError);
      throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
    }
  } else {
    // Try to get text response for debugging
    try {
      const textResponse = await response.text();
      console.error('📄 Error response (text):', textResponse.substring(0, 500));
    } catch (textError) {
      console.error('❌ Could not read error response:', textError);
    }
    throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
  }
};

/**
 * Fetch clients with filtering, pagination, and search
 */
export const fetchClients = async (params: {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
  sort_field?: string;
  sort_direction?: 'asc' | 'desc';
  brand_code?: string;
  client_type?: 'buyer' | 'vendor' | 'supplier' | 'buyer_vendor';
  tags?: string;
  platform?: 'all' | 'Liveauctioneer' | 'The saleroom' | 'Invaluable' | 'Easylive auctions' | 'Private' | 'Others';
  registration_date?: 'all' | '30days' | '3months' | '6months' | '1year';
} = {}): Promise<ClientsResponse> => {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, value.toString());
    }
  });

  const url = `${API_BASE_URL}/clients?${searchParams.toString()}`;

  console.log('🌐 FETCHING CLIENTS:', {
    url,
    baseUrl: API_BASE_URL,
    params: Object.fromEntries(searchParams.entries()),
    env: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: createHeaders()
    });

    console.log('📡 CLIENTS API RESPONSE:', {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      url: response.url,
      headers: Object.fromEntries(response.headers.entries())
    });

    if (!response.ok) {
      await handleApiError(response);
    }

    const data = await response.json();
    console.log('✅ CLIENTS DATA RECEIVED:', {
      success: data.success,
      count: data.data?.length || 0,
      total: data.pagination?.total || 0
    });

    return data;
  } catch (error: any) {
    console.error('❌ FETCH CLIENTS ERROR:', {
      error: error.message,
      stack: error.stack,
      url,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
};

/**
 * Fetch a single client by integer ID
 */
export const fetchClient = async (id: number): Promise<ClientResponse> => {
  const response = await fetch(`${API_BASE_URL}/clients/${id}`, {
    method: 'GET',
    headers: createHeaders()
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  return response.json();
};

/**
 * Fetch client overview (purchases, consignments, invoices, logistics)
 */
export const fetchClientOverview = async (id: number): Promise<ClientOverviewResponse> => {
  const response = await fetch(`${API_BASE_URL}/clients/${id}/overview`, {
    method: 'GET',
    headers: createHeaders()
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  return response.json();
};

/**
 * Create a new client
 */
export const createClient = async (clientData: Omit<Client, 'id' | 'created_at' | 'updated_at'>): Promise<ClientResponse> => {
  const response = await fetch(`${API_BASE_URL}/clients`, {
    method: 'POST',
    headers: createHeaders(),
    body: JSON.stringify(clientData)
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  return response.json();
};

/**
 * Update an existing client
 */
export const updateClient = async (id: number, clientData: Partial<Client>): Promise<ClientResponse> => {
  const response = await fetch(`${API_BASE_URL}/clients/${id}`, {
    method: 'PUT',
    headers: createHeaders(),
    body: JSON.stringify(clientData)
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  return response.json();
};

/**
 * Delete a client (soft delete by default)
 */
export const deleteClient = async (id: number, hardDelete: boolean = false): Promise<{ success: boolean; message: string }> => {
  const url = hardDelete 
    ? `${API_BASE_URL}/clients/${id}?hard_delete=true`
    : `${API_BASE_URL}/clients/${id}`;
    
  const response = await fetch(url, {
    method: 'DELETE',
    headers: createHeaders()
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  return response.json();
};

/**
 * Perform bulk actions on multiple clients
 */
export const bulkActionClients = async (request: BulkActionRequest): Promise<{ success: boolean; message: string; affected_count: number }> => {
  const response = await fetch(`${API_BASE_URL}/clients/bulk-action`, {
    method: 'POST',
    headers: createHeaders(),
    body: JSON.stringify(request)
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  return response.json();
};

/**
 * Validate CSV data before import
 */
export const validateClientCSV = async (csvData: string): Promise<CSVValidationResponse> => {
  const response = await fetch(`${API_BASE_URL}/clients/validate-csv`, {
    method: 'POST',
    headers: createHeaders(),
    body: JSON.stringify({ csv_data: csvData })
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  return response.json();
};

/**
 * Upload and import clients from CSV
 */
export const uploadClientCSV = async (csvData: string): Promise<CSVUploadResponse> => {
  const response = await fetch(`${API_BASE_URL}/clients/upload-csv`, {
    method: 'POST',
    headers: createHeaders(),
    body: JSON.stringify({ csv_data: csvData })
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  return response.json();
};

/**
 * Export clients to CSV
 */
export const exportClientsCSV = async (params: {
  status?: string;
  search?: string;
} = {}): Promise<Blob> => {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, value.toString());
    }
  });

  const url = `${API_BASE_URL}/clients/export/csv?${searchParams.toString()}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: createHeaders()
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  return response.blob();
};

/**
 * Search clients by text (searches across multiple fields including display_id, tags, and bidder_notes)
 * Shows all clients across all brands by default
 */
export const searchClients = async (searchTerm: string, limit: number = 10, clientType?: 'buyer' | 'vendor' | 'supplier' | 'buyer_vendor'): Promise<Client[]> => {
  const params = {
    search: searchTerm,
    limit,
    status: 'active', // Only search active clients by default
    brand_code: 'ALL', // Show clients from all brands
    ...(clientType && { client_type: clientType })
  };

  const result = await fetchClients(params);
  return result.data;
};

/**
 * Get client by display_id (MSA-XXX format)
 */
export const getClientByDisplayId = async (_displayId: string): Promise<Client | null> => {
  // display_id deprecated; try to parse trailing numeric id from input like AAA-123 and search by id
  const match = _displayId.match(/^(?:[a-zA-Z]{2,4}-)?(\d{1,})$/);
  if (match) {
    const idNum = parseInt(match[1]);
    if (!Number.isNaN(idNum)) {
      const resp = await fetchClient(idNum);
      return resp?.data || null;
    }
  }
  const result = await searchClients(_displayId, 1);
  return result?.[0] || null;
};

// =========================================
// GOOGLE SHEETS SYNC MANAGER API FUNCTIONS
// =========================================

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

/**
 * Get current sync status
 */
export const getSyncStatus = async (): Promise<{ success: boolean; status: SyncStatus }> => {
  const response = await fetch(`${API_BASE_URL}/clients/sync-manager/status`, {
    method: 'GET',
    headers: createHeaders()
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  return response.json();
};

/**
 * Get current sync status (without authentication for debugging)
 */
export const getSyncStatusNoAuth = async (): Promise<{ success: boolean; status: SyncStatus }> => {
  const response = await fetch(`${API_BASE_URL}/clients/sync-manager/status`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    console.error('❌ Sync status (no auth) failed:', response.status, response.statusText);
    if (response.status === 401 || response.status === 403) {
      throw new Error('Authentication required. Please log in and try again.');
    }
    if (response.status === 404) {
      throw new Error('API endpoint not found. Please check backend configuration.');
    }
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
};

/**
 * Manually trigger Google Sheets sync
 */
export const triggerManualSync = async (): Promise<SyncResult> => {
  const response = await fetch(`${API_BASE_URL}/clients/sync-manager/manual`, {
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
 * Start scheduled sync (runs every 15 minutes)
 */
export const startScheduledSync = async (): Promise<{ success: boolean; message: string }> => {
  const response = await fetch(`${API_BASE_URL}/clients/sync-manager/start-scheduled`, {
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
 * Stop scheduled sync
 */
export const stopScheduledSync = async (): Promise<{ success: boolean; message: string }> => {
  const response = await fetch(`${API_BASE_URL}/clients/sync-manager/stop-scheduled`, {
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
  const response = await fetch(`${API_BASE_URL}/clients/sync-manager/start-polling`, {
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
  const response = await fetch(`${API_BASE_URL}/clients/sync-manager/stop-polling`, {
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
 * Sync clients to Google Sheets (existing functionality)
 */
export const syncClientsToGoogleSheets = async (sheetUrl: string, clientIds?: number[]): Promise<{ success: boolean; message: string; count: number }> => {
  const response = await fetch(`${API_BASE_URL}/clients/sync-to-google-sheet`, {
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
export const syncClientsFromGoogleSheets = async (sheetUrl: string, defaultBrand?: string): Promise<{ success: boolean; message: string; imported?: number; upserted?: number }> => {
  const response = await fetch(`${API_BASE_URL}/clients/sync-google-sheet`, {
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


