// frontend/src/app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
    
    const response = await fetch(`${backendUrl}/api/users`, {
      headers: {
        'Authorization': authHeader || '',
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Backend API error:', response.status, errorText)
      return NextResponse.json(
        { error: 'Failed to fetch users', details: errorText },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json({ users: data.data || [] })
  } catch (error) {
    console.error('API route error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 