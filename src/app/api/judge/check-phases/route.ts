// src/app/api/judge/check-phases/route.ts - Enhanced Version
import { NextResponse } from 'next/server'
import { PhaseManager } from '@/lib/phaseManager'

export async function GET() {
  try {
    console.log('🔄 Phase check API called')
    
    // Process all room phase transitions
    await PhaseManager.processPhaseTransitions()
    
    return NextResponse.json({ 
      success: true, 
      timestamp: new Date().toISOString(),
      message: 'Phase transitions processed'
    })
  } catch (error) {
    console.error('❌ Phase check API error:', error)
    return NextResponse.json(
      { 
        error: 'Phase processing failed', 
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }, 
      { status: 500 }
    )
  }
}

// Force advance a specific room (for testing/admin)
export async function POST(request: Request) {
  try {
    const { roomId } = await request.json()
    
    if (!roomId) {
      return NextResponse.json(
        { error: 'roomId is required' }, 
        { status: 400 }
      )
    }

    await PhaseManager.forceAdvancePhase(roomId)
    
    return NextResponse.json({ 
      success: true,
      message: `Room ${roomId} phase advanced`,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('❌ Force advance error:', error)
    return NextResponse.json(
      { 
        error: 'Force advance failed', 
        message: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
}