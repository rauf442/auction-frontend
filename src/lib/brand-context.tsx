"use client"

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

export type BrandCode = string // Allow dynamic brands and 'ALL'

export interface BrandDetails {
  code: BrandCode
  name: string
  companyName: string
  email: string
  vatNumber?: string
  address?: string
  city?: string
  postcode?: string
  country?: string
  establishedYear?: string
  registrationNumber?: string
}

const BRAND_DETAILS: Record<BrandCode, BrandDetails> = {
  MSABER: {
    code: 'MSABER',
    name: 'Msaber',
    companyName: 'Msaber Auctions Ltd',
    email: 'info@msaber.com',
    vatNumber: 'GB123456789',
    address: '123 Auction Street',
    city: 'London',
    postcode: 'SW1A 1AA',
    country: 'United Kingdom',
    establishedYear: '2024',
    registrationNumber: '12345678'
  },
  AURUM: {
    code: 'AURUM',
    name: 'Aurum',
    companyName: 'Aurum Auctions Ltd',
    email: 'info@aurumauctions.com',
    vatNumber: 'GB987654321',
    address: '456 Gold Lane',
    city: 'London',
    postcode: 'W1K 5AB',
    country: 'United Kingdom',
    establishedYear: '2024',
    registrationNumber: '87654321'
  },
  METSAB: {
    code: 'METSAB',
    name: 'Metsab',
    companyName: 'MetSab Auctions Ltd',
    email: 'info@metsabauctions.com',
    vatNumber: 'GB478646141',
    address: '789 Art Avenue',
    city: 'London',
    postcode: 'EC1A 1BB',
    country: 'United Kingdom',
    establishedYear: '2024',
    registrationNumber: '11223344'
  }
}

interface BrandContextValue {
  brand: BrandCode
  setBrand: (code: BrandCode) => void
  details: BrandDetails
}

const BrandContext = createContext<BrandContextValue | undefined>(undefined)

export function BrandProvider({ children }: { children: React.ReactNode }) {
  const [brand, setBrandState] = useState<BrandCode>('ALL')

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? (localStorage.getItem('brand_code') as BrandCode | null) : null
    if (saved) setBrandState(saved)
  }, [])

  const setBrand = (code: BrandCode) => {
    setBrandState(code)
    if (typeof window !== 'undefined') localStorage.setItem('brand_code', code)
  }

  const details = useMemo(() => {
    if (BRAND_DETAILS[brand]) return BRAND_DETAILS[brand]
    if (brand === 'ALL') return { code: 'ALL' as BrandCode, name: 'All Brands', companyName: 'All Companies', email: '' }
    // Fallback for unknown dynamic brands
    return { code: brand, name: brand, companyName: brand, email: '' }
  }, [brand])

  const value: BrandContextValue = { brand, setBrand, details }
  return <BrandContext.Provider value={value}>{children}</BrandContext.Provider>
}

export function useBrand() {
  const ctx = useContext(BrandContext)
  if (!ctx) throw new Error('useBrand must be used within BrandProvider')
  return ctx
}

export const getBrandDetails = (code: BrandCode): BrandDetails => {
  if (BRAND_DETAILS[code]) return BRAND_DETAILS[code]
  if (code === 'ALL') return { 
    code: 'ALL', 
    name: 'All Brands', 
    companyName: 'All Companies', 
    email: '',
    address: 'Various Locations',
    city: 'London',
    postcode: 'SW1A 1AA',
    country: 'United Kingdom',
    establishedYear: '2024',
    registrationNumber: '00000000'
  }
  // Fallback safe object to avoid undefined access in PDFs
  return { 
    code, 
    name: String(code), 
    companyName: String(code), 
    email: '',
    address: '123 Default Street',
    city: 'London',
    postcode: 'SW1A 1AA',
    country: 'United Kingdom',
    establishedYear: '2024',
    registrationNumber: '00000000'
  }
}


