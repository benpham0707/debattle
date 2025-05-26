import { createClient } from '@supabase/supabase-js'

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL')
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// Types for our database tables
export type Room = {
  id: string
  created_at: string
  status: 'waiting' | 'side_selection' | 'ready_to_start' | 'debating' | 'finished'
  topic: string
  player_a_id: string | null
  player_b_id: string | null
  player_a_name: string | null
  player_b_name: string | null
  player_a_ready: boolean | null
  player_b_ready: boolean | null
  
  // Side selection voting
  player_a_side_vote: 'pro' | 'con' | null  // What player A voted for
  player_b_side_vote: 'pro' | 'con' | null  // What player B voted for
  player_a_side: 'pro' | 'con' | null       // Final assigned side
  player_b_side: 'pro' | 'con' | null       // Final assigned side
  side_selection_deadline: string | null     // When voting ends
  
  player_a_health: number
  player_b_health: number
  current_phase: 'side_selection' | 'opening_prep' | 'opening' | 'rebuttal' | 'crossfire' | 'final' | 'judging' | null
  
  // Phase timing
  phase_start_time: string | null
  phase_duration: number | null // Duration in seconds
  
  winner_id: string | null
  winner_name: string | null
}

export type Message = {
  id: string
  room_id: string
  user_id: string | null
  sender_name: string
  content: string
  created_at: string
  phase: 'side_selection' | 'opening_prep' | 'opening' | 'rebuttal' | 'crossfire' | 'final' | 'judging'
  player_side: 'pro' | 'con'
}

export type DebateRound = {
  id: string
  room_id: string
  phase: 'opening' | 'rebuttal' | 'crossfire' | 'final'
  
  // AI Judging Results
  ai_judgment: any // JSON object with full AI response
  player_a_score: number // Score out of 100
  player_b_score: number // Score out of 100
  winner: 'player_a' | 'player_b' | 'tie' // Round winner
  health_damage: number // HP lost by losing player
  
  // Performance metrics (1-10 scale)
  player_a_clarity_score: number
  player_a_logic_score: number
  player_a_rebuttal_score: number
  player_a_persuasion_score: number
  
  player_b_clarity_score: number
  player_b_logic_score: number
  player_b_rebuttal_score: number
  player_b_persuasion_score: number
  
  created_at: string
}

export type User = {
  id: string
  username: string
  created_at: string
  wins: number
  losses: number
  total_debates: number
}

// Game phase configurations
export const PHASE_CONFIGS = {
  side_selection: { duration: 10, label: 'Side Selection' },
  opening_prep: { duration: 30, label: 'Opening Prep' }, // New prep phase
  opening: { duration: 70, label: 'Opening Statements' }, // 30s + 10s transition + 30s
  rebuttal: { duration: 60, label: 'Rebuttals' }, // 30s each
  crossfire: { duration: 90, label: 'Crossfire Q&A' }, // 1.5 minutes rapid fire
  final: { duration: 60, label: 'Final Arguments' }, // 30s each
  judging: { duration: 30, label: 'AI Judging' }
}

// Helper function to determine if it's a player's turn
export function isPlayerTurn(
  phase: string, 
  playerRole: 'player_a' | 'player_b',
  phaseStartTime: string,
  phaseDuration: number
): boolean {
  if (!['opening', 'rebuttal', 'final'].includes(phase)) {
    return true // Crossfire and other phases allow both players
  }
  
  const elapsed = Math.floor((Date.now() - new Date(phaseStartTime).getTime()) / 1000)
  
  if (phase === 'opening') {
    // Opening: 0-30s = Player A, 30-40s = Transition, 40-70s = Player B
    if (elapsed < 30) {
      return playerRole === 'player_a'
    } else if (elapsed < 40) {
      return false // Transition period - no one speaks
    } else {
      return playerRole === 'player_b'
    }
  } else {
    // Rebuttal and Final: 30s each player
    const halfDuration = phaseDuration / 2
    if (elapsed < halfDuration) {
      return playerRole === 'player_a'
    } else {
      return playerRole === 'player_b'
    }
  }
}

// Helper function to get current turn info
export function getCurrentTurnInfo(
  phase: string,
  phaseStartTime: string,
  phaseDuration: number
): { currentSpeaker: 'player_a' | 'player_b' | 'transition' | 'none', timeLeft: number } {
  if (!['opening', 'rebuttal', 'final'].includes(phase)) {
    const elapsed = Math.floor((Date.now() - new Date(phaseStartTime).getTime()) / 1000)
    return { 
      currentSpeaker: 'none', 
      timeLeft: Math.max(0, phaseDuration - elapsed) 
    }
  }
  
  const elapsed = Math.floor((Date.now() - new Date(phaseStartTime).getTime()) / 1000)
  
  if (phase === 'opening') {
    if (elapsed < 30) {
      return { 
        currentSpeaker: 'player_a', 
        timeLeft: 30 - elapsed 
      }
    } else if (elapsed < 40) {
      return { 
        currentSpeaker: 'transition', 
        timeLeft: 40 - elapsed 
      }
    } else {
      return { 
        currentSpeaker: 'player_b', 
        timeLeft: 70 - elapsed 
      }
    }
  } else {
    // Rebuttal and Final phases
    const halfDuration = phaseDuration / 2
    if (elapsed < halfDuration) {
      return { 
        currentSpeaker: 'player_a', 
        timeLeft: halfDuration - elapsed 
      }
    } else {
      return { 
        currentSpeaker: 'player_b', 
        timeLeft: phaseDuration - elapsed 
      }
    }
  }
}