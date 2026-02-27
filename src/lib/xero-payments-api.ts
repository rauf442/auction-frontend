// frontend/src/lib/xero-payments-api.ts
import { ApiResponse } from '@/types/api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : 'http://localhost:3001/api';

// Get authentication token
const getAuthToken = (): string => {
  return localStorage.getItem('token') || '';
};

// Handle API errors
const handleApiError = async (response: Response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }
  return response;
};

export interface XeroCredentials {
  clientId: string;
  clientSecret: string;
  tenantName?: string;
  hasTokens: boolean;
  tokenExpiresAt?: string;
}

export interface XeroPaymentLink {
  invoiceId: string;
  invoiceNumber: string;
  paymentUrl: string;
  amount: number;
  dueDate: string;
  status: string;
}

export interface XeroInvoiceStatus {
  invoiceId: string;
  status: string;
  amountDue: number;
  amountPaid: number;
  total: number;
}

// Get Xero authorization URL
export async function getXeroAuthUrl(brandId: string): Promise<{ authUrl: string; redirectUri?: string }> {
  const token = getAuthToken();

  const response = await fetch(`${API_BASE_URL}/xero-payments/auth-url/${brandId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Network error' }));
    const error = new Error(errorData.error || `HTTP ${response.status}`) as any;
    error.response = response;
    error.errorData = errorData;
    throw error;
  }

  return response.json();
}

// Save Xero credentials
export async function saveXeroCredentials(brandId: string, clientId: string, clientSecret: string): Promise<ApiResponse> {
  const token = getAuthToken();

  const response = await fetch(`${API_BASE_URL}/xero-payments/save-credentials`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      brandId,
      clientId,
      clientSecret
    })
  });

  await handleApiError(response);
  return response.json();
}

// Get Xero credentials (without secrets)
export async function getXeroCredentials(brandId: string): Promise<{ configured: boolean } & Partial<XeroCredentials>> {
  const token = getAuthToken();

  const response = await fetch(`${API_BASE_URL}/xero-payments/credentials/${brandId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  await handleApiError(response);
  return response.json();
}

// Create payment link
export async function createXeroPaymentLink(
  brandId: string,
  amount: number,
  description: string,
  customerEmail?: string
): Promise<{ success: boolean; paymentLink: XeroPaymentLink }> {
  const token = getAuthToken();

  const response = await fetch(`${API_BASE_URL}/xero-payments/create-payment-link`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      brandId,
      amount,
      description,
      customerEmail
    })
  });

  await handleApiError(response);
  return response.json();
}

// Get invoice status
export async function getXeroInvoiceStatus(
  brandId: string,
  invoiceId: string
): Promise<{ success: boolean; invoice: XeroInvoiceStatus }> {
  const token = getAuthToken();

  const response = await fetch(`${API_BASE_URL}/xero-payments/invoice-status/${brandId}/${invoiceId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  await handleApiError(response);
  return response.json();
}

// Refresh access token
export async function refreshXeroToken(brandId: string): Promise<ApiResponse> {
  const token = getAuthToken();

  const response = await fetch(`${API_BASE_URL}/xero-payments/refresh-token/${brandId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  await handleApiError(response);
  return response.json();
}

// Get Tax Rates
export async function getXeroTaxRates(brandId: string): Promise<any> {
  const token = getAuthToken();

  const response = await fetch(`${API_BASE_URL}/xero/tax-rates/${brandId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  await handleApiError(response);
  return response.json();
}

// Get Invoices
export async function getXeroInvoices(brandId: string, where?: string, order?: string): Promise<any> {
  const token = getAuthToken();
  const params = new URLSearchParams();
  if (where) params.append('where', where);
  if (order) params.append('order', order);

  const response = await fetch(`${API_BASE_URL}/xero/invoices-list/${brandId}?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  await handleApiError(response);
  return response.json();
}

// Get Bank Transfers
export async function getXeroBankTransfers(brandId: string): Promise<any> {
  const token = getAuthToken();

  const response = await fetch(`${API_BASE_URL}/xero/bank-transfers/${brandId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  await handleApiError(response);
  return response.json();
}

// Get Bank Transactions
export async function getXeroBankTransactions(brandId: string, bankAccountId?: string): Promise<any> {
  const token = getAuthToken();
  const params = new URLSearchParams();
  if (bankAccountId) params.append('bankAccountId', bankAccountId);

  const response = await fetch(`${API_BASE_URL}/xero/bank-transactions/${brandId}?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  await handleApiError(response);
  return response.json();
}

// Get Accounts
export async function getXeroAccounts(brandId: string): Promise<any> {
  const token = getAuthToken();

  const response = await fetch(`${API_BASE_URL}/xero/accounts/${brandId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  await handleApiError(response);
  return response.json();
}

// Get Attachments
export async function getXeroAttachments(brandId: string, entityType: string, entityId: string): Promise<any> {
  const token = getAuthToken();

  const response = await fetch(`${API_BASE_URL}/xero/attachments/${brandId}/${entityType}/${entityId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  await handleApiError(response);
  return response.json();
}

// Get Credit Notes
export async function getXeroCreditNotes(brandId: string): Promise<any> {
  const token = getAuthToken();

  const response = await fetch(`${API_BASE_URL}/xero/credit-notes/${brandId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  await handleApiError(response);
  return response.json();
}

// Get History Records
export async function getXeroHistoryRecords(brandId: string, entityType: string, entityId: string): Promise<any> {
  const token = getAuthToken();

  const response = await fetch(`${API_BASE_URL}/xero/history/${brandId}/${entityType}/${entityId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  await handleApiError(response);
  return response.json();
}

// Get Contacts (for invoice reminders)
export async function getXeroContacts(brandId: string): Promise<any> {
  const token = getAuthToken();

  const response = await fetch(`${API_BASE_URL}/xero/contacts/${brandId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  await handleApiError(response);
  return response.json();
}

// Get Reports
export async function getXeroReports(brandId: string, reportType: string, options?: any): Promise<any> {
  const token = getAuthToken();
  const params = new URLSearchParams();
  if (options) {
    Object.keys(options).forEach(key => {
      if (options[key]) params.append(key, options[key]);
    });
  }

  const response = await fetch(`${API_BASE_URL}/xero/reports/${brandId}/${reportType}?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  await handleApiError(response);
  return response.json();
}

// Get Tracking Categories (Types & Codes)
export async function getXeroTrackingCategories(brandId: string): Promise<any> {
  const token = getAuthToken();

  const response = await fetch(`${API_BASE_URL}/xero/tracking-categories/${brandId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  await handleApiError(response);
  return response.json();
}

// Get Organisation
export async function getXeroOrganisation(brandId: string): Promise<any> {
  const token = getAuthToken();

  const response = await fetch(`${API_BASE_URL}/xero/organisation/${brandId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  await handleApiError(response);
  return response.json();
}

// Get Currencies
export async function getXeroCurrencies(brandId: string): Promise<any> {
  const token = getAuthToken();

  const response = await fetch(`${API_BASE_URL}/xero/currencies/${brandId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  await handleApiError(response);
  return response.json();
}
