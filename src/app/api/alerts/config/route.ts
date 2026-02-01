import { NextRequest, NextResponse } from 'next/server';
import { getAlertConfig, updateAlertConfig } from '@/lib/alert-storage';

// GET - Retrieve current alert configuration
export async function GET() {
  const config = getAlertConfig();
  return NextResponse.json(config);
}

// POST - Update alert configuration
export async function POST(request: NextRequest) {
  try {
    const updates = await request.json();
    const newConfig = updateAlertConfig(updates);
    return NextResponse.json(newConfig);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update config' },
      { status: 500 }
    );
  }
}