// frontend/src/lib/dashboard-api.ts
import { ApiResponse } from '@/types/api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : 'http://localhost:3001/api';

// Get authentication token
const getAuthToken = (): string => {
  return localStorage.getItem('token') || '';
};

// Helper function to check if user is super admin
const isSuperAdmin = (): boolean => {
  const userRole = localStorage.getItem('user_role');
  return userRole === 'super_admin';
};

// Handle API errors
const handleApiError = async (response: Response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }
  return response;
};

export interface DashboardStats {
  auctions: {
    total: number;
    active: number;
    completed: number;
    upcoming: number;
  };
  lots: {
    totalLots: number;
    totalSold: number;
    soldInAuction: number;
    soldAfterwards: number;
    unsold: number;
    soldPercentage: number;
  };
  values: {
    totalLowEstimate: number;
    totalHighEstimate: number;
    totalReserve: number;
    totalHammerPrice: number;
    totalHammerWithCommission: number;
  };
  buyers: {
    totalBids: number;
    totalBidders: number;
    totalBuyers: number;
  };
  vendors: {
    totalVendors: number;
    totalConsignments: number;
  };
  revenue: {
    totalRevenue: number;
    buyerPremium: number;
    vendorCommission: number;
  };
  topLots: Array<{
    id: string;
    title: string;
    auction_name: string;
    lot_number: string;
    hammer_price: number;
    total_price: number;
  }>;
  topBuyers: Array<{
    id: string;
    name: string;
    total_spent: number;
    lots_won: number;
  }>;
  topVendors: Array<{
    id: string;
    name: string;
    total_revenue: number;
    lots_consigned: number;
  }>;
  recentAuctions: Array<{
    id: string;
    short_name: string;
    start_date: string;
    end_date: string;
    status: string;
    total_lots: number;
    sold_lots: number;
  }>;
}

// Get dashboard statistics
export async function getDashboardStats(dateFrom?: string, dateTo?: string, brandCode?: string | null): Promise<DashboardStats> {
  const token = getAuthToken();

  // Use provided brandCode, or fall back to user context for non-super-admin
  // If brandCode is explicitly set to null/undefined (meaning "all"), don't fall back to user context
  let finalBrandCode: string | undefined;
  if (brandCode === null || brandCode === undefined) {
    // Explicitly requested "all brands" - don't filter by brand
    finalBrandCode = undefined;
  } else if (brandCode !== '') {
    // Specific brand requested
    finalBrandCode = brandCode;
  } else {
    // Empty string means fall back to user context (legacy behavior)
    finalBrandCode = isSuperAdmin() ? undefined : localStorage.getItem('brand_code') || 'MSABER';
  }

  const queryParams = new URLSearchParams();
  if (dateFrom) queryParams.append('date_from', dateFrom);
  if (dateTo) queryParams.append('date_to', dateTo);
  if (finalBrandCode) queryParams.append('brand_code', finalBrandCode);

  const response = await fetch(`${API_BASE_URL}/dashboard/stats?${queryParams}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  await handleApiError(response);
  return response.json();
}

// Get recent auctions
export async function getRecentAuctions(limit: number = 10): Promise<any[]> {
  const token = getAuthToken();
  const brand_code = isSuperAdmin() ? undefined : localStorage.getItem('brand_code') || 'MSABER';

  const queryParams = new URLSearchParams();
  queryParams.append('limit', limit.toString());
  queryParams.append('sort', 'start_date');
  queryParams.append('order', 'desc');
  if (brand_code) queryParams.append('brand_code', brand_code);

  const response = await fetch(`${API_BASE_URL}/auctions?${queryParams}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  await handleApiError(response);
  const data = await response.json();
  return data.auctions || [];
}

// Get top performing lots
export async function getTopLots(limit: number = 5, dateFrom?: string, dateTo?: string): Promise<any[]> {
  const token = getAuthToken();
  const brand_code = isSuperAdmin() ? undefined : localStorage.getItem('brand_code') || 'MSABER';

  const queryParams = new URLSearchParams();
  queryParams.append('limit', limit.toString());
  queryParams.append('sort', 'hammer_price');
  queryParams.append('order', 'desc');
  queryParams.append('status', 'sold');
  if (dateFrom) queryParams.append('date_from', dateFrom);
  if (dateTo) queryParams.append('date_to', dateTo);
  if (brand_code) queryParams.append('brand_code', brand_code);

  const response = await fetch(`${API_BASE_URL}/items?${queryParams}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  await handleApiError(response);
  const data = await response.json();
  return data.items || [];
}

// Get top buyers
export async function getTopBuyers(limit: number = 5, dateFrom?: string, dateTo?: string): Promise<any[]> {
  const token = getAuthToken();
  const brand_code = isSuperAdmin() ? undefined : localStorage.getItem('brand_code') || 'MSABER';

  const queryParams = new URLSearchParams();
  queryParams.append('limit', limit.toString());
  queryParams.append('type', 'buyer');
  if (dateFrom) queryParams.append('date_from', dateFrom);
  if (dateTo) queryParams.append('date_to', dateTo);
  if (brand_code) queryParams.append('brand_code', brand_code);

  const response = await fetch(`${API_BASE_URL}/clients/top-performers?${queryParams}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  await handleApiError(response);
  return response.json();
}

// Get top vendors
export async function getTopVendors(limit: number = 5, dateFrom?: string, dateTo?: string): Promise<any[]> {
  const token = getAuthToken();
  const brand_code = isSuperAdmin() ? undefined : localStorage.getItem('brand_code') || 'MSABER';

  const queryParams = new URLSearchParams();
  queryParams.append('limit', limit.toString());
  queryParams.append('type', 'vendor');
  if (dateFrom) queryParams.append('date_from', dateFrom);
  if (dateTo) queryParams.append('date_to', dateTo);
  if (brand_code) queryParams.append('brand_code', brand_code);

  const response = await fetch(`${API_BASE_URL}/clients/top-performers?${queryParams}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  await handleApiError(response);
  return response.json();
}
