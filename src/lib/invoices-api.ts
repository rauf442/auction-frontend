// frontend/src/lib/invoices-api.ts

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : 'http://localhost:3001/api'

// Get authentication token from localStorage
const getAuthToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token')
  }
  return null
}

export interface Invoice {
  id: number
  invoice_number: string
  auction_id?: number
  brand_id?: number
  client_id?: number
  item_id?: number
  platform?: string
  lot_number?: string
  lot_id?: string
  title?: string
  sale_price?: number
  buyers_premium?: number
  buyer_first_name?: string
  buyer_last_name?: string
  buyer_email?: string
  buyer_phone?: string
  shipping_method?: string
  shipping_status?: string
  ship_to_phone?: string
  ship_to_first_name?: string
  ship_to_last_name?: string
  ship_to_company?: string
  ship_to_address?: string
  ship_to_city?: string
  ship_to_state?: string
  ship_to_country?: string
  ship_to_postal_code?: string
  paddle_number?: string
  premium_bidder?: boolean
  type?: 'buyer' | 'vendor'
  is_paid?: boolean
  invoice_date?: string
  tracking_number?: string
  total_amount?: number
  logistics?: any
  shipping_charge?: number
  insurance_charge?: number
  total_shipping_amount?: number
  hammer_price?: number
  vat_amount?: number
  status?: string
  created_at?: string
  updated_at?: string
  // Related data
  client?: {
    id: number
    first_name: string
    last_name: string
    email?: string
    phone_number?: string
  }
  auction?: {
    id: number
    short_name: string
    long_name: string
    settlement_date?: string
  }
  brand?: {
    id: number
    name: string
    code: string
  }
}

export interface InvoicesResponse {
  success: boolean
  data: Invoice[]
  pagination?: {
    page: number
    limit: number
    total: number
    pages: number
  }
  message?: string
}

export interface InvoiceResponse {
  success: boolean
  data: Invoice
  message?: string
}

