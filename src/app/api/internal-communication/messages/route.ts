// frontend/src/app/api/internal-communication/messages/route.ts
import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = request.headers.get('Authorization');
    
    if (!token) {
      return NextResponse.json({ error: 'Authorization token required' }, { status: 401 });
    }

    const queryString = searchParams.toString();
    const url = `${BACKEND_URL}/api/internal-communication/messages${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ error: data.error || 'Failed to fetch messages' }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in messages API route:', error);
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
    if (!body.content && !body.task_title) {
      return NextResponse.json({ error: 'Message content or task title is required' }, { status: 400 });
    }

    if (body.message_type === 'task' && (!body.task_title || !body.task_assigned_to)) {
      return NextResponse.json({ error: 'Task title and assigned user are required for task messages' }, { status: 400 });
    }

    const response = await fetch(`${BACKEND_URL}/api/internal-communication/messages`, {
      method: 'POST',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ error: data.error || 'Failed to send message' }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in messages POST API route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 