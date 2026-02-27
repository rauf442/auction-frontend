// frontend/src/lib/refunds-api.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : 'http://localhost:3001/api';

const getAuthToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token');
  }
  return null;
};

export interface Refund {
  id: string;
  refund_number: string;
  type: 'refund_of_artwork' | 'refund_of_courier_difference' | 'item_return' | 'overpayment' | 'cancelled_sale' | 'damaged_item' | 'other';
  reason: string;
  amount: number;
  item_id?: string;
  client_id?: string;
  auction_id?: string;
  item_ids?: string[]; // For partial refunds of multiple items
  original_payment_reference?: string;
  refund_method: 'bank_transfer' | 'credit_card' | 'cheque' | 'cash' | 'store_credit';
  payment_method?: string; // Payment method used for refund
  bank_account_details?: any;
  refund_date?: string;
  status: 'pending' | 'approved' | 'processing' | 'completed' | 'cancelled' | 'failed';
  approval_required: boolean;
  approved_by?: string;
  approved_at?: string;
  processed_by?: string;
  processed_at?: string;
  returned_by?: string; // Staff member who processed the return
  internal_notes?: string;
  client_notes?: string;
  attachment_urls?: string[];
  created_at: string;
  updated_at: string;
  // From view
  client_name?: string;
  client_email?: string;
  client_company?: string;
  item_title?: string;
  item_lot_num?: string;
  auction_name?: string;
  created_by_name?: string;
  approved_by_name?: string;
  processed_by_name?: string;
  returned_by_name?: string;
  // Enhanced refund details
  hammer_price?: number;
  buyers_premium?: number;
  logistics_cost?: number;
  international_shipping?: number;
  local_shipping?: number;
  handling_insurance?: number;
}

export interface RefundsFilters {
  status?: string;
  type?: string;
  client_id?: string;
  auction_id?: string;
  search?: string;
  page?: number;
  limit?: number;
  sort_field?: string;
  sort_direction?: 'asc' | 'desc';
  brand_code?: 'MSABER' | 'AURUM' | 'METSAB';
}

export interface RefundsResponse {
  refunds: Refund[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface RefundStats {
  total_refunds: number;
  total_amount: number;
  by_status: Record<string, number>;
  by_type: Record<string, number>;
  pending_amount: number;
}

// Check if user is super admin
const isSuperAdmin = (): boolean => {
  if (typeof window !== 'undefined') {
    const userRole = localStorage.getItem('user_role');
    return userRole === 'super_admin';
  }
  return false;
};

export async function getRefunds(filters: RefundsFilters = {}): Promise<RefundsResponse> {
  const token = getAuthToken();
  const queryParams = new URLSearchParams();
  
  // Only require brand_code for non-super-admin users
  if (!isSuperAdmin() && !filters.brand_code && typeof window !== 'undefined') {
    const savedBrand = localStorage.getItem('brand_code');
    if (savedBrand) {
      filters = { ...filters, brand_code: savedBrand as 'MSABER' | 'AURUM' | 'METSAB' };
    } else {
      // Default to MSABER if no brand code is provided for non-super admin
      filters = { ...filters, brand_code: 'MSABER' };
    }
  }
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      queryParams.append(key, String(value));
    }
  });

  const response = await fetch(`${API_BASE_URL}/refunds?${queryParams}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Error fetching refunds: ${response.statusText}`);
  }

  return response.json();
}

export async function getRefund(id: string): Promise<Refund> {
  const token = getAuthToken();
  
  const response = await fetch(`${API_BASE_URL}/refunds/${id}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Error fetching refund: ${response.statusText}`);
  }

  return response.json();
}

export async function createRefund(refundData: Partial<Refund>): Promise<Refund> {
  const token = getAuthToken();
  
  // Ensure brand_code is included
  if (!(refundData as any).brand_code && typeof window !== 'undefined') {
    const savedBrand = localStorage.getItem('brand_code');
    if (savedBrand) {
      (refundData as any).brand_code = savedBrand;
    }
  }
  
  const response = await fetch(`${API_BASE_URL}/refunds`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(refundData)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Error creating refund: ${response.statusText}`);
  }

  return response.json();
}

export async function updateRefund(id: string, refundData: Partial<Refund>): Promise<Refund> {
  const token = getAuthToken();
  
  const response = await fetch(`${API_BASE_URL}/refunds/${id}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(refundData)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Error updating refund: ${response.statusText}`);
  }

  return response.json();
}

export async function approveRefund(id: string, comments?: string): Promise<Refund> {
  const token = getAuthToken();
  
  const response = await fetch(`${API_BASE_URL}/refunds/${id}/approve`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ comments })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Error approving refund: ${response.statusText}`);
  }

  return response.json();
}

export async function processRefund(id: string, status: 'processing' | 'completed', refund_date?: string, payment_reference?: string): Promise<Refund> {
  const token = getAuthToken();
  
  const response = await fetch(`${API_BASE_URL}/refunds/${id}/process`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ status, refund_date, payment_reference })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Error processing refund: ${response.statusText}`);
  }

  return response.json();
}

export async function deleteRefund(id: string): Promise<void> {
  const token = getAuthToken();
  
  const response = await fetch(`${API_BASE_URL}/refunds/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Error deleting refund: ${response.statusText}`);
  }
}

export async function getRefundStats(): Promise<RefundStats> {
  const token = getAuthToken();
  
  const response = await fetch(`${API_BASE_URL}/refunds/stats`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Error fetching refund stats: ${response.statusText}`);
  }

  return response.json();
} 