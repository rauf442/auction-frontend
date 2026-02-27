// frontend/src/app/api/auctions/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 })
    }

    // Forward any query parameters (e.g., brand_code, pagination, filters)
    const { searchParams } = new URL(request.url)
    const queryString = searchParams.toString()
    const backendBase = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'

    // Fetch from our backend, preserving query string
    const response = await fetch(`${backendBase}/api/auctions${queryString ? `?${queryString}` : ''}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      return NextResponse.json({ error: text || 'Failed to fetch auctions from backend' }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
    
  } catch (error) {
    console.error('Error fetching auctions:', error)
    return NextResponse.json({ error: 'Failed to fetch auctions' }, { status: 500 })
  }
} 