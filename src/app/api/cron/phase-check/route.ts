// src/app/api/cron/phase-check/route.ts
import { NextResponse } from 'next/server'
import { PhaseManager } from '@/lib/phaseManager'

// This endpoint should be called every 5 seconds by a cron service
// Vercel Cron, Railway Cron, or external service like cron-job.org
export async function GET(request: Request) {
  try {
    // Verify this is a legitimate cron call (optional security)
    const authHeader = request.headers.get('authorization')
    const expectedToken = process.env.CRON_SECRET_TOKEN
    
    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const startTime = Date.now()
    
    // Process all room phase transitions
    await PhaseManager.processPhaseTransitions()
    
    const processingTime = Date.now() - startTime
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      processingTimeMs: processingTime,
      message: 'Phase transitions processed successfully'
    })
  } catch (error) {
    console.error('❌ Cron phase check error:', error)
    return NextResponse.json(
      {
        error: 'Cron phase check failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

// Health check endpoint
export async function POST() {
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'debattle-phase-checker'
  })
}