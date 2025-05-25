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
  status: 'waiting' | 'ready_to_start' | 'debating' | 'finished'
  topic: string
  player_a_id: string | null
  player_b_id: string | null
  player_a_name: string | null
  player_b_name: string | null
  player_a_ready: boolean | null  // Added ready states
  player_b_ready: boolean | null  // Added ready states
  player_a_side: 'pro' | 'con' | null
  player_b_side: 'pro' | 'con' | null
  player_a_health: number
  player_b_health: number
  current_phase: 'opening' | 'rebuttal' | 'crossfire' | 'final' | 'judging' | null
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
  phase: 'opening' | 'rebuttal' | 'crossfire' | 'final' | 'judging'
  player_side: 'pro' | 'con'
}

export type User = {
  id: string
  username: string
  created_at: string
  wins: number
  losses: number
  total_debates: number
}