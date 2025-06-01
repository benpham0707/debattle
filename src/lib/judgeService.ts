import { supabase } from './supabase'
import OpenAI from 'openai'

export interface JudgeResult {
  winner: 'pro' | 'con'
  scorePro: number
  scoreCon: number
  feedback: string
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export class JudgeService {
  private static MESSAGES_TABLE = 'messages'
  private static ROUNDS_TABLE = 'debate_rounds'

  public static async judgePhase(roomId: string, phase: string): Promise<JudgeResult> {
    const messages = await this.fetchMessages(roomId, phase)

    const proArgument = messages
      .filter(m => m.player_side === 'pro')
      .map(m => m.content.trim())
      .join('\n')

    const conArgument = messages
      .filter(m => m.player_side === 'con')
      .map(m => m.content.trim())
      .join('\n')

    const result = await this.callAIJudge(proArgument, conArgument)

    await this.persistResults(roomId, phase, result)
    await this.adjustHealth(roomId, result)

    return result
  }

  private static async fetchMessages(roomId: string, phase: string) {
    const { data, error } = await supabase
      .from(this.MESSAGES_TABLE)
      .select('player_side, content, created_at')
      .eq('room_id', roomId)
      .eq('phase', phase)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching messages:', error)
      throw new Error('Failed to fetch messages')
    }
    return data as Array<{ player_side: 'pro' | 'con'; content: string }>
  }

  private static async callAIJudge(pro: string, con: string): Promise<JudgeResult> {
    const prompt = `You are an impartial judge evaluating a debate between two players. Use the following rubric:

- Clarity of expression (20%)
- Logical coherence and structure (20%)
- Strength of evidence and examples (20%)
- Creativity and originality (20%)
- Persuasiveness and impact (20%)

Provide a JSON response in the following format:
{
  "winner": "pro" or "con",
  "scorePro": number (0-100),
  "scoreCon": number (0-100),
  "feedback": "Your reasoning as to why the winner won"
}

---

Pro:
${pro}

Con:
${con}`

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a fair and creative debate judge.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7
    })

    const match = response.choices[0].message.content?.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('Invalid AI judge response format')

    const result = JSON.parse(match[0])
    if (!result.winner || typeof result.scorePro !== 'number' || typeof result.scoreCon !== 'number') {
      throw new Error('Incomplete AI result format')
    }

    return result as JudgeResult
  }

  private static async persistResults(roomId: string, phase: string, result: JudgeResult) {
    const { error } = await supabase
      .from(this.ROUNDS_TABLE)
      .insert({
        room_id: roomId,
        phase,
        winner: result.winner,
        score_pro: result.scorePro,
        score_con: result.scoreCon,
        feedback: result.feedback
      })

    if (error) {
      console.error('Error saving judging results:', error)
      throw new Error('Failed to save judging results')
    }
  }

  private static async adjustHealth(roomId: string, result: JudgeResult) {
    const damage = Math.abs(result.scorePro - result.scoreCon)
    try {
      const { error } = await supabase.rpc('adjust_health', {
        room_id_param: roomId,
        damage_param: damage,
        winner_param: result.winner
      })
      if (error) {
        console.error('Health update failed:', error)
        throw new Error('Failed to adjust player health')
      }
    } catch (err) {
      console.error('RPC error adjusting health:', err)
      throw err
    }
  }
}

public static async generateFinalFeedback(roomId: string) 
{
  // Fetch all messages by phase
  const { data: messages, error } = await supabase
    .from(this.MESSAGES_TABLE)
    .select('player_side, content, phase')
    .eq('room_id', roomId)

  if (error || !messages) throw new Error('Failed to fetch messages for final feedback.')

  const proTranscript: Record<string, string[]> = {}
  const conTranscript: Record<string, string[]> = {}

  for (const msg of messages) {
    const target = msg.player_side === 'pro' ? proTranscript : conTranscript
    if (!target[msg.phase]) target[msg.phase] = []
    target[msg.phase].push(msg.content.trim())
  }

  const phases = ['opening', 'rebuttal', 'crossfire', 'final']
  const formatPhase = (map: Record<string, string[]>) =>
    phases.map(p => `${p.toUpperCase()}:\n${(map[p] || []).join('\n')}`).join('\n\n')

  const prompt = `
You're an expert AI debate judge. You just observed a full debate between two players. Evaluate their performance per phase and give personalized feedback to each player.

🎯 Rubric: Clarity, Logic, Evidence, Creativity, Persuasiveness.

Respond in JSON format:
{
  "pro": {
    "opening": { "score": 80, "feedback": "..." },
    ...
    "final_summary": "...",
    "improvement_tip": "..."
  },
  "con": { ... }
}

🧑‍⚖️ Pro's arguments:
${formatPhase(proTranscript)}

🧑‍⚖️ Con's arguments:
${formatPhase(conTranscript)}
  `

  const chatResponse = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'system', content: 'You are a skilled AI debate judge.' }, { role: 'user', content: prompt }],
    temperature: 0.7
  })

  const jsonResult = JSON.parse(chatResponse.choices[0].message.content || '{}')

  const { error: insertError } = await supabase.from('postmatch_feedback').insert({
    room_id: roomId,
    feedback_pro: jsonResult.pro,
    feedback_con: jsonResult.con
  })

  if (insertError) throw new Error('Failed to save post-match feedback')
}
