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

// Helper function to generate a UUID v4
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c == 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

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
          player_a_id: userId, // Use actual user ID or null for guests
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
  async joinRoom(roomId: string, userId?: string): Promise<Room | null> {
    try {
      // First, get the room to check its status
      const { data: room, error: fetchError } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single()

      if (fetchError || !room) {
        console.error('Error fetching room:', fetchError)
        throw new Error('Room not found')
      }

      // Check if room is full
      if (room.player_a_id && room.player_b_id) {
        throw new Error('Room is full')
      }

      // Use actual user ID or null for guests
      const actualUserId = await this.getUserId()
      console.log('Using user ID:', actualUserId)

      // Determine which player slot to fill
      const updateData = room.player_a_id 
        ? { 
            player_b_id: actualUserId, 
            status: 'debating' 
          } 
        : { 
            player_a_id: actualUserId
          }

      console.log('Update data:', updateData)

      // Update the room
      const { data, error: updateError } = await supabase
        .from('rooms')
        .update(updateData)
        .eq('id', roomId)
        .select()
        .single()

      if (updateError) {
        console.error('Error joining room:', updateError)
        throw new Error('Failed to join room')
      }

      console.log('Successfully joined room:', data)
      return data
    } catch (error) {
      console.error('Join room error:', error)
      throw error
    }
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