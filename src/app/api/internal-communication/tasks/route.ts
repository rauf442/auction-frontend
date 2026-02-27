// frontend/src/app/api/internal-communication/tasks/route.ts
import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = request.headers.get('Authorization');
    
    if (!token) {
      return NextResponse.json({ error: 'Authorization token required' }, { status: 401 });
    }

    // Add message_type=task to filter for tasks only
    searchParams.set('message_type', 'task');
    const queryString = searchParams.toString();
    
    const url = `${BACKEND_URL}/api/internal-communication/messages?${queryString}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ error: data.error || 'Failed to fetch tasks' }, { status: response.status });
    }

    // Transform the response to match expected format
    return NextResponse.json({
      tasks: data.messages || [],
      pagination: data.pagination
    });
  } catch (error) {
    console.error('Error in tasks API route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 