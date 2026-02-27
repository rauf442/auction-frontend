// frontend/src/app/api/internal-communication/users/route.ts
import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization');
    
    if (!token) {
      return NextResponse.json({ error: 'Authorization token required' }, { status: 401 });
    }

    const response = await fetch(`${BACKEND_URL}/api/internal-communication/users`, {
      method: 'GET',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ error: data.error || 'Failed to fetch users' }, { status: response.status });
    }
    console.log(data);

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in users API route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 