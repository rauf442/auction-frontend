// frontend/admin/src/app/website/aurum/page.tsx
"use client"

import React from 'react'
import WebsiteManagement from '@/components/website/WebsiteManagement'

export default function AurumWebsitePage() {
  return (
    <WebsiteManagement
      brandName="Aurum"
      brandInitial="A"
      brandCode="AURUM"
      brandId={2}
      envVar="NEXT_PUBLIC_FRONTEND_URL_AURUM"
      fallbackUrl="https://aurum-auctions-one.vercel.app"
      gradientFrom="from-amber-600"
      gradientTo="to-orange-600"
      primaryColor="bg-amber-600"
      primaryColorHover="hover:bg-amber-700"
      accentColor="text-amber-100"
      accentColorLight="bg-amber-100"
      accentColorDark="text-amber-600"
    />
  )
}
