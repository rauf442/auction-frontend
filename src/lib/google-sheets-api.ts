// frontend/src/lib/google-sheets-api.ts

import { getGoogleSheetsUrlForModule } from './app-settings-api'

// Types for Google Sheets operations
export interface GoogleSheetsRow {
  [key: string]: string | null;
}

export interface GoogleSheetsParseResult {
  headers: string[];
  rows: GoogleSheetsRow[];
  rawData: string[][];
  summary: {
    totalRows: number;
    validRows: number;
    emptyRows: number;
  };
}

export interface GoogleSheetsSyncResult {
  success: boolean;
  upserted?: number;
  processed?: number;
  errors?: string[];
  summary?: {
    csvUrl: string;
    rowsInCsv: number;
    rowsProcessed: number;
    rowsUpserted: number;
    errorCount: number;
  };
  error?: string;
  details?: string;
}

// Convert Google Sheets URL to CSV export format
export const convertToGoogleSheetsCSVUrl = (url: string): string => {
  try {
    // Check if it's already a CSV export URL
    if (url.includes('/export?format=csv') || url.includes('&format=csv')) {
      return url;
    }

    // Handle Google Sheets URLs
    if (url.includes('docs.google.com/spreadsheets')) {
      // Extract sheet ID from various Google Sheets URL formats
      let sheetId = '';
      
      // Format: https://docs.google.com/spreadsheets/d/{ID}/edit#gid=0
      const editMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (editMatch) {
        sheetId = editMatch[1];
      }
      
      if (sheetId) {
        // Convert to CSV export URL
        return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
      }
    }

    // If it's not a recognized Google Sheets URL, return as-is and hope it's a direct CSV URL
    return url;
  } catch (error) {
    console.error('Error converting Google Sheets URL:', error);
    return url;
  }
};

// Get API base URL with fallback
export const getApiBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    // Client-side: use current origin for relative URLs, or environment variable
    return process.env.NEXT_PUBLIC_API_URL
      ? `${process.env.NEXT_PUBLIC_API_URL}/api`
      : (window.location.origin.includes('localhost') ? 'http://localhost:3001/api' : `${window.location.origin}/api`);
  }
  // Server-side fallback
  return process.env.NEXT_PUBLIC_API_URL
    ? `${process.env.NEXT_PUBLIC_API_URL}/api`
    : 'http://localhost:3001/api';
};

// Get authentication headers
export const getAuthHeaders = (): HeadersInit => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

// Download and parse Google Sheets data
export const downloadAndParseGoogleSheet = async (
  sheetUrl: string,
  options: {
    fillEmptyBrand?: string; // Brand code to use for empty brand fields
    requiredHeaders?: string[]; // Headers that must be present
    validateData?: boolean; // Whether to validate data
  } = {}
): Promise<GoogleSheetsParseResult> => {
  try {
    const csvUrl = convertToGoogleSheetsCSVUrl(sheetUrl);
    console.log('Downloading Google Sheet:', csvUrl);

    // Download CSV with proper headers
    const response = await fetch(csvUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to download sheet: ${response.statusText} (${response.status})`);
    }

    const csvText = await response.text();
    console.log('Downloaded CSV length:', csvText.length);

    if (!csvText || csvText.trim().length === 0) {
      throw new Error('Downloaded CSV is empty');
    }

    // Parse CSV manually (simple but robust)
    const lines = csvText.trim().split('\n');
    if (lines.length < 1) {
      throw new Error('CSV must contain at least a header row');
    }

    // Parse headers
    const headers = parseCSVRow(lines[0]).map(h => h.trim().toLowerCase());
    console.log('Parsed headers:', headers);

    // Validate required headers if specified
    if (options.requiredHeaders) {
      const missingHeaders = options.requiredHeaders.filter(h => !headers.includes(h.toLowerCase()));
      if (missingHeaders.length > 0) {
        throw new Error(`Missing required headers: ${missingHeaders.join(', ')}`);
      }
    }

    // Parse data rows
    const rawData: string[][] = [];
    const rows: GoogleSheetsRow[] = [];
    let validRows = 0;
    let emptyRows = 0;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) {
        emptyRows++;
        continue;
      }

      const values = parseCSVRow(line);
      rawData.push(values);

      // Skip rows where all values are empty
      if (values.every(val => !val || val.trim() === '')) {
        emptyRows++;
        continue;
      }

      // Create row object
      const row: GoogleSheetsRow = {};
      headers.forEach((header, index) => {
        let value = values[index] || '';
        
        // Clean up value
        value = value.trim();
        if (value === '') value = '';
        
        // Handle empty brand field
        if (header === 'brand' && (!value || value === null) && options.fillEmptyBrand) {
          value = options.fillEmptyBrand;
        }
        
        row[header] = value;
      });

      rows.push(row);
      validRows++;
    }

    return {
      headers,
      rows,
      rawData,
      summary: {
        totalRows: lines.length - 1, // Exclude header
        validRows,
        emptyRows
      }
    };

  } catch (error: any) {
    console.error('Error downloading/parsing Google Sheet:', error);
    throw new Error(`Google Sheets processing failed: ${error.message}`);
  }
};

// Simple CSV row parser that handles quotes and commas
const parseCSVRow = (row: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < row.length; i++) {
    const ch = row[i];
    
    if (ch === '"') {
      if (inQuotes && row[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  
  result.push(current);
  return result.map(s => s.trim().replace(/^"(.*)"$/, '$1'));
};

// Sync clients from Google Sheets
export const syncClientsFromGoogleSheet = async (
  sheetUrl: string,
  selectedBrand?: string
): Promise<GoogleSheetsSyncResult> => {
  try {
    const apiUrl = getApiBaseUrl();
    const headers = getAuthHeaders();

    console.log('Syncing clients from Google Sheet:', sheetUrl);
    console.log('Using API URL:', apiUrl);
    console.log('Selected brand for empty fields:', selectedBrand);

    const response = await fetch(`${apiUrl}/clients/sync-google-sheet`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ 
        sheet_url: sheetUrl,
        default_brand: selectedBrand // Send selected brand to backend
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText };
      }
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('Sync result:', result);
    
    return result;

  } catch (error: any) {
    console.error('Error syncing clients from Google Sheet:', error);
    return {
      success: false,
      error: error.message || 'Unknown error occurred',
      details: error.toString()
    };
  }
};

// Load Google Sheets URL from app settings
export const loadBrandGoogleSheetUrl = async (
  brandCode: string,
  type: 'clients' | 'artworks' = 'clients'
): Promise<string | null> => {
  try {
    const apiUrl = getApiBaseUrl();
    const headers = getAuthHeaders();

    console.log(`Loading Google Sheets URL for type: ${type}`);

    const response = await fetch(`${apiUrl}/app-settings/google-sheets/${type}`, {
      headers
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`App settings Google Sheets API error (${response.status}):`, errorText);
      return null;
    }

    const data = await response.json();
    console.log('App settings Google Sheets response:', data);

    if (data.success && data.data) {
      const url = data.data.url || null;
      console.log(`Found Google Sheets URL for ${type}:`, url || 'Not configured');
      return url;
    }

    return null;
  } catch (error: any) {
    console.error('Error loading Google Sheets URL:', error);
    return null;
  }
};

// Save Google Sheets URL to app settings
export const saveBrandGoogleSheetUrl = async (
  brandCode: string,
  url: string,
  type: 'clients' | 'artworks' = 'clients'
): Promise<boolean> => {
  try {
    const apiUrl = getApiBaseUrl();
    const headers = getAuthHeaders();

    console.log(`Saving Google Sheets URL for type: ${type}`);

    const response = await fetch(`${apiUrl}/app-settings/google-sheets`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        module: type,
        url: url
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to save Google Sheets URL:`, errorText);
      return false;
    }

    console.log(`Successfully saved Google Sheets URL for ${type}`);
    return true;
  } catch (error: any) {
    console.error('Error saving Google Sheets URL:', error);
    return false;
  }
};

