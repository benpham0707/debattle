import { supabase } from './supabase'
import { Room } from './supabase'

// List of debate topics for the MVP
const DEBATE_TOPICS = [
  "Should AI be regulated?",
  "Is social media harmful to democracy?",
  "Should college education be free?",
  "Is remote work better than office work?",
  "Should voting be mandatory?",
]

export const roomService = {
  // Helper to get current Supabase user ID
  async getUserId(): Promise<string | null> {
    const { data, error } = await supabase.auth.getUser()
    if (error || !data?.user) {
      return null
    }
    return data.user.id
  },

  // Create a new room
  async createRoom(): Promise<Room | null> {
    const userId = await this.getUserId()
    const randomTopic = DEBATE_TOPICS[Math.floor(Math.random() * DEBATE_TOPICS.length)]

    const { data, error } = await supabase
      .from('rooms')
      .insert([
        {
          topic: randomTopic,
          status: 'waiting',
          player_a_health: 100,
          player_b_health: 100,
          player_a_id: userId || null,
        }
      ])
      .select()
      .single()

    if (error) {
      console.error('Error creating room:', error)
      return null
    }

    return data
  },

  // Join an existing room
  async joinRoom(roomId: string, userId: string): Promise<Room | null> {
    // First, get the room to check its status
    const { data: room, error: fetchError } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', roomId)
      .single()

    if (fetchError || !room) {
      console.error('Error fetching room:', fetchError)
      return null
    }

    // Check if room is full
    if (room.player_a_id && room.player_b_id) {
      throw new Error('Room is full')
    }

    // Determine which player slot to fill
    const updateData = room.player_a_id 
      ? { player_b_id: userId }
      : { player_a_id: userId }

    // Update the room
    const { data, error: updateError } = await supabase
      .from('rooms')
      .update(updateData)
      .eq('id', roomId)
      .select()
      .single()

    if (updateError) {
      console.error('Error joining room:', updateError)
      return null
    }

    return data
  },

  // Get room details
  async getRoom(roomId: string): Promise<Room | null> {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', roomId)
      .single()

    if (error) {
      console.error('Error fetching room:', error)
      return null
    }

    return data
  },

  // Subscribe to room changes
  subscribeToRoom(roomId: string, callback: (room: Room) => void) {
    return supabase
      .channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rooms',
          filter: `id=eq.${roomId}`,
        },
        (payload) => {
          callback(payload.new as Room)
        }
      )
      .subscribe()
  }
}
