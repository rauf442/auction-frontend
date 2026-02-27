// frontend/src/app/api/auctions/import-eoa/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()

    // Forward request to backend
    const backendUrl = `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'}/api/auctions/import-eoa`
    
    const response = await fetch(backendUrl, {
      method: 'POST',
      body: formData, // Forward the form data as-is
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `Backend responded with status: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Error importing EOA data:', error)
    return NextResponse.json(
      { error: 'Failed to import EOA data', details: error.message },
      { status: 500 }
    )
  }
}
