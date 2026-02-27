// frontend/src/app/api/invoices/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : 'http://localhost:3001/api';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const token = request.headers.get('authorization')

    if (!token) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 })
    }

    const response = await fetch(`${API_BASE_URL}/invoices/${resolvedParams.id}`, {
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return NextResponse.json(
        { error: errorData.message || 'Failed to fetch invoice' },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Error fetching invoice:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const token = request.headers.get('authorization')

    if (!token) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 })
    }

    // Get the request body
    const body = await request.json()

    console.log('Frontend API PUT - Request body:', JSON.stringify(body, null, 2))
    console.log('Frontend API PUT - Sending to backend:', `${API_BASE_URL}/api/invoices/${resolvedParams.id}`)

    const response = await fetch(`${API_BASE_URL}/invoices/${resolvedParams.id}`, {
      method: 'PUT',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })

    console.log('Frontend API PUT - Backend response status:', response.status)

    if (!response.ok) {
      const errorData = await response.text()
      console.error('Frontend API PUT - Backend error:', errorData)
      return NextResponse.json(
        { error: errorData || 'Failed to update invoice' },
        { status: response.status }
      )
    }

    const data = await response.json()
    console.log('Frontend API PUT - Success:', JSON.stringify(data, null, 2))
    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Error updating invoice:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
