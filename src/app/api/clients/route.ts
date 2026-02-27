// frontend/src/app/api/clients/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const queryString = searchParams.toString()

    // Fetch from our backend
    const backendUrl = `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'}/api/clients${queryString ? `?${queryString}` : ''}`
    
    const response = await fetch(backendUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      console.error('Backend clients API error:', errorText)
      return NextResponse.json(
        { error: 'Failed to fetch clients from backend', details: errorText }, 
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
    
  } catch (error) {
    console.error('Error fetching clients:', error)
    return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 })
  }
}
