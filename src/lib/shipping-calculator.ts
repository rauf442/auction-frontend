// frontend/src/lib/shipping-calculator.ts

// Evri UK shipping rates per kg (Standard Courier Collection)
export const EVRI_UK_RATES = {
  // UK Mainland rates per kg
  'Under 1kg': 3.90,
  '1-2kg': 5.78,
  '2-5kg': 7.49,
  '5-10kg': 7.49,
  '10-15kg': 10.99,
} as const;

// Evri International shipping rates per kg (Standard Courier Collection)
export const EVRI_INTERNATIONAL_RATES = {
  // Europe
  'France': 8.91,
  'Germany': 8.70,
  'Ireland': 8.89,
  'Italy': 9.22,
  'Spain': 8.83,
  'Netherlands': 9.55,
  'Belgium': 9.49,
  'Austria': 10.08,
  'Switzerland': 11.55,
  'Czech Republic': 10.19,
  
  // North America
  'USA': 13.72,
  'Canada': 15.95,
  
  // Rest of World
  'Australia': 16.16,
  'New Zealand': 17.77,
  'Japan': 15.05,

  // Asia
  'India' : 11.36,
} as const;

// Default international rate for countries not specifically listed
export const DEFAULT_INTERNATIONAL_RATE = 15.00;

// 5x multiplier for shipping invoice as specified
export const SHIPPING_INVOICE_MULTIPLIER = 5;

export interface ItemDimensions {
  length: number; // in cm
  width: number;  // in cm
  height: number; // in cm
  weight?: number; // in kg (actual weight)
}

/**
 * Calculate volumetric weight using standard formula: L × W × H / 5000
 */
export function calculateVolumetricWeight(dimensions: ItemDimensions): number {
  const { length, width, height } = dimensions;
  return (length * width * height) / 5000; // kg
}

/**
 * Get billable weight (higher of actual weight vs volumetric weight)
 */
export function getBillableWeight(dimensions: ItemDimensions): number {
  const volumetricWeight = calculateVolumetricWeight(dimensions);
  const actualWeight = dimensions.weight || 0;
  
  return Math.max(volumetricWeight, actualWeight);
}

/**
 * Get weight tier for UK shipping
 */
export function getUKWeightTier(weight: number): keyof typeof EVRI_UK_RATES {
  if (weight < 1) return 'Under 1kg';
  if (weight <= 2) return '1-2kg';
  if (weight <= 5) return '2-5kg';
  if (weight <= 10) return '5-10kg';
  return '10-15kg'; // Max 15kg
}

/**
 * Calculate Evri shipping cost for UK
 */
export function calculateUKShippingCost(items: ItemDimensions[]): number {
  const totalWeight = items.reduce((sum, item) => {
    return sum + getBillableWeight(item);
  }, 0);
  
  // Cap at 15kg maximum
  const cappedWeight = Math.min(totalWeight, 15);
  const tier = getUKWeightTier(cappedWeight);
  
  return EVRI_UK_RATES[tier];
}

/**
 * Calculate Evri shipping cost for international
 */
export function calculateInternationalShippingCost(
  items: ItemDimensions[], 
  country: string
): number {
  const totalWeight = items.reduce((sum, item) => {
    return sum + getBillableWeight(item);
  }, 0);
  
  // Cap at 15kg maximum
  const cappedWeight = Math.min(totalWeight, 15);
  
  // Get rate for specific country or use default
  const baseRate = EVRI_INTERNATIONAL_RATES[country as keyof typeof EVRI_INTERNATIONAL_RATES] 
    || DEFAULT_INTERNATIONAL_RATE;
  
  return baseRate * cappedWeight;
}

/**
 * Calculate final shipping cost for invoice (with 5x multiplier)
 */
export function calculateShippingInvoiceCost(
  items: ItemDimensions[],
  destination: 'within_uk' | 'international',
  country?: string
): number {
  let baseCost: number;
  
  if (destination === 'within_uk') {
    baseCost = calculateUKShippingCost(items);
  } else {
    baseCost = calculateInternationalShippingCost(items, country || 'Default');
  }
  
  return baseCost * SHIPPING_INVOICE_MULTIPLIER;
}

/**
 * Convert inches to centimeters
 */
export function inchesToCm(inches: number): number {
  return inches * 2.54;
}

/**
 * Convert centimeters to inches  
 */
export function cmToInches(cm: number): number {
  return cm / 2.54;
}

/**
 * Calculate packaging dimensions (add 2 inches padding for logistics)
 */
export function getPackagingDimensions(item: {
  length: number;
  width: number; 
  height: number;
}): ItemDimensions {
  return {
    length: item.length + inchesToCm(2),
    width: item.width + inchesToCm(2),
    height: item.height + inchesToCm(2),
  };
} 