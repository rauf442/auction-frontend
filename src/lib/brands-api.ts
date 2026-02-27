// frontend/src/lib/brands-api.ts
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

export interface BankAccount {
  account_name: string
  uk_info?: {
    sort_code: string
    account_number: string
  }
  international_info?: {
    iban: string
    bic: string
    intermediary_bic: string
  }
}

export interface Brand {
  id: number
  name: string
  code: string
  brand_address?: string
  contact_email?: string
  contact_phone?: string
  business_whatsapp_number?: string
  website_url?: string
  is_active?: boolean
  logo_url?: string
  company_registration?: string
  vat_number?: string
  eori_number?: string
  business_license?: string
  compliance_notes?: string
  privacy_policy?: string
  terms_and_conditions?: string
  buyer_terms_and_conditions?: string
  vendor_terms_and_conditions?: string
  bank_accounts?: BankAccount[]
}

export interface BrandsResponse {
  success: boolean
  data: Brand[]
  message?: string
}

export interface BrandResponse {
  success: boolean
  data: Brand
  message?: string
}

export async function getBrands(): Promise<BrandsResponse> {
  try {
    const token = getAuthToken()
    
    const response = await fetch(`${API_BASE_URL}/brands`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || 'Failed to fetch brands')
    }

    const data = await response.json()
    return data
  } catch (error: any) {
    console.error('Error fetching brands:', error)
    return {
      success: false,
      data: [],
      message: error.message || 'Failed to fetch brands'
    }
  }
}

export async function getBrandByCode(code: string): Promise<BrandResponse> {
  try {
    const token = getAuthToken()
    
    const response = await fetch(`${API_BASE_URL}/brands/by-code/${code}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || 'Failed to fetch brand')
    }

    const data = await response.json()
    return data
  } catch (error: any) {
    console.error('Error fetching brand by code:', error)
    throw new Error(error.message || 'Failed to fetch brand')
  }
}

export async function getBrandById(id: number): Promise<BrandResponse> {
  try {
    const token = getAuthToken()
    
    const response = await fetch(`${API_BASE_URL}/brands/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || 'Failed to fetch brand')
    }

    const data = await response.json()
    return data
  } catch (error: any) {
    console.error('Error fetching brand by ID:', error)
    throw new Error(error.message || 'Failed to fetch brand')
  }
}

export async function getBrandCompliance(id: number): Promise<BrandResponse> {
  try {
    const token = getAuthToken()
    
    const response = await fetch(`${API_BASE_URL}/brands/${id}/compliance`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || 'Failed to fetch brand compliance')
    }

    const data = await response.json()
    return data
  } catch (error: any) {
    console.error('Error fetching brand compliance:', error)
    throw new Error(error.message || 'Failed to fetch brand compliance')
  }
}

export async function updateBrandCompliance(id: number, complianceData: Partial<Brand>): Promise<BrandResponse> {
  try {
    const token = getAuthToken()
    
    const response = await fetch(`${API_BASE_URL}/brands/${id}/compliance`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(complianceData)
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || 'Failed to update brand compliance')
    }

    const data = await response.json()
    return data
  } catch (error: any) {
    console.error('Error updating brand compliance:', error)
    throw new Error(error.message || 'Failed to update brand compliance')
  }
}
