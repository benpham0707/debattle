// src/lib/judgeService.ts - Enhanced Version
import { supabase } from './supabase'
import OpenAI from 'openai'

export interface JudgeResult {
  winner: 'pro' | 'con' | 'tie'
  scorePro: number
  scoreCon: number
  feedback: string
  healthDamage: number
  criteria: {
    clarity: { pro: number, con: number }
    logic: { pro: number, con: number }
    responsiveness: { pro: number, con: number }
    persuasiveness: { pro: number, con: number }
  }
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export class JudgeService {
  private static MESSAGES_TABLE = 'messages'
  private static ROUNDS_TABLE = 'debate_rounds'

  // Main judging function with enhanced health calculation
  public static async judgePhase(roomId: string, phase: string): Promise<JudgeResult> {
    console.log(`🧠 JUDGE SERVICE - Judging ${phase} phase for room ${roomId.slice(-8)}`)
    
    const messages = await this.fetchMessages(roomId, phase)
    
    if (messages.length === 0) {
      console.log('⚠️ No messages found for this phase, applying default scoring')
      return this.createDefaultResult()
    }

    const proArguments = messages
      .filter(m => m.player_side === 'pro')
      .map(m => m.content.trim())
      .join('\n\n')

    const conArguments = messages
      .filter(m => m.player_side === 'con')
      .map(m => m.content.trim())
      .join('\n\n')

    if (!proArguments && !conArguments) {
      return this.createDefaultResult()
    } else if (!proArguments) {
      return this.createWalkoverResult('con')
    } else if (!conArguments) {
      return this.createWalkoverResult('pro')
    }

    const result = await this.callAIJudge(proArguments, conArguments, phase)
    
    await this.persistResults(roomId, phase, result)
    await this.applyHealthDamage(roomId, result)

    return result
  }

  private static async fetchMessages(roomId: string, phase: string) {
    const { data, error } = await supabase
      .from(this.MESSAGES_TABLE)
      .select('player_side, content, created_at, sender_name')
      .eq('room_id', roomId)
      .eq('phase', phase)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('❌ Error fetching messages:', error)
      throw new Error('Failed to fetch messages')
    }
    
    console.log(`📜 Found ${data?.length || 0} messages for ${phase} phase`)
    return data as Array<{ player_side: 'pro' | 'con'; content: string; sender_name: string }>
  }

