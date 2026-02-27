// frontend/src/app/api/internal-communication/messages/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function PUT(request: NextRequest, context: any) {
  try {
    const token = request.headers.get('Authorization');
    
    if (!token) {
      return NextResponse.json({ error: 'Authorization token required' }, { status: 401 });
    }

    const body = await request.json();
    const { id } = (context?.params || {}) as { id: string };

    const response = await fetch(`${BACKEND_URL}/api/internal-communication/messages/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ error: data.error || 'Failed to update message' }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in message update API route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: any) {
  try {
    const token = request.headers.get('Authorization');
    
    if (!token) {
      return NextResponse.json({ error: 'Authorization token required' }, { status: 401 });
    }

    const { id } = (context?.params || {}) as { id: string };

    const response = await fetch(`${BACKEND_URL}/api/internal-communication/messages/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const data = await response.json();
      return NextResponse.json({ error: data.error || 'Failed to delete message' }, { status: response.status });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in message delete API route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 