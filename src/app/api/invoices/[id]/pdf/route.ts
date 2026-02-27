// frontend/src/app/api/invoices/[id]/pdf/route.ts
import { NextRequest, NextResponse } from 'next/server'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : 'http://localhost:3001/api';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const token = request.headers.get('authorization')
    
    if (!token) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 })
    }

    const body = await request.json()

    const response = await fetch(`${API_BASE_URL}/invoices/${resolvedParams.id}/pdf`, {
      method: 'POST',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return NextResponse.json(
        { error: errorData.message || 'Failed to generate PDF' },
        { status: response.status }
      )
    }

    // Forward the PDF blob
    const pdfBuffer = await response.arrayBuffer()
    
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-${resolvedParams.id}.pdf"`
      }
    })
  } catch (error: any) {
    console.error('Error generating PDF:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}