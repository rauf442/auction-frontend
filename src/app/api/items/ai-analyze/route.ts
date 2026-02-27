// frontend/src/app/api/items/ai-analyze/route.ts
import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export async function POST(request: NextRequest) {
  try {
    // Get the form data from the request
    const formData = await request.formData()
    
    // Get authorization header
    const authorization = request.headers.get('authorization')
    
    // Create headers for backend request
    const headers: HeadersInit = {}
    if (authorization) {
      headers['Authorization'] = authorization
    }

    // Forward the request to the backend
    const backendResponse = await fetch(`${BACKEND_URL}/api/items/ai-analyze`, {
      method: 'POST',
      headers,
      body: formData,
    })

    // Check if the response is ok
    if (!backendResponse.ok) {
      const errorText = await backendResponse.text()
      console.error('Backend error:', errorText)
      
      try {
        const errorJson = JSON.parse(errorText)
        return NextResponse.json(
          { error: errorJson.error || 'Backend error' },
          { status: backendResponse.status }
        )
      } catch {
        return NextResponse.json(
          { error: errorText || 'Backend error' },
          { status: backendResponse.status }
        )
      }
    }

    // Parse and return the response
    const data = await backendResponse.json()
    return NextResponse.json(data)

  } catch (error: any) {
    console.error('API route error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
} 