// Sync artworks from Google Sheets
export const syncArtworksFromGoogleSheet = async (
  sheetUrl: string,
  selectedBrand?: string,
  platform?: string,
  driveFolderUrl?: string,
  syncBack: boolean = false,
  auctionId?: number
): Promise<GoogleSheetsSyncResult> => {
  try {
    const apiUrl = getApiBaseUrl();
    const headers = getAuthHeaders();

    console.log('Syncing artworks from Google Sheet:', sheetUrl);
    console.log('Using API URL:', apiUrl);
    console.log('Selected brand for empty fields:', selectedBrand);
    console.log('Target platform:', platform);
    console.log('Sync back to sheets:', syncBack);
    console.log('Auction ID:', auctionId);

    const response = await fetch(`${apiUrl}/items/sync-google-sheet`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        sheet_url: sheetUrl,
        default_brand: selectedBrand,
        platform: platform || 'database',
        drive_folder_url: driveFolderUrl,
        sync_back: syncBack,
        ...(auctionId && { auction_id: auctionId })
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText };
      }
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('Artwork sync result:', result);
    
    return result;

  } catch (error: any) {
    console.error('Error syncing artworks from Google Sheet:', error);
    return {
      success: false,
      error: error.message || 'Unknown error occurred',
      details: error.toString()
    };
  }
};

// Sync artworks TO Google Sheets (when artworks are added/updated)
export const syncArtworksToGoogleSheet = async (
  artworks: any[],
  sheetUrl?: string,
  brand?: string
): Promise<GoogleSheetsSyncResult> => {
  try {
    const apiUrl = getApiBaseUrl();
    const headers = getAuthHeaders();

    // Use provided sheetUrl or load from brand settings
    let targetSheetUrl = sheetUrl;
    if (!targetSheetUrl) {
      targetSheetUrl = await getGoogleSheetsUrlForModule('artworks');
    }

    if (!targetSheetUrl) {
      return {
        success: false,
        error: 'No Google Sheets URL configured for artworks sync'
      };
    }

    console.log('Syncing artworks TO Google Sheet:', targetSheetUrl);
    console.log('Artworks to sync:', artworks.length);

    const response = await fetch(`${apiUrl}/items/sync-to-google-sheet`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ 
        sheet_url: targetSheetUrl,
        artworks: artworks,
        brand: brand
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText };
      }
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('Artwork TO sheet sync result:', result);
    
    return result;

  } catch (error: any) {
    console.error('Error syncing artworks to Google Sheet:', error);
    return {
      success: false,
      error: error.message || 'Unknown error occurred',
      details: error.toString()
    };
  }
};

// Auto-sync single artwork to Google Sheets
export const autoSyncArtworkToGoogleSheet = async (
  artwork: any,
  brand?: string
): Promise<void> => {
  try {
    // Only sync if Google Sheets URL is configured for this brand
    if (brand) {
      const sheetUrl = await loadBrandGoogleSheetUrl(brand, 'artworks');
      if (sheetUrl) {
        await syncArtworksToGoogleSheet([artwork], sheetUrl, brand);
      }
    }
  } catch (error) {
    console.error('Auto-sync to Google Sheets failed (non-critical):', error);
    // Don't throw error as this is a background operation
  }
};
