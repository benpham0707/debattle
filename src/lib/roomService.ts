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
  async createRoom(): Promise<{ room: Room; playerRole: 'player_a' | 'player_b' }> {
    let userId = await this.getUserId()
    
    console.log('Original user ID:', userId)
    
    // If no authenticated user, generate a session UUID for guests
    if (!userId) {
      userId = generateUUID()
      console.log('Generated guest UUID for room creator:', userId)
    }
    
    // Double check the UUID is valid
    if (!userId || userId === 'null' || userId === null) {
      userId = `guest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      console.log('Fallback UUID generated:', userId)
    }
    
    const randomTopic = DEBATE_TOPICS[Math.floor(Math.random() * DEBATE_TOPICS.length)]

    console.log('About to create room with user ID:', userId)
    console.log('User ID type:', typeof userId)

    const roomData = {
      topic: randomTopic,
      status: 'waiting',
      player_a_health: 100,
      player_b_health: 100,
      player_a_ready: false,
      player_b_ready: false,
      player_a_id: userId, // Creator is always Player A with actual UUID
    }
    
    console.log('Room data to insert:', roomData)

    const { data, error } = await supabase
      .from('rooms')
      .insert([roomData])
      .select()
      .single()

    if (error) {
      console.error('Error creating room:', error)
      throw new Error('Failed to create room')
    }

    console.log('Successfully created room:', data)
    console.log('Final player_a_id in database:', data.player_a_id)

    return { room: data, playerRole: 'player_a' }
  },

  // Join an existing room
  async joinRoom(roomId: string, userId?: string): Promise<{ room: Room; playerRole: 'player_a' | 'player_b' }> {
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

      // Use actual user ID or generate UUID for guests
      let actualUserId = await this.getUserId()
      if (!actualUserId) {
        actualUserId = generateUUID()
        console.log('Generated guest UUID for room joiner:', actualUserId)
      }
      
      console.log('Current room state:', { player_a_id: room.player_a_id, player_b_id: room.player_b_id })
      console.log('Joining with user ID:', actualUserId)

      // Determine which player slot to fill and role
      let updateData: any
      let playerRole: 'player_a' | 'player_b'

      if (room.player_a_id === null || room.player_a_id === undefined) {
        // Player A slot is empty
        updateData = { 
          player_a_id: actualUserId,
          player_a_ready: false
        }
        playerRole = 'player_a'
        console.log('Joining as Player A')
      } else if (room.player_b_id === null || room.player_b_id === undefined) {
        // Player B slot is empty
        updateData = { 
          player_b_id: actualUserId,
          player_b_ready: false
        }
        playerRole = 'player_b'
        console.log('Joining as Player B')
      } else {
        throw new Error('Room is full')
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

      console.log('Successfully joined room as:', playerRole, data)
      
      // Force a small delay to ensure database consistency
      setTimeout(() => {
        console.log('Room join completed, real-time updates should trigger')
      }, 100)
      
      return { room: data, playerRole }
    } catch (error) {
      console.error('Join room error:', error)
      throw error
    }
  },

  // Ready up for the game
  async readyUp(roomId: string): Promise<Room | null> {
    try {
      const userId = await this.getUserId()
      
      // Get current room state
      const { data: room, error: fetchError } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single()

      if (fetchError || !room) {
        throw new Error('Room not found')
      }

      // Determine which player is ready-ing up
      let updateData: any = {}
      
      if (room.player_a_id === userId) {
        updateData.player_a_ready = true
      } else if (room.player_b_id === userId) {
        updateData.player_b_ready = true
      } else {
        throw new Error('You are not in this room')
      }

      // Check if both players will be ready after this update
      const bothReady = (room.player_a_id === userId ? true : room.player_a_ready) && 
                       (room.player_b_id === userId ? true : room.player_b_ready)

      // If both players are ready, start the game
      if (bothReady && room.player_a_id && room.player_b_id) {
        updateData.status = 'debating'
      }

      // Update the room
      const { data, error: updateError } = await supabase
        .from('rooms')
        .update(updateData)
        .eq('id', roomId)
        .select()
        .single()

      if (updateError) {
        console.error('Error readying up:', updateError)
        throw new Error('Failed to ready up')
      }

      return data
    } catch (error) {
      console.error('Ready up error:', error)
      throw error
    }
  },

  // Unready (cancel ready status)
  async unready(roomId: string): Promise<Room | null> {
    try {
      const userId = await this.getUserId()
      
      // Get current room state
      const { data: room, error: fetchError } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single()

      if (fetchError || !room) {
        throw new Error('Room not found')
      }

      // Determine which player is un-readying
      let updateData: any = {}
      
      if (room.player_a_id === userId) {
        updateData.player_a_ready = false
      } else if (room.player_b_id === userId) {
        updateData.player_b_ready = false
      } else {
        throw new Error('You are not in this room')
      }

      // If game was about to start, keep it in waiting status
      if (room.status === 'debating') {
        updateData.status = 'waiting'
      }

      // Update the room
      const { data, error: updateError } = await supabase
        .from('rooms')
        .update(updateData)
        .eq('id', roomId)
        .select()
        .single()

      if (updateError) {
        console.error('Error unreadying:', updateError)
        throw new Error('Failed to unready')
      }

      return data
    } catch (error) {
      console.error('Unready error:', error)
      throw error
    }
  },

  // Leave room
  async leaveRoom(roomId: string): Promise<boolean> {
    try {
      const userId = await this.getUserId()
      
      // Get current room state
      const { data: room, error: fetchError } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single()

      if (fetchError || !room) {
        throw new Error('Room not found')
      }

      // Determine which player is leaving
      let updateData: any = {}
      
      if (room.player_a_id === userId) {
        updateData.player_a_id = null
        updateData.player_a_ready = false
      } else if (room.player_b_id === userId) {
        updateData.player_b_id = null
        updateData.player_b_ready = false
      } else {
        throw new Error('You are not in this room')
      }

      // Reset room status to waiting
      updateData.status = 'waiting'

      // Update the room
      const { error: updateError } = await supabase
        .from('rooms')
        .update(updateData)
        .eq('id', roomId)

      if (updateError) {
        console.error('Error leaving room:', updateError)
        throw new Error('Failed to leave room')
      }

      return true
    } catch (error) {
      console.error('Leave room error:', error)
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
    console.log('Setting up subscription for room:', roomId)
    
    const channel = supabase
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
          console.log('Database change detected:', payload)
          if (payload.new) {
            console.log('Calling callback with updated room:', payload.new)
            callback(payload.new as Room)
          }
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status)
      })

    return channel
  }
}