// frontend/src/lib/stripe-payments-api.ts
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

export interface StripeCredentials {
  publishableKey: string;
  secretKey: string;
  webhookSecret?: string;
}

export interface StripePaymentLink {
  id: string;
  url: string;
  amount: number;
  title: string;
  description?: string;
  status: string;
  created: string;
}

export interface StripePaymentStatus {
  id: string;
  status: string;
  amount_received: number;
  amount_total: number;
  payment_status: string;
}

// Get Stripe credentials (without secrets)
export async function getStripeCredentials(brandId: string): Promise<{ configured: boolean } & Partial<StripeCredentials>> {
  const token = getAuthToken();

  const response = await fetch(`${API_BASE_URL}/stripe-payments/credentials/${brandId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  await handleApiError(response);
  return response.json();
}

// Save Stripe credentials
export async function saveStripeCredentials(
  brandId: string, 
  publishableKey: string, 
  secretKey: string, 
  webhookSecret?: string
): Promise<ApiResponse> {
  const token = getAuthToken();

  const response = await fetch(`${API_BASE_URL}/stripe-payments/save-credentials`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      brandId,
      publishableKey,
      secretKey,
      webhookSecret
    })
  });

  await handleApiError(response);
  return response.json();
}

// Test Stripe connection
export async function testStripeConnection(brandId: string): Promise<ApiResponse> {
  const token = getAuthToken();

  const response = await fetch(`${API_BASE_URL}/stripe-payments/test-connection/${brandId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  await handleApiError(response);
  return response.json();
}

// Create payment link
export async function createStripePaymentLink(
  brandId: string,
  amount: number,
  title: string,
  description?: string
): Promise<{ success: boolean; paymentLink: StripePaymentLink }> {
  const token = getAuthToken();

  const response = await fetch(`${API_BASE_URL}/stripe-payments/create-payment-link`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      brandId,
      amount,
      title,
      description
    })
  });

  await handleApiError(response);
  return response.json();
}

// Get payment status
export async function getStripePaymentStatus(
  brandId: string,
  paymentId: string
): Promise<{ success: boolean; payment: StripePaymentStatus }> {
  const token = getAuthToken();

  const response = await fetch(`${API_BASE_URL}/stripe-payments/payment-status/${brandId}/${paymentId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  await handleApiError(response);
  return response.json();
}
