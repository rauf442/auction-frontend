// frontend/src/lib/reimbursements-api.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : 'http://localhost:3001/api';

const getAuthToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token');
  }
  return null;
};

export interface Reimbursement {
  id: string;
  brand_code?: 'MSABER' | 'AURUM' | 'METSAB';
  reimbursement_number: string;
  title: string;
  description: string;
  category: 'food' | 'fuel' | 'internal_logistics' | 'international_logistics' | 'stationary' | 'travel' | 'accommodation' | 'other';
  total_amount: number;
  currency: string;
  payment_method: 'cash' | 'card' | 'bank_transfer' | 'other';
  payment_date: string;
  vendor_name?: string;
  vendor_details?: string;
  receipt_urls?: string[];
  receipt_numbers?: string;
  has_receipts: boolean;
  requested_by: string;
  department?: string;
  purpose: string;
  status: 'pending' | 'director1_approved' | 'director2_approved' | 'accountant_approved' | 'completed' | 'rejected' | 'cancelled';
  director1_approval_status: 'pending' | 'approved' | 'rejected';
  director1_approved_by?: string;
  director1_approved_at?: string;
  director1_comments?: string;
  director2_approval_status: 'pending' | 'approved' | 'rejected';
  director2_approved_by?: string;
  director2_approved_at?: string;
  director2_comments?: string;
  accountant_approval_status: 'pending' | 'approved' | 'rejected';
  accountant_approved_by?: string;
  accountant_approved_at?: string;
  accountant_comments?: string;
  processed_by?: string;
  processed_at?: string;
  payment_reference?: string;
  payment_completed_at?: string;
  rejection_reason?: string;
  rejected_by?: string;
  rejected_at?: string;
  project_code?: string;
  cost_center?: string;
  tax_amount: number;
  tax_rate: number;
  net_amount?: number;
  internal_notes?: string;
  accounting_notes?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  expected_payment_date?: string;
  created_at: string;
  updated_at: string;
  // From view
  requested_by_name?: string;
  requested_by_email?: string;
  director1_approved_by_name?: string;
  director2_approved_by_name?: string;
  accountant_approved_by_name?: string;
  processed_by_name?: string;
  created_by_name?: string;
}

export interface ReimbursementFilters {
  status?: string;
  category?: string;
  priority?: string;
  requested_by?: string;
  approval_stage?: string;
  search?: string;
  page?: number;
  limit?: number;
  sort_field?: string;
  sort_direction?: 'asc' | 'desc';
  date_from?: string;
  date_to?: string;
  // brand scoping
  brand_code?: string;
}

export interface ReimbursementResponse {
  reimbursements: Reimbursement[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface PendingApproval {
  reimbursement_id: string;
  reimbursement_number: string;
  title: string;
  total_amount: number;
  approval_stage: string;
  requested_by_name: string;
  created_at: string;
}

export interface ReimbursementStats {
  total_reimbursements: number;
  total_amount: number;
  by_status: Record<string, number>;
  by_category: Record<string, number>;
  by_priority: Record<string, number>;
  pending_director1: number;
  pending_director2: number;
  pending_accountant: number;
  approved_amount: number;
}

// Check if user is super admin
const isSuperAdmin = (): boolean => {
  if (typeof window !== 'undefined') {
    const userRole = localStorage.getItem('user_role');
    return userRole === 'super_admin';
  }
  return false;
};

export async function getReimbursements(filters: ReimbursementFilters = {}): Promise<ReimbursementResponse> {
  const token = getAuthToken();
  
  // Only require brand_code for non-super-admin users
  if (!isSuperAdmin() && !filters.brand_code && typeof window !== 'undefined') {
    const savedBrand = localStorage.getItem('brand_code');
    if (savedBrand) {
      filters = { ...filters, brand_code: savedBrand };
    } else {
      // Default to MSABER if no brand code is provided for non-super admin
      filters = { ...filters, brand_code: 'MSABER' };
    }
  }
  
  const queryParams = new URLSearchParams();
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      queryParams.append(key, String(value));
    }
  });

  const response = await fetch(`${API_BASE_URL}/reimbursements?${queryParams}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Error fetching reimbursements: ${response.statusText}`);
  }

  return response.json();
}

