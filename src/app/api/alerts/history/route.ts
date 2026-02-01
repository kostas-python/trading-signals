import { NextRequest, NextResponse } from 'next/server';
import { getAlertHistory, getAlertStats } from '@/lib/supabase-alerts';

// GET - Retrieve alert history
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const includeStats = searchParams.get('stats') === 'true';

    const history = await getAlertHistory('default', Math.min(limit, 100));
    
    let stats = null;
    if (includeStats) {
      stats = await getAlertStats('default');
    }

    return NextResponse.json({
      history,
      stats,
      count: history.length,
    });
  } catch (error) {
    console.error('Error fetching alert history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch alert history' },
      { status: 500 }
    );
  }
}