// frontend/src/app/api/auctions/[id]/invoices/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const auctionId = resolvedParams.id

    // Forward request to backend
    const backendUrl = `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'}/api/auctions/${auctionId}/invoices`
    
    const response = await fetch(backendUrl, {
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Backend responded with status: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Error fetching auction invoices:', error)
    return NextResponse.json(
      { error: 'Failed to fetch auction invoices', details: error.message },
      { status: 500 }
    )
  }
}