  private static async callAIJudge(pro: string, con: string, phase: string): Promise<JudgeResult> {
    const prompt = this.buildJudgingPrompt(pro, con, phase)

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert debate judge with years of experience in competitive debate. Evaluate arguments fairly and provide detailed scoring.'
          },
          {
            role: 'user', 
            content: prompt
          }
        ],
        temperature: 0.3, // Lower temperature for more consistent judging
        max_tokens: 1000
      })

      const content = response.choices[0].message.content
      if (!content) {
        throw new Error('No content in AI response')
      }

      return this.parseAIResponse(content)
    } catch (error) {
      console.error('❌ OpenAI API error:', error)
      throw new Error(`AI judging failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private static buildJudgingPrompt(pro: string, con: string, phase: string): string {
    const phaseContext = this.getPhaseContext(phase)
    
    return `You are judging a ${phase} phase of a competitive debate. ${phaseContext}

Rate each debater on these 4 criteria (0-5 points each):
1. **Clarity** - How clear and well-structured are their arguments?
2. **Logic & Evidence** - How logical and well-supported are their points?
3. **Responsiveness** - How well do they address the topic/opponent?
4. **Persuasiveness** - How compelling and impactful are they?

**PRO SIDE:**
${pro}

**CON SIDE:**
${con}

Provide your response in this EXACT JSON format:
{
  "criteria": {
    "clarity": { "pro": 0-5, "con": 0-5 },
    "logic": { "pro": 0-5, "con": 0-5 },
    "responsiveness": { "pro": 0-5, "con": 0-5 },
    "persuasiveness": { "pro": 0-5, "con": 0-5 }
  },
  "scorePro": 0-20,
  "scoreCon": 0-20,
  "winner": "pro", "con", or "tie",
  "feedback": "2-3 sentences explaining your decision, focusing on key differences"
}`
  }

  private static getPhaseContext(phase: string): string {
    switch (phase) {
      case 'opening':
        return 'This is the opening statements phase where debaters present their initial arguments and establish their position.'
      case 'rebuttal':
        return 'This is the rebuttal phase where debaters respond to their opponent\'s opening arguments and defend their position.'
      case 'final':
        return 'This is the final arguments phase where debaters make their closing case and summarize why they should win.'
      default:
        return 'Evaluate the quality of arguments presented.'
    }
  }

  private static parseAIResponse(content: string): JudgeResult {
    try {
      // Extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response')
      }

      const parsed = JSON.parse(jsonMatch[0])
      
      // Validate required fields
      if (!parsed.criteria || !parsed.scorePro || !parsed.scoreCon || !parsed.winner || !parsed.feedback) {
        throw new Error('Missing required fields in AI response')
      }

      // Calculate health damage based on score difference
      const scoreDiff = Math.abs(parsed.scorePro - parsed.scoreCon)
      let healthDamage = 0
      
      if (scoreDiff >= 5) {
        healthDamage = 25 // Decisive victory
      } else if (scoreDiff >= 2) {
        healthDamage = 15 // Clear victory
      } else if (scoreDiff >= 1) {
        healthDamage = 5  // Narrow victory
      }
      // If tied (scoreDiff = 0), healthDamage remains 0

      return {
        winner: parsed.winner,
        scorePro: parsed.scorePro,
        scoreCon: parsed.scoreCon,
        feedback: parsed.feedback,
        healthDamage: healthDamage,
        criteria: parsed.criteria
      }
    } catch (error) {
      console.error('❌ Error parsing AI response:', error)
      console.error('Raw response:', content)
      throw new Error('Failed to parse AI judgment')
    }
  }

  private static async persistResults(roomId: string, phase: string, result: JudgeResult): Promise<void> {
    const { error } = await supabase
      .from(this.ROUNDS_TABLE)
      .insert({
        room_id: roomId,
        phase,
        winner: result.winner,
        score_pro: result.scorePro,
        score_con: result.scoreCon,
        feedback: result.feedback,
        health_damage: result.healthDamage,
        ai_judgment: result.criteria,
        
        // Individual criteria scores
        player_a_clarity_score: result.criteria.clarity.pro,
        player_a_logic_score: result.criteria.logic.pro,
        player_a_rebuttal_score: result.criteria.responsiveness.pro,
        player_a_persuasion_score: result.criteria.persuasiveness.pro,
        
        player_b_clarity_score: result.criteria.clarity.con,
        player_b_logic_score: result.criteria.logic.con,
        player_b_rebuttal_score: result.criteria.responsiveness.con,
        player_b_persuasion_score: result.criteria.persuasiveness.con
      })

    if (error) {
      console.error('❌ Error saving judging results:', error)
      throw new Error('Failed to save judging results')
    }

    console.log('✅ Judging results saved to database')
  }

  private static async applyHealthDamage(roomId: string, result: JudgeResult): Promise<void> {
    if (result.winner === 'tie' || result.healthDamage === 0) {
      console.log('⚖️ Tied round - no health damage applied')
      return
    }

    try {
      // Get current room state to determine which player loses health
      const { data: room, error: fetchError } = await supabase
        .from('rooms')
        .select('player_a_health, player_b_health, player_a_side, player_b_side')
        .eq('id', roomId)
        .single()

      if (fetchError || !room) {
        throw new Error('Failed to fetch room for health update')
      }

      let updateData: any = {}
      let losingPlayer = ''

      // Determine which player loses health based on their assigned sides
      if (result.winner === 'pro') {
        // Pro won, so con loses health
        if (room.player_a_side === 'con') {
          updateData.player_a_health = Math.max(0, room.player_a_health - result.healthDamage)
          losingPlayer = 'Player A'
        } else {
          updateData.player_b_health = Math.max(0, room.player_b_health - result.healthDamage)
          losingPlayer = 'Player B'
        }
      } else {
        // Con won, so pro loses health
        if (room.player_a_side === 'pro') {
          updateData.player_a_health = Math.max(0, room.player_a_health - result.healthDamage)
          losingPlayer = 'Player A'
        } else {
          updateData.player_b_health = Math.max(0, room.player_b_health - result.healthDamage)
          losingPlayer = 'Player B'
        }
      }

      const { error: updateError } = await supabase
        .from('rooms')
        .update(updateData)
        .eq('id', roomId)

      if (updateError) {
        throw new Error('Failed to update player health')
      }

      console.log(`💥 Health damage applied: ${losingPlayer} lost ${result.healthDamage} HP`)
      
      // Check for knockout
      const newHealth = Object.values(updateData)[0] as number
      if (newHealth <= 0) {
        console.log(`🥊 KNOCKOUT! ${losingPlayer} has been eliminated!`)
      }

    } catch (error) {
      console.error('❌ Error applying health damage:', error)
      throw error
    }
  }

  // Helper methods for edge cases
  private static createDefaultResult(): JudgeResult {
    return {
      winner: 'tie',
      scorePro: 0,
      scoreCon: 0,
      feedback: 'No arguments submitted by either side.',
      healthDamage: 0,
      criteria: {
        clarity: { pro: 0, con: 0 },
        logic: { pro: 0, con: 0 },
        responsiveness: { pro: 0, con: 0 },
        persuasiveness: { pro: 0, con: 0 }
      }
    }
  }

  private static createWalkoverResult(winner: 'pro' | 'con'): JudgeResult {
    const proScore = winner === 'pro' ? 12 : 0
    const conScore = winner === 'con' ? 12 : 0
    
    return {
      winner,
      scorePro: proScore,
      scoreCon: conScore,
      feedback: `${winner.toUpperCase()} wins by walkover - opponent did not submit arguments.`,
      healthDamage: 25, // Maximum damage for walkover
      criteria: {
        clarity: { pro: winner === 'pro' ? 3 : 0, con: winner === 'con' ? 3 : 0 },
        logic: { pro: winner === 'pro' ? 3 : 0, con: winner === 'con' ? 3 : 0 },
        responsiveness: { pro: winner === 'pro' ? 3 : 0, con: winner === 'con' ? 3 : 0 },
        persuasiveness: { pro: winner === 'pro' ? 3 : 0, con: winner === 'con' ? 3 : 0 }
      }
    }
  }
}
