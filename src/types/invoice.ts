// frontend/src/types/invoice.ts
export interface InvoiceItem {
  id: number
  lot_num: string
  title: string
  description: string
  hammer_price: number
  buyers_premium: number
  buyers_premium_vat: number
  shipping_cost?: number
  insurance_cost?: number
  vat_code: 'M' | 'N' | 'V' | 'W' | 'Z' | 'E'
  vat_rate: number
  dimensions?: string
  weight?: string
}

export interface InvoiceClient {
  id: number
  display_id: string
  first_name: string
  last_name: string
  email?: string
  phone_number?: string
  company_name?: string
  vat_number?: string
  billing_address1?: string
  billing_address2?: string
  billing_city?: string
  billing_post_code?: string
  billing_country?: string
}

export interface InvoiceAuction {
  id: number
  short_name: string
  long_name: string
  settlement_date: string
  vat_number: string
  eori_number: string
}

export interface Invoice {
  id: string
  invoice_number: string
  invoice_date: string
  due_date: string
  brand_code?: string
  client: InvoiceClient
  auction: InvoiceAuction
  items: InvoiceItem[]
  subtotal: number
  total_buyers_premium: number
  total_vat: number
  shipping_cost: number
  insurance_cost: number
  total_amount: number
  amount_due: number
  total_net_payments: number
  tracking_number?: string
  status: 'paid' | 'unpaid' | 'cancelled'
  logistics_added: boolean
}

export interface LogisticsInfo {
  status: 'pending' | 'in_transit' | 'delivered'
  tracking_number?: string
  description?: string
  destination: 'within_uk' | 'international'
  postal_code: string
  country: string
  logistics_method: 'metsab_courier' | 'customer_collection' | 'customer_courier'
  artworks: Array<{
    id: number
    title: string
    lot_num: string
    height: number
    width: number
    length: number
    logistics_height: number
    logistics_width: number
    logistics_length: number
    weight?: number
    actualWeight?: number
    volumetricWeight?: number
    billableWeight?: number
  }>
  shipping_cost: number
  insurance_cost: number
  total_cost: number
}

export interface Country {
  code: string
  name: string
  region: 'UK' | 'Europe' | 'International'
} 