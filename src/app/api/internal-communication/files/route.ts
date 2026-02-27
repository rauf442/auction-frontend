// frontend/src/app/api/internal-communication/files/route.ts
import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization');
    
    if (!token) {
      return NextResponse.json({ error: 'Authorization token required' }, { status: 401 });
    }

    // Get the form data
    const formData = await request.formData();
    
    // Forward the request to the backend
    const response = await fetch(`${BACKEND_URL}/api/internal-communication/files`, {
      method: 'POST',
      headers: {
        'Authorization': token,
      },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ error: data.error || 'Failed to upload files' }, { 
        status: response.status 
      });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error uploading files:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization');
    
    if (!token) {
      return NextResponse.json({ error: 'Authorization token required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const message_id = searchParams.get('message_id');
    const limit = searchParams.get('limit') || '20';

    const params = new URLSearchParams({ limit });
    if (message_id) params.append('message_id', message_id);

    const response = await fetch(`${BACKEND_URL}/api/internal-communication/files?${params}`, {
      method: 'GET',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ error: data.error || 'Failed to fetch files' }, { 
        status: response.status 
      });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching files:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 