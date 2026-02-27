// frontend/admin/src/app/website/metsab/page.tsx
"use client"

import React from 'react'
import WebsiteManagement from '@/components/website/WebsiteManagement'

export default function MetsabWebsitePage() {
  return (
    <WebsiteManagement
      brandName="Metsab"
      brandInitial="M"
      brandCode="METSAB"
      brandId={1}
      envVar="NEXT_PUBLIC_FRONTEND_URL_METSAB"
      fallbackUrl="http://localhost:3002"
      gradientFrom="from-blue-600"
      gradientTo="to-blue-700"
      primaryColor="bg-blue-600"
      primaryColorHover="hover:bg-blue-700"
      accentColor="text-blue-100"
      accentColorLight="bg-blue-100"
      accentColorDark="text-blue-600"
    />
  )
}
