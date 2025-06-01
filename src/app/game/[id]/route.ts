// src/app/api/game/[roomId]/route.ts
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Get current game state for a room
export async function GET(
  request: Request,
  { params }: { params: { roomId: string } }
) {
  try {
    const roomId = params.roomId

    // Get room details
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', roomId)
      .single()

    if (roomError || !room) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      )
    }

    // Get recent judging results
    const { data: rounds, error: roundsError } = await supabase
      .from('debate_rounds')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
      .limit(5)

    if (roundsError) {
      console.error('Error fetching rounds:', roundsError)
    }

    // Calculate current turn info
    const turnInfo = getCurrentTurnInfo(room)
    
    // Get message count for current phase
    const { count: messageCount } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('room_id', roomId)
      .eq('phase', room.current_phase || '')

    const gameState = {
      room,
      rounds: rounds || [],
      turnInfo,
      messageCount: messageCount || 0,
      isGameActive: room.status === 'debating',
      phaseTimeRemaining: calculateTimeRemaining(room),
      healthStatus: {
        playerA: {
          health: room.player_a_health,
          percentage: room.player_a_health,
          status: getHealthStatus(room.player_a_health)
        },
        playerB: {
          health: room.player_b_health,
          percentage: room.player_b_health,
          status: getHealthStatus(room.player_b_health)
        }
      }
    }

    return NextResponse.json(gameState)
  } catch (error) {
    console.error('Game state API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch game state' },
      { status: 500 }
    )
  }
}

// Submit a debate message
export async function POST(
  request: Request,
  { params }: { params: { roomId: string } }
) {
  try {
    const roomId = params.roomId
    const { content, playerSide, playerRole, userId } = await request.json()

    if (!content || !playerSide || !playerRole) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get room to validate it's in a debate phase
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('current_phase, status, player_a_name, player_b_name')
      .eq('id', roomId)
      .single()

    if (roomError || !room) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      )
    }

    if (room.status !== 'debating' || !room.current_phase) {
      return NextResponse.json(
        { error: 'Room is not in active debate phase' },
        { status: 400 }
      )
    }

    // Determine sender name
    const senderName = playerRole === 'player_a' 
      ? (room.player_a_name || 'Player A')
      : (room.player_b_name || 'Player B')

    // Insert message
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        room_id: roomId,
        user_id: userId,
        sender_name: `${senderName} (${playerSide.toUpperCase()})`,
        content: content.trim(),
        phase: room.current_phase,
        player_side: playerSide
      })
      .select()
      .single()

    if (messageError) {
      console.error('Error saving message:', messageError)
      return NextResponse.json(
        { error: 'Failed to save message' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      message,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Submit message API error:', error)
    return NextResponse.json(
      { error: 'Failed to submit message' },
      { status: 500 }
    )
  }
}

// Helper functions
function getCurrentTurnInfo(room: any) {
  if (!room.current_phase || !room.phase_start_time || !room.phase_duration) {
    return { currentSpeaker: 'none', timeLeft: 0, canSpeak: false }
  }

  const elapsed = Math.floor((Date.now() - new Date(room.phase_start_time).getTime()) / 1000)
  const timeLeft = Math.max(0, room.phase_duration - elapsed)

  // Determine who can speak based on phase and timing
  let currentSpeaker = 'none'
  let canSpeak = false

  if (room.current_phase === 'opening') {
    if (elapsed < 30) {
      currentSpeaker = 'player_a'
      canSpeak = true
    } else if (elapsed < 40) {
      currentSpeaker = 'transition'
      canSpeak = false
    } else if (elapsed < 70) {
      currentSpeaker = 'player_b'
      canSpeak = true
    }
  } else if (room.current_phase === 'rebuttal') {
    if (elapsed < 30) {
      currentSpeaker = 'player_b'
      canSpeak = true
    } else if (elapsed < 40) {
      currentSpeaker = 'transition'
      canSpeak = false
    } else if (elapsed < 70) {
      currentSpeaker = 'player_a'
      canSpeak = true
    }
  } else if (room.current_phase === 'final') {
    if (elapsed < 30) {
      currentSpeaker = 'player_a'
      canSpeak = true
    } else if (elapsed < 40) {
      currentSpeaker = 'transition'
      canSpeak = false
    } else if (elapsed < 70) {
      currentSpeaker = 'player_b'
      canSpeak = true
    }
  } else if (room.current_phase === 'judging') {
    currentSpeaker = 'ai_judge'
    canSpeak = false
  }

  return { currentSpeaker, timeLeft, canSpeak }
}

function calculateTimeRemaining(room: any): number {
  if (!room.phase_start_time || !room.phase_duration) {
    return 0
  }
  
  const elapsed = Math.floor((Date.now() - new Date(room.phase_start_time).getTime()) / 1000)
  return Math.max(0, room.phase_duration - elapsed)
}

function getHealthStatus(health: number): string {
  if (health > 75) return 'excellent'
  if (health > 50) return 'good'
  if (health > 25) return 'damaged'
  if (health > 0) return 'critical'
  return 'eliminated'
}