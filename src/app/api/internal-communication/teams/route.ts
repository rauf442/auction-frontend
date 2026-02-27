// frontend/src/app/api/internal-communication/teams/route.ts
import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization');
    
    if (!token) {
      return NextResponse.json({ error: 'Authorization token required' }, { status: 401 });
    }

    const response = await fetch(`${BACKEND_URL}/api/internal-communication/teams`, {
      method: 'GET',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ error: data.error || 'Failed to fetch teams' }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in teams API route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization');
    
    if (!token) {
      return NextResponse.json({ error: 'Authorization token required' }, { status: 401 });
    }

    const body = await request.json();

    // Validate required fields
    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'Team name is required' }, { status: 400 });
    }

    const response = await fetch(`${BACKEND_URL}/api/internal-communication/teams`, {
      method: 'POST',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ error: data.error || 'Failed to create team' }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in teams POST API route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 