// frontend/src/lib/banking-api.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : 'http://localhost:3001/api';

const getAuthToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token');
  }
  return null;
};

export interface BankingTransaction {
  id: string;
  transaction_number: string;
  type: 'deposit' | 'withdrawal' | 'transfer' | 'payment' | 'refund' | 'fee' | 'commission';
  category: string;
  description: string;
  amount: number;
  bank_account?: string;
  reference_number?: string;
  payment_method: 'bank_transfer' | 'credit_card' | 'debit_card' | 'cheque' | 'cash' | 'paypal' | 'stripe';
  transaction_date: string;
  value_date?: string;
  currency: string;
  exchange_rate: number;
  client_id?: string;
  auction_id?: string;
  item_id?: string;
  refund_id?: string;
  status: 'pending' | 'cleared' | 'failed' | 'cancelled' | 'reconciled';
  is_reconciled: boolean;
  reconciled_date?: string;
  reconciled_by?: string;
  running_balance?: number;
  account_balance_before?: number;
  account_balance_after?: number;
  external_transaction_id?: string;
  external_batch_id?: string;
  bank_fees: number;
  processing_fees: number;
  net_amount?: number;
  internal_notes?: string;
  external_notes?: string;
  attachment_urls?: string[];
  metadata?: any;
  created_at: string;
  updated_at: string;
  // From view
  client_name?: string;
  client_email?: string;
  client_company?: string;
  auction_name?: string;
  item_title?: string;
  item_lot_num?: string;
  created_by_name?: string;
  reconciled_by_name?: string;
}

export interface BankingFilters {
  status?: string;
  type?: string;
  bank_account?: string;
  client_id?: string;
  auction_id?: string;
  is_reconciled?: boolean;
  search?: string;
  page?: number;
  limit?: number;
  sort_field?: string;
  sort_direction?: 'asc' | 'desc';
  date_from?: string;
  date_to?: string;
  brand_code?: string;
}

export interface BankingResponse {
  transactions: BankingTransaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface BankingStats {
  total_transactions: number;
  total_credits: number;
  total_debits: number;
  by_status: Record<string, number>;
  by_type: Record<string, number>;
  reconciled_count: number;
  unreconciled_count: number;
  pending_amount: number;
}

export async function getBankingTransactions(filters: BankingFilters = {}): Promise<BankingResponse> {
  const token = getAuthToken();
  const queryParams = new URLSearchParams();
  
  // Default last 30 days when no explicit dates provided
  if (!filters.date_from || !filters.date_to) {
    const today = new Date();
    const from = new Date(today);
    from.setDate(today.getDate() - 30);
    filters = {
      ...filters,
      date_from: filters.date_from || from.toISOString().split('T')[0],
      date_to: filters.date_to || today.toISOString().split('T')[0],
    };
  }

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      queryParams.append(key, String(value));
    }
  });

  const response = await fetch(`${API_BASE_URL}/banking?${queryParams}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Error fetching banking transactions: ${response.statusText}`);
  }

  // Backend returns StandardResponse with { success, data, pagination }
  const payload = await response.json();
  if (payload && payload.success) {
    return {
      transactions: payload.data || [],
      pagination: payload.pagination || { page: 1, limit: 0, total: 0, pages: 0 }
    } as BankingResponse
  }
  // Fallback to legacy direct array
  if (Array.isArray(payload)) {
    return { transactions: payload, pagination: { page: 1, limit: payload.length, total: payload.length, pages: 1 } }
  }
  return payload as BankingResponse;
}

export async function getBankingTransaction(id: string): Promise<BankingTransaction> {
  const token = getAuthToken();
  
  const response = await fetch(`${API_BASE_URL}/banking/${id}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Error fetching banking transaction: ${response.statusText}`);
  }

  return response.json();
}

export async function createBankingTransaction(transactionData: Partial<BankingTransaction>): Promise<BankingTransaction> {
  const token = getAuthToken();
  
  const response = await fetch(`${API_BASE_URL}/banking`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(transactionData)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Error creating banking transaction: ${response.statusText}`);
  }

  return response.json();
}

export async function updateBankingTransaction(id: string, transactionData: Partial<BankingTransaction>): Promise<BankingTransaction> {
  const token = getAuthToken();
  
  const response = await fetch(`${API_BASE_URL}/banking/${id}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(transactionData)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Error updating banking transaction: ${response.statusText}`);
  }

  return response.json();
}

export async function reconcileBankingTransaction(id: string, reconciled_balance?: number, notes?: string): Promise<BankingTransaction> {
  const token = getAuthToken();
  
  const response = await fetch(`${API_BASE_URL}/banking/${id}/reconcile`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ reconciled_balance, notes })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Error reconciling banking transaction: ${response.statusText}`);
  }

  return response.json();
}

export async function deleteBankingTransaction(id: string): Promise<void> {
  const token = getAuthToken();
  
  const response = await fetch(`${API_BASE_URL}/banking/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Error deleting banking transaction: ${response.statusText}`);
  }
}

export async function getBankingStats(filters: { bank_account?: string; date_from?: string; date_to?: string } = {}): Promise<BankingStats> {
  const token = getAuthToken();
  const queryParams = new URLSearchParams();
  
  // Default last 30 days
  if (!filters.date_from || !filters.date_to) {
    const today = new Date();
    const from = new Date(today);
    from.setDate(today.getDate() - 30);
    filters = {
      ...filters,
      date_from: filters.date_from || from.toISOString().split('T')[0],
      date_to: filters.date_to || today.toISOString().split('T')[0],
    };
  }

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      queryParams.append(key, String(value));
    }
  });
  
  const response = await fetch(`${API_BASE_URL}/banking/stats?${queryParams}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Error fetching banking stats: ${response.statusText}`);
  }

  return response.json();
}

export async function getBankAccounts(): Promise<string[]> {
  const token = getAuthToken();
  
  const response = await fetch(`${API_BASE_URL}/banking/accounts`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Error fetching bank accounts: ${response.statusText}`);
  }

  return response.json();
} 