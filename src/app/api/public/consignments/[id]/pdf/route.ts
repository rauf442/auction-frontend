// frontend/src/app/api/public/consignments/[id]/pdf/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: consignmentId } = await params

    if (!consignmentId) {
      return NextResponse.json(
        { error: 'Consignment ID is required' },
        { status: 400 }
      )
    }

    // For public access, we'll redirect to the backend PDF generation
    // The backend should handle public access validation
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
    const pdfUrl = `${backendUrl}/api/consignments/${consignmentId}/receipt-pdf?public=true`

    // Fetch the PDF from the backend
    const response = await fetch(pdfUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // For public access, we might not need authentication
        // The backend should handle this appropriately
      },
      body: JSON.stringify({}),
    })

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Consignment not found or not publicly available' },
          { status: 404 }
        )
      }

      if (response.status === 403) {
        return NextResponse.json(
          { error: 'This consignment is not publicly available' },
          { status: 403 }
        )
      }

      throw new Error(`Backend responded with status: ${response.status}`)
    }

    const pdfBlob = await response.blob()

    // Return the PDF with appropriate headers
    return new NextResponse(pdfBlob, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="consignment-${consignmentId}.pdf"`,
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
      },
    })

  } catch (error) {
    console.error('Error serving public consignment PDF:', error)

    return NextResponse.json(
      {
        error: 'Failed to generate consignment document',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    )
  }
}