export async function getPendingApprovals(): Promise<PendingApproval[]> {
  const token = getAuthToken();
  
  const response = await fetch(`${API_BASE_URL}/reimbursements/pending-approvals`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Error fetching pending approvals: ${response.statusText}`);
  }

  return response.json();
}

export async function getReimbursement(id: string): Promise<Reimbursement> {
  const token = getAuthToken();
  
  const response = await fetch(`${API_BASE_URL}/reimbursements/${id}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Error fetching reimbursement: ${response.statusText}`);
  }

  return response.json();
}

export async function createReimbursement(reimbursementData: Partial<Reimbursement>): Promise<Reimbursement> {
  const token = getAuthToken();
  
  // Ensure brand_code is included
  if (!reimbursementData.brand_code && typeof window !== 'undefined') {
    const savedBrand = localStorage.getItem('brand_code');
    if (savedBrand) {
      (reimbursementData as any).brand_code = savedBrand;
    }
  }
  
  const response = await fetch(`${API_BASE_URL}/reimbursements`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(reimbursementData)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Error creating reimbursement: ${response.statusText}`);
  }

  return response.json();
}

export async function updateReimbursement(id: string, reimbursementData: Partial<Reimbursement>): Promise<Reimbursement> {
  const token = getAuthToken();
  
  const response = await fetch(`${API_BASE_URL}/reimbursements/${id}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(reimbursementData)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Error updating reimbursement: ${response.statusText}`);
  }

  return response.json();
}

export async function approveDirector1(id: string, approved: boolean, comments?: string): Promise<Reimbursement> {
  const token = getAuthToken();
  
  const response = await fetch(`${API_BASE_URL}/reimbursements/${id}/approve-director1`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ approved, comments })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Error processing director1 approval: ${response.statusText}`);
  }

  return response.json();
}

export async function approveDirector2(id: string, approved: boolean, comments?: string): Promise<Reimbursement> {
  const token = getAuthToken();
  
  const response = await fetch(`${API_BASE_URL}/reimbursements/${id}/approve-director2`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ approved, comments })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Error processing director2 approval: ${response.statusText}`);
  }

  return response.json();
}

export async function approveAccountant(id: string, approved: boolean, comments?: string, payment_reference?: string): Promise<Reimbursement> {
  const token = getAuthToken();
  
  const response = await fetch(`${API_BASE_URL}/reimbursements/${id}/approve-accountant`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ approved, comments, payment_reference })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Error processing accountant approval: ${response.statusText}`);
  }

  return response.json();
}

export async function completePayment(id: string, payment_reference?: string): Promise<Reimbursement> {
  const token = getAuthToken();
  
  const response = await fetch(`${API_BASE_URL}/reimbursements/${id}/complete-payment`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ payment_reference })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Error completing payment: ${response.statusText}`);
  }

  return response.json();
}

export async function deleteReimbursement(id: string): Promise<void> {
  const token = getAuthToken();
  
  const response = await fetch(`${API_BASE_URL}/reimbursements/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Error deleting reimbursement: ${response.statusText}`);
  }
}

export async function getReimbursementStats(filters: { category?: string; date_from?: string; date_to?: string } = {}): Promise<ReimbursementStats> {
  const token = getAuthToken();
  const queryParams = new URLSearchParams();
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      queryParams.append(key, String(value));
    }
  });
  
  const response = await fetch(`${API_BASE_URL}/reimbursements/stats?${queryParams}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Error fetching reimbursement stats: ${response.statusText}`);
  }

  return response.json();
} 