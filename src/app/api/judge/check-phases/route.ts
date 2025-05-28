import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { JudgeService } from '@/lib/judgeService'

export async function GET() {
  // Get rooms where the phase has expired and game is not finished
  const { data: rooms, error } = await supabase
    .from('rooms')
    .select('id, current_phase, phase_start_time, phase_duration, status')
    .neq('status', 'finished')

  if (error || !rooms) {
    console.error('Failed to fetch rooms for judging:', error)
    return NextResponse.json({ error: 'Room query failed' }, { status: 500 })
  }

  const now = new Date()

  for (const room of rooms) {
    const startTime = new Date(room.phase_start_time)
    const elapsedSeconds = (now.getTime() - startTime.getTime()) / 1000
    if (room.status === 'ready_to_start') {
      continue
    }
    if (elapsedSeconds >= room.phase_duration) {
      try {
        await JudgeService.judgePhase(room.id, room.current_phase)

        // Move to next phase (or end game)
        const nextPhase = getNextPhase(room.current_phase)
        const newStatus = nextPhase ? 'debating' : 'finished'

        await supabase.from('rooms')
          .update({
            current_phase: nextPhase,
            phase_start_time: nextPhase ? new Date().toISOString() : null,
            status: newStatus
          })
          .eq('id', room.id)

      } catch (err) {
        console.error(`Failed to judge room ${room.id}:`, err)
      }
    }
  }

  return NextResponse.json({ success: true, processed: rooms.length })
}

// Simple phase progression logic
function getNextPhase(current: string): string | null {
  const phases = ['opening', 'rebuttal', 'crossfire', 'final']
  const idx = phases.indexOf(current)
  return idx >= 0 && idx < phases.length - 1 ? phases[idx + 1] : null
}