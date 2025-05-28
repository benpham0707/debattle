// src/lib/phaseManager.ts
import { supabase } from './supabase'
import { JudgeService } from './judgeService'

export class PhaseManager {
  private static readonly PHASE_SEQUENCE = [
    'opening',      // 1:10 (30s A + 10s transition + 30s B)
    'rebuttal',     // 1:10 (30s B + 10s transition + 30s A) 
    'final',        // 1:10 (30s A + 10s transition + 30s B)
    'finished'      // Game over
  ]

  private static readonly PHASE_DURATIONS = {
    opening: 70,    // 30 + 10 + 30 seconds
    rebuttal: 70,   // 30 + 10 + 30 seconds  
    final: 70,      // 30 + 10 + 30 seconds
    judging: 15     // AI processing time
  }

  // Main phase progression logic
  static async processPhaseTransitions(): Promise<void> {
    console.log('🔄 PHASE MANAGER - Checking for phase transitions...')
    
    const { data: rooms, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('status', 'debating')
      .not('current_phase', 'is', null)

    if (error || !rooms) {
      console.error('❌ Failed to fetch active rooms:', error)
      return
    }

    const now = new Date()

    for (const room of rooms) {
      try {
        await this.handleRoomPhaseCheck(room, now)
      } catch (error) {
        console.error(`❌ Error processing room ${room.id}:`, error)
      }
    }
  }

  private static async handleRoomPhaseCheck(room: any, now: Date): Promise<void> {
    if (!room.phase_start_time || !room.phase_duration) {
      console.log(`⚠️ Room ${room.id.slice(-8)} missing phase timing data`)
      return
    }

    const phaseStart = new Date(room.phase_start_time)
    const elapsedSeconds = Math.floor((now.getTime() - phaseStart.getTime()) / 1000)
    const isPhaseComplete = elapsedSeconds >= room.phase_duration

    if (!isPhaseComplete) {
      return // Phase still active
    }

    console.log(`⏰ Room ${room.id.slice(-8)} phase "${room.current_phase}" completed`)

    // Handle phase completion based on current phase
    switch (room.current_phase) {
      case 'opening':
      case 'rebuttal':  
      case 'final':
        await this.triggerJudgingPhase(room)
        break
        
      case 'judging':
        await this.completeJudgingAndAdvance(room)
        break
        
      default:
        console.log(`⚠️ Unknown phase: ${room.current_phase}`)
    }
  }

  // Trigger AI judging after debate phase completes
  private static async triggerJudgingPhase(room: any): Promise<void> {
    console.log(`🤖 Starting AI judging for ${room.current_phase} phase in room ${room.id.slice(-8)}`)
    
    // Update to judging phase
    await supabase
      .from('rooms')
      .update({
        current_phase: 'judging',
        phase_start_time: new Date().toISOString(),
        phase_duration: this.PHASE_DURATIONS.judging
      })
      .eq('id', room.id)

    // Trigger background AI judging (don't await - let it run async)
    this.performAIJudging(room.id, room.current_phase).catch(error => {
      console.error(`❌ AI judging failed for room ${room.id}:`, error)
    })
  }

  // Perform the actual AI judging
  private static async performAIJudging(roomId: string, phase: string): Promise<void> {
    try {
      console.log(`🧠 AI judging ${phase} phase for room ${roomId.slice(-8)}`)
      
      const result = await JudgeService.judgePhase(roomId, phase)
      
      console.log(`✅ AI judging complete for room ${roomId.slice(-8)}:`, {
        winner: result.winner,
        scorePro: result.scorePro,
        scoreCon: result.scoreCon
      })
      
      // Mark judging as complete in database
      await supabase
        .from('rooms')
        .update({
          [`${phase}_judging_complete`]: true
        })
        .eq('id', roomId)
        
    } catch (error) {
      console.error(`❌ AI judging failed for room ${roomId}:`, error)
      
      // Mark as failed and advance anyway to prevent stuck games
      await supabase
        .from('rooms')
        .update({
          [`${phase}_judging_complete`]: true,
          [`${phase}_judging_error`]: error instanceof Error ? error.message : 'Unknown error'
        })
        .eq('id', roomId)
    }
  }

  // Complete judging phase and advance to next phase
  private static async completeJudgingAndAdvance(room: any): Promise<void> {
    const previousPhase = this.getPreviousPhase(room)
    const nextPhase = this.getNextPhase(previousPhase)
    
    console.log(`🎯 Advancing room ${room.id.slice(-8)} from judging to: ${nextPhase || 'FINISHED'}`)

    if (!nextPhase) {
      // Game is finished
      await this.finishGame(room)
      return
    }

    // Start next debate phase
    await supabase
      .from('rooms')
      .update({
        current_phase: nextPhase,
        phase_start_time: new Date().toISOString(),
        phase_duration: this.PHASE_DURATIONS[nextPhase as keyof typeof this.PHASE_DURATIONS]
      })
      .eq('id', room.id)
  }

  // Determine the winner and finish the game
  private static async finishGame(room: any): Promise<void> {
    console.log(`🏁 Finishing game for room ${room.id.slice(-8)}`)
    
    let winnerId: string | null = null
    let winnerName: string | null = null
    
    // Determine winner by health
    if (room.player_a_health <= 0) {
      winnerId = room.player_b_id
      winnerName = room.player_b_name || 'Player B'
    } else if (room.player_b_health <= 0) {
      winnerId = room.player_a_id  
      winnerName = room.player_a_name || 'Player A'
    } else if (room.player_a_health > room.player_b_health) {
      winnerId = room.player_a_id
      winnerName = room.player_a_name || 'Player A'
    } else if (room.player_b_health > room.player_a_health) {
      winnerId = room.player_b_id
      winnerName = room.player_b_name || 'Player B'
    }
    // If tied health, winner remains null (tie game)

    await supabase
      .from('rooms')
      .update({
        status: 'finished',
        current_phase: null,
        phase_start_time: null,
        phase_duration: null,
        winner_id: winnerId,
        winner_name: winnerName
      })
      .eq('id', room.id)

    console.log(`🎉 Game finished! Winner: ${winnerName || 'TIE'}`)
  }

  // Helper methods
  private static getPreviousPhase(room: any): string {
    // Look at the room state to determine what phase we just judged
    // This could be stored in room state or inferred from recent debate_rounds
    return room.last_completed_phase || 'opening'
  }

  private static getNextPhase(currentPhase: string): string | null {
    const currentIndex = this.PHASE_SEQUENCE.indexOf(currentPhase)
    if (currentIndex === -1 || currentIndex === this.PHASE_SEQUENCE.length - 1) {
      return null // Game finished
    }
    return this.PHASE_SEQUENCE[currentIndex + 1]
  }

  // Force advance a room (for testing/admin)
  static async forceAdvancePhase(roomId: string): Promise<void> {
    const { data: room } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', roomId)
      .single()

    if (!room) {
      throw new Error('Room not found')
    }

    await this.handleRoomPhaseCheck(room, new Date())
  }
}