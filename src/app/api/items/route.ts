// frontend/src/app/api/items/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 })
    }

    // Forward all query parameters (auction_id, status, brand_code, pagination, etc.)
    const { searchParams } = new URL(request.url)
    const queryString = searchParams.toString()
    const backendBase = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'
    const url = `${backendBase}/api/items${queryString ? `?${queryString}` : ''}`

    // Fetch from our backend
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      return NextResponse.json({ error: text || 'Failed to fetch items from backend' }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
    
  } catch (error) {
    console.error('Error fetching items:', error)
    return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 })
  }
} 