export const InvoicesAPI = {
  // Get all invoices with optional filtering
  async getInvoices(params?: {
    auction_id?: number
    client_id?: number
    status?: string
    brand_code?: string
    page?: number
    limit?: number
  }): Promise<InvoicesResponse> {
    try {
      const token = getAuthToken()
      const queryParams = new URLSearchParams()
      
      if (params?.auction_id) queryParams.set('auction_id', params.auction_id.toString())
      if (params?.client_id) queryParams.set('client_id', params.client_id.toString())
      if (params?.status) queryParams.set('status', params.status)
      if (params?.brand_code) queryParams.set('brand_code', params.brand_code)
      if (params?.page) queryParams.set('page', params.page.toString())
      if (params?.limit) queryParams.set('limit', params.limit.toString())

      const url = `${API_BASE_URL}/invoices${queryParams.toString() ? '?' + queryParams.toString() : ''}`
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || 'Failed to fetch invoices')
      }

      return await response.json()
    } catch (error: any) {
      console.error('Error fetching invoices:', error)
      return {
        success: false,
        data: [],
        message: error.message || 'Failed to fetch invoices'
      }
    }
  },

  // Get single invoice
  async getInvoice(id: number): Promise<InvoiceResponse> {
    try {
      const token = getAuthToken()
      
      const response = await fetch(`${API_BASE_URL}/invoices/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || 'Failed to fetch invoice')
      }

      return await response.json()
    } catch (error: any) {
      console.error('Error fetching invoice:', error)
      throw new Error(error.message || 'Failed to fetch invoice')
    }
  },

  // Update invoice
  async updateInvoice(id: number, data: Partial<Invoice>): Promise<Invoice> {
    try {
      const token = getAuthToken()
      
      const response = await fetch(`${API_BASE_URL}/invoices/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || 'Failed to update invoice')
      }

      const result = await response.json()
      return result.data || result
    } catch (error: any) {
      console.error('Error updating invoice:', error)
      throw new Error(error.message || 'Failed to update invoice')
    }
  },

  // Delete invoice
  async deleteInvoice(id: number): Promise<void> {
    try {
      const token = getAuthToken()
      
      const response = await fetch(`${API_BASE_URL}/invoices/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || 'Failed to delete invoice')
      }
    } catch (error: any) {
      console.error('Error deleting invoice:', error)
      throw new Error(error.message || 'Failed to delete invoice')
    }
  },

  // Generate invoice from auction
  async generateFromAuction(params: { auction_id: number }): Promise<Invoice> {
    try {
      const token = getAuthToken()
      
      const response = await fetch(`${API_BASE_URL}/invoices/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(params)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || 'Failed to generate invoice')
      }

      const result = await response.json()
      return result.data || result
    } catch (error: any) {
      console.error('Error generating invoice:', error)
      throw new Error(error.message || 'Failed to generate invoice')
    }
  },

  // Get invoices for refund (compatibility function)
  async getInvoicesForRefund(params?: { auction_id?: number }): Promise<InvoicesResponse> {
    return this.getInvoices(params)
  },

  // Send acknowledgment email
  async sendAcknowledgmentEmail(invoiceId: number): Promise<{ success: boolean; message: string }> {
    try {
      const token = getAuthToken()

      const response = await fetch(`${API_BASE_URL}/invoices/${invoiceId}/send-acknowledgment-email`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || 'Failed to send acknowledgment email')
      }

      return await response.json()
    } catch (error: any) {
      console.error('Error sending acknowledgment email:', error)
      throw new Error(error.message || 'Failed to send acknowledgment email')
    }
  },

  // Update paid amount
  async updatePaidAmount(invoiceId: number, paidAmount: number): Promise<{ success: boolean; message: string }> {
    try {
      const token = getAuthToken()

      const response = await fetch(`${API_BASE_URL}/invoices/${invoiceId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ paid_amount: paidAmount })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || 'Failed to update paid amount')
      }

      return await response.json()
    } catch (error: any) {
      console.error('Error updating paid amount:', error)
      throw new Error(error.message || 'Failed to update paid amount')
    }
  },

  // Generate public invoice URL
  async generatePublicUrl(invoiceId: number): Promise<{ success: boolean; url: string; message?: string }> {
    try {
      const token = getAuthToken()

      const response = await fetch(`${API_BASE_URL}/invoices/${invoiceId}/generate-public-url`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || 'Failed to generate public URL')
      }

      return await response.json()
    } catch (error: any) {
      console.error('Error generating public URL:', error)
      throw new Error(error.message || 'Failed to generate public URL')
    }
  },

  // Get public invoice with token verification (no auth required)
  async getPublicInvoice(invoiceId: number, accessToken: string): Promise<InvoiceResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/public/invoices/${invoiceId}/${accessToken}`, {
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || 'Failed to fetch public invoice')
      }

      return await response.json()
    } catch (error: any) {
      console.error('Error fetching public invoice:', error)
      throw new Error(error.message || 'Failed to fetch public invoice')
    }
  },

  // Generate public invoice PDF with token verification
  async generatePublicPdf(invoiceId: number, accessToken: string): Promise<Blob> {
    try {
      const response = await fetch(`${API_BASE_URL}/public/invoices/${invoiceId}/${accessToken}/pdf`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || 'Failed to generate public PDF')
      }

      return await response.blob()
    } catch (error: any) {
      console.error('Error generating public PDF:', error)
      throw new Error(error.message || 'Failed to generate public PDF')
    }
  },

  // Update shipping selection for public invoice with token verification
  async updatePublicShipping(invoiceId: number, accessToken: string, shippingData: any): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/public/invoices/${invoiceId}/${accessToken}/shipping`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(shippingData)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || 'Failed to update shipping')
      }

      return await response.json()
    } catch (error: any) {
      console.error('Error updating shipping:', error)
      throw new Error(error.message || 'Failed to update shipping')
    }
  },

  // Create shipping payment link for public invoice with token verification
  async createPublicShippingPaymentLink(invoiceId: number, accessToken: string, shippingAmount: number, customerEmail?: string): Promise<{ success: boolean; paymentLink: string; message: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/public/invoices/${invoiceId}/${accessToken}/create-shipping-payment-link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ shippingAmount, customerEmail })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || 'Failed to create shipping payment link')
      }

      return await response.json()
    } catch (error: any) {
      console.error('Error creating shipping payment link:', error)
      throw new Error(error.message || 'Failed to create shipping payment link')
    }
  },

  // Check payment status for public invoice with token verification
  async checkPublicPaymentStatus(invoiceId: number, accessToken: string): Promise<{ success: boolean; status: string; totalAmount: number; paidAmount: number; dueAmount: number; lastChecked: string; message?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/public/invoices/${invoiceId}/${accessToken}/payment-status`, {
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || 'Failed to check payment status')
      }

      return await response.json()
    } catch (error: any) {
      console.error('Error checking payment status:', error)
      throw new Error(error.message || 'Failed to check payment status')
    }
  },

  // Create shipping payment link (authenticated)
  async createShippingPaymentLink(invoiceId: number, shippingAmount: number, customerEmail?: string): Promise<{ success: boolean; paymentLink: string; message: string }> {
    try {
      const token = getAuthToken()

      const response = await fetch(`${API_BASE_URL}/invoices/${invoiceId}/create-shipping-payment-link`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ shippingAmount, customerEmail })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || 'Failed to create shipping payment link')
      }

      return await response.json()
    } catch (error: any) {
      console.error('Error creating shipping payment link:', error)
      throw new Error(error.message || 'Failed to create shipping payment link')
    }
  },

  // Check payment status (authenticated)
  async checkPaymentStatus(invoiceId: number): Promise<{ success: boolean; status: string; totalAmount: number; paidAmount: number; dueAmount: number; lastChecked: string; message?: string }> {
    try {
      const token = getAuthToken()

      const response = await fetch(`${API_BASE_URL}/invoices/${invoiceId}/payment-status`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || 'Failed to check payment status')
      }

      return await response.json()
    } catch (error: any) {
      console.error('Error checking payment status:', error)
      throw new Error(error.message || 'Failed to check payment status')
    }
  },

  // Send payment confirmation email
  async sendPaymentConfirmationEmail(invoiceId: number, paymentType: 'invoice' | 'shipping' = 'invoice', amount?: number, paymentDate?: string): Promise<{ success: boolean; message: string }> {
    try {
      const token = getAuthToken()

      const response = await fetch(`${API_BASE_URL}/invoices/${invoiceId}/send-payment-confirmation`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ paymentType, amount, paymentDate })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || 'Failed to send payment confirmation email')
      }

      return await response.json()
    } catch (error: any) {
      console.error('Error sending payment confirmation email:', error)
      throw new Error(error.message || 'Failed to send payment confirmation email')
    }
  }
}

// Legacy export for compatibility
export const getInvoicesForRefund = InvoicesAPI.getInvoicesForRefund.bind(InvoicesAPI)