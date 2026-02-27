// frontend/src/lib/app-settings-api.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : 'http://localhost:3001/api';

// Authenticated fetch function
async function authedFetch(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem('token');

  return fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
      ...options.headers,
    },
  });
}

export interface GoogleSheetsUrls {
  clients: string;
  consignments: string;
  artworks: string;
  auctions: string;
}

export const getGoogleSheetsUrls = async (): Promise<GoogleSheetsUrls> => {
  try {
    const response = await authedFetch('/app-settings/google-sheets');
    
    if (!response.ok) {
      throw new Error('Failed to fetch Google Sheets URLs');
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch Google Sheets URLs');
    }

    return data.data;
  } catch (error) {
    console.error('Error fetching Google Sheets URLs:', error);
    throw error;
  }
};

export const updateGoogleSheetsUrl = async (module: keyof GoogleSheetsUrls, url: string): Promise<void> => {
  try {
    const response = await authedFetch('/app-settings/google-sheets', {
      method: 'POST',
      body: JSON.stringify({ module, url }),
    });

    if (!response.ok) {
      throw new Error('Failed to update Google Sheets URL');
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to update Google Sheets URL');
    }
  } catch (error) {
    console.error('Error updating Google Sheets URL:', error);
    throw error;
  }
};

export const getGoogleSheetsUrlForModule = async (module: keyof GoogleSheetsUrls): Promise<string> => {
  try {
    const response = await authedFetch(`/app-settings/google-sheets/${module}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch Google Sheets URL');
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch Google Sheets URL');
    }

    return data.data.url || '';
  } catch (error) {
    console.error('Error fetching Google Sheets URL:', error);
    throw error;
  }
};
