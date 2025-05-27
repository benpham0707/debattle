import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Start the edge function
serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Fetch all active rooms that aren't finished
  const { data: rooms, error } = await supabase
    .from('rooms')
    .select('id, current_phase, phase_start_time, phase_duration')
    .neq('status', 'finished')

  if (error || !rooms) {
    console.error('Failed to fetch rooms:', error)
    return new Response(JSON.stringify({ error: 'Room query failed' }), { status: 500 })
  }

  const now = new Date()

  for (const room of rooms) {
    const startTime = new Date(room.phase_start_time)
    const elapsedSeconds = (now.getTime() - startTime.getTime()) / 1000

    if (elapsedSeconds >= room.phase_duration) {
      try {
        const response = await fetch('http://localhost:3000/api/judge/check-phases', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${Deno.env.get('JUDGE_SECRET')}`
          }
        })

        if (!response.ok) {
          throw new Error(`Judge API failed: ${await response.text()}`)
        }
      } catch (err) {
        console.error(`Error triggering judging for room ${room.id}:`, err)
      }
    }
  }

  return new Response(JSON.stringify({ success: true }))
})
