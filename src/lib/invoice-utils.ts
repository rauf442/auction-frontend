// frontend/src/lib/invoice-utils.ts
import { InvoiceItem } from '../types/invoice'

export interface BuyersPremiumRate {
  threshold: number
  rate: number
}

export interface InsuranceRate {
  region: 'UK' | 'International'
  tiers: Array<{
    min: number
    max: number
    charge: number
  }>
}

// Buyer's Premium rates based on the specification
export const BUYERS_PREMIUM_RATES: BuyersPremiumRate[] = [
  { threshold: 100000, rate: 0.25 }, // 25% for first £100,000
  { threshold: Infinity, rate: 0.15 } // 15% for excess over £100,001
]

// Additional platform commission
export const LIVE_AUCTIONEER_COMMISSION_RATE = 0.05 // 5% for Live Auctioneer

// VAT rates
export const VAT_RATES = {
  STANDARD: 0.20, // 20%
  REDUCED: 0.05,  // 5%
  ZERO: 0.00      // 0%
}

// Insurance rates based on total price
export const INSURANCE_RATES: InsuranceRate[] = [
  {
    region: 'UK',
    tiers: [
      { min: 0, max: 1000, charge: 20 },
      { min: 1001, max: 5000, charge: 35 },
      { min: 5001, max: 25000, charge: 45 },
      { min: 25001, max: 50000, charge: 60 }
      // Over £50,000 requires specific contracts
    ]
  },
  {
    region: 'International',
    tiers: [
      { min: 0, max: 1000, charge: 30 },
      { min: 1001, max: 5000, charge: 50 },
      { min: 5001, max: 25000, charge: 60 },
      { min: 25001, max: 50000, charge: 75 }
      // Over £50,000 requires specific contracts
    ]
  }
]

/**
 * Calculate buyer's premium based on hammer price
 */
export function calculateBuyersPremium(hammerPrice: number, premiumRate?: number): number {
  // If a specific premium rate is provided, use it (for client-specific rates)
  if (premiumRate !== undefined) {
    return hammerPrice * premiumRate
  }

  // Otherwise use the standard tiered rates
  let premium = 0
  let remainingAmount = hammerPrice

  for (const tier of BUYERS_PREMIUM_RATES) {
    const amountInTier = Math.min(remainingAmount, tier.threshold - (hammerPrice - remainingAmount))
    premium += amountInTier * tier.rate
    remainingAmount -= amountInTier
    
    if (remainingAmount <= 0) break
  }

  return premium
}

/**
 * Calculate Live Auctioneer commission
 */
export function calculateLiveAuctioneerCommission(hammerPrice: number): number {
  return hammerPrice * LIVE_AUCTIONEER_COMMISSION_RATE
}

/**
 * Calculate VAT based on VAT code and amount
 */
export function calculateVAT(amount: number, vatCode: string): { vatAmount: number, vatRate: number } {
  switch (vatCode) {
    case 'M': // Margin Scheme - VAT inclusive, not shown separately
    case 'N': // Zero-rated
      return { vatAmount: 0, vatRate: 0 }
    case 'V': // Standard VAT
      return { vatAmount: amount * VAT_RATES.STANDARD, vatRate: VAT_RATES.STANDARD }
    case 'W': // Reduced VAT
      return { vatAmount: amount * VAT_RATES.REDUCED, vatRate: VAT_RATES.REDUCED }
    case 'Z': // Zero-rated
    case 'E': // Exempt
      return { vatAmount: 0, vatRate: 0 }
    default:
      return { vatAmount: amount * VAT_RATES.STANDARD, vatRate: VAT_RATES.STANDARD }
  }
}

/**
 * Calculate insurance cost based on total price and destination
 */
export function calculateInsuranceCost(totalPrice: number, destination: 'UK' | 'International'): number {
  const rates = INSURANCE_RATES.find(rate => rate.region === destination)
  if (!rates) return 0

  const tier = rates.tiers.find(tier => totalPrice >= tier.min && totalPrice <= tier.max)
  return tier ? tier.charge : 0 // For amounts over £50,000, return 0 as specific contracts are needed
}

/**
 * Parse dimensions string to extract height and width
 */
export function parseDimensions(dimensions?: string): { height: number, width: number } | null {
  if (!dimensions) return null
  
  // Try to match patterns like "12 x 8 inches", "12x8", "12 × 8", etc.
  const match = dimensions.match(/(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)/i)
  if (match) {
    return {
      height: parseFloat(match[1]),
      width: parseFloat(match[2])
    }
  }
  
  return null
}

/**
 * Calculate shipping cost based on dimensions and destination
 */
export function calculateShippingCost(
  destination: 'within_uk' | 'international',
  artworks: Array<{ height: number, width: number }>
): number {
  const baseRate = 50
  const dimensionMultiplier = 0.10
  const internationalSurcharge = 0.50
  
  // Calculate total dimensional weight
  const totalDimensionalWeight = artworks.reduce((total, artwork) => {
    // Add 2 inches for logistics packaging
    const logisticsHeight = artwork.height + 2
    const logisticsWidth = artwork.width + 2
    return total + (logisticsHeight * logisticsWidth)
  }, 0)
  
  let shippingCost = baseRate + (totalDimensionalWeight * dimensionMultiplier)
  
  if (destination === 'international') {
    shippingCost *= (1 + internationalSurcharge)
  }
  
  return Math.round(shippingCost * 100) / 100 // Round to 2 decimal places
}

/**
 * Generate invoice number
 */
export function generateInvoiceNumber(): string {
  const date = new Date()
  const year = date.getFullYear().toString().slice(-2)
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  
  return `INV-${year}${month}${random}`
}

/**
 * Format currency to GBP
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2
  }).format(amount)
}

/**
 * Calculate total for an invoice item
 */
export function calculateItemTotal(item: InvoiceItem): number {
  const buyersPremium = calculateBuyersPremium(item.hammer_price)
  const buyersPremiumVAT = calculateVAT(buyersPremium, 'V').vatAmount // Buyer's premium always has 20% VAT
  const itemVAT = calculateVAT(item.hammer_price, item.vat_code).vatAmount
  
  return item.hammer_price + buyersPremium + buyersPremiumVAT + itemVAT + (item.shipping_cost || 0) + (item.insurance_cost || 0)
} 