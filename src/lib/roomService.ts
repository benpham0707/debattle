import { supabase } from './supabase'
import { Room } from './supabase'

// List of debate topics for the MVP
const DEBATE_TOPICS = [
  "Should AI be regulated?",
  "Is social media harmful to democracy?",
  "Should college education be free?",
  "Is remote work better than office work?",
  "Should voting be mandatory?",
  "Is climate change the most urgent global issue?",
  "Should universal basic income be implemented?",
  "Is social media more harmful than helpful?",
  "Should genetic engineering be widely used?",
  "Is online learning better than traditional classroom education?"
]

// Helper function to generate a proper UUID v4
function generateUUID(): string {
  // Use crypto.randomUUID if available (modern browsers)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  
  // Fallback to manual generation
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

// Store session ID globally for this browser session
let currentSessionId: string | null = null

export const roomService = {
  // Helper to get current Supabase user ID
  async getUserId(): Promise<string | null> {
    const { data, error } = await supabase.auth.getUser()
    if (error || !data?.user) {
      return null
    }
    return data.user.id
  },

  // Get or create session ID for this browser session
  getSessionId(): string {
    if (!currentSessionId) {
      currentSessionId = generateUUID()
      console.log('Generated new session ID:', currentSessionId)
    }
    return currentSessionId
  },

  // Create a new room
  async createRoom(): Promise<{ room: Room; playerRole: 'player_a' | 'player_b' }> {
    let userId = await this.getUserId()
    
    console.log('Original user ID:', userId)
    
    // If no authenticated user, use session UUID for guests
    if (!userId) {
      userId = this.getSessionId()
      console.log('Using session UUID for room creator:', userId)
    }
    
    const randomTopic = DEBATE_TOPICS[Math.floor(Math.random() * DEBATE_TOPICS.length)]

    console.log('Creating room with user ID:', userId)
    console.log('User ID type:', typeof userId, 'Length:', userId.length)

    const roomData = {
      topic: randomTopic,
      status: 'waiting' as const,
      player_a_health: 100,
      player_b_health: 100,
      player_a_ready: false,
      player_b_ready: false,
      player_a_id: userId,
    }
    
    console.log('Room data to insert:', roomData)

    const { data, error } = await supabase
      .from('rooms')
      .insert([roomData])
      .select()
      .single()

    if (error) {
      console.error('Error creating room:', error)
      throw new Error(`Failed to create room: ${error.message}`)
    }

    console.log('Successfully created room:', data)
    return { room: data, playerRole: 'player_a' }
  },

  // Join an existing room with proper error handling
  async joinRoom(roomId: string, userId?: string): Promise<{ room: Room; playerRole: 'player_a' | 'player_b' }> {
    try {
      // Use provided userId or get current user ID or use session ID
      let actualUserId = userId || await this.getUserId()
      if (!actualUserId) {
        actualUserId = this.getSessionId()
        console.log('Using session UUID for room joiner:', actualUserId)
      }

      console.log('Join room attempt with user ID:', actualUserId)
      console.log('User ID type:', typeof actualUserId, 'Length:', actualUserId.length)

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(actualUserId)) {
        console.error('Invalid UUID format:', actualUserId)
        // Generate a new proper UUID
        actualUserId = generateUUID()
        console.log('Generated new UUID:', actualUserId)
      }

      // First, check if the room exists and get its current state
      const { data: currentRoom, error: fetchError } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single()

      if (fetchError) {
        console.error('Error fetching room:', fetchError)
        if (fetchError.code === 'PGRST116') {
          throw new Error('Room not found')
        }
        throw new Error(`Database error: ${fetchError.message}`)
      }

      if (!currentRoom) {
        throw new Error('Room not found')
      }

      console.log('Current room state:', {
        id: currentRoom.id,
        player_a_id: currentRoom.player_a_id,
        player_b_id: currentRoom.player_b_id,
        status: currentRoom.status
      })

      // Check if user is already in the room
      if (currentRoom.player_a_id === actualUserId) {
        console.log('User already in room as Player A')
        return { room: currentRoom, playerRole: 'player_a' }
      }
      
      if (currentRoom.player_b_id === actualUserId) {
        console.log('User already in room as Player B')
        return { room: currentRoom, playerRole: 'player_b' }
      }

      // Check if room is full
      if (currentRoom.player_a_id && currentRoom.player_b_id) {
        throw new Error('Room is full')
      }

      // Determine which slot to fill
      let updateData: any
      let playerRole: 'player_a' | 'player_b'

      if (!currentRoom.player_a_id) {
        updateData = { 
          player_a_id: actualUserId,
          player_a_ready: false
        }
        playerRole = 'player_a'
        console.log('Joining as Player A')
      } else {
        updateData = { 
          player_b_id: actualUserId,
          player_b_ready: false
        }
        playerRole = 'player_b'
        console.log('Joining as Player B')
      }

      console.log('Update data:', updateData)

      // Update the room
      const { data: updatedRoom, error: updateError } = await supabase
        .from('rooms')
        .update(updateData)
        .eq('id', roomId)
        .select()
        .single()

      if (updateError) {
        console.error('Error updating room:', updateError)
        throw new Error(`Failed to join room: ${updateError.message}`)
      }

      if (!updatedRoom) {
        throw new Error('Failed to update room - no data returned')
      }

      console.log('Successfully joined room as:', playerRole)
      console.log('Updated room:', updatedRoom)

      return { room: updatedRoom, playerRole }

    } catch (error) {
      console.error('Join room error:', error)
      throw error
    }
  },

  // Start side selection phase
  async startSideSelection(roomId: string): Promise<Room | null> {
    try {
      const deadline = new Date(Date.now() + 10000) // 10 seconds from now
      
      const { data, error } = await supabase
        .from('rooms')
        .update({
          status: 'side_selection',
          current_phase: 'side_selection',
          side_selection_deadline: deadline.toISOString(),
          phase_start_time: new Date().toISOString(),
          phase_duration: 10
        })
        .eq('id', roomId)
        .select()
        .single()

      if (error) {
        console.error('Error starting side selection:', error)
        throw new Error(`Failed to start side selection: ${error.message}`)
      }

      console.log('✅ Side selection started')
      return data
    } catch (error) {
      console.error('Start side selection error:', error)
      throw error
    }
  },

  // Submit side vote
  async submitSideVote(roomId: string, side: 'pro' | 'con'): Promise<Room | null> {
    try {
      let userId = await this.getUserId()
      if (!userId) {
        userId = this.getSessionId()
      }

      // Get current room to determine player role
      const { data: room, error: fetchError } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single()

      if (fetchError || !room) {
        throw new Error('Room not found')
      }

      let updateData: any = {}
      
      if (room.player_a_id === userId) {
        updateData.player_a_side_vote = side
        console.log('Player A voted for:', side)
      } else if (room.player_b_id === userId) {
        updateData.player_b_side_vote = side
        console.log('Player B voted for:', side)
      } else {
        throw new Error('You are not in this room')
      }

      // Update the room with the vote
      const { data, error: updateError } = await supabase
        .from('rooms')
        .update(updateData)
        .eq('id', roomId)
        .select()
        .single()

      if (updateError) {
        console.error('Error submitting vote:', updateError)
        throw new Error(`Failed to submit vote: ${updateError.message}`)
      }

      return data
    } catch (error) {
      console.error('Submit side vote error:', error)
      throw error
    }
  },

  // Calculate final side assignments after voting period
  async finalizeSideSelection(roomId: string): Promise<Room | null> {
    try {
      const { data: room, error: fetchError } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single()

      if (fetchError || !room) {
        throw new Error('Room not found')
      }

      let playerASide: 'pro' | 'con'
      let playerBSide: 'pro' | 'con'

      // Apply your logic for side assignment
      if (room.player_a_side_vote && room.player_b_side_vote) {
        if (room.player_a_side_vote === room.player_b_side_vote) {
          // Both chose same side - random assignment
          if (Math.random() > 0.5) {
            playerASide = 'pro'
            playerBSide = 'con'
          } else {
            playerASide = 'con'
            playerBSide = 'pro'
          }
        } else {
          // Different sides - honor their choices
          playerASide = room.player_a_side_vote
          playerBSide = room.player_b_side_vote
        }
      } else if (room.player_a_side_vote && !room.player_b_side_vote) {
        // Only A voted - A gets choice, B gets opposite
        playerASide = room.player_a_side_vote
        playerBSide = room.player_a_side_vote === 'pro' ? 'con' : 'pro'
      } else if (!room.player_a_side_vote && room.player_b_side_vote) {
        // Only B voted - B gets choice, A gets opposite
        playerBSide = room.player_b_side_vote
        playerASide = room.player_b_side_vote === 'pro' ? 'con' : 'pro'
      } else {
        // Nobody voted - random assignment
        if (Math.random() > 0.5) {
          playerASide = 'pro'
          playerBSide = 'con'
        } else {
          playerASide = 'con'
          playerBSide = 'pro'
        }
      }

      console.log('Final side assignments:', { playerASide, playerBSide })

      // Update room with final assignments and move to opening prep phase
      const { data, error: updateError } = await supabase
        .from('rooms')
        .update({
          player_a_side: playerASide,
          player_b_side: playerBSide,
          current_phase: 'opening_prep',
          phase_start_time: new Date().toISOString(),
          phase_duration: 30 // 30 seconds for opening prep
        })
        .eq('id', roomId)
        .select()
        .single()

      if (updateError) {
        console.error('Error finalizing side selection:', updateError)
        throw new Error(`Failed to finalize sides: ${updateError.message}`)
      }

      return data
    } catch (error) {
      console.error('Finalize side selection error:', error)
      throw error
    }
  },

  // Ready up for the game
  async readyUp(roomId: string): Promise<Room | null> {
    try {
      let userId = await this.getUserId()
      if (!userId) {
        userId = this.getSessionId()
      }
      
      console.log('Ready up with user ID:', userId)
      
      // Get current room state
      const { data: room, error: fetchError } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single()

      if (fetchError || !room) {
        console.error('Error fetching room for ready up:', fetchError)
        throw new Error('Room not found')
      }

      console.log('Current room for ready up:', {
        player_a_id: room.player_a_id,
        player_b_id: room.player_b_id,
        player_a_ready: room.player_a_ready,
        player_b_ready: room.player_b_ready
      })

      // Determine which player is ready-ing up
      let updateData: any = {}
      
      if (room.player_a_id === userId) {
        updateData.player_a_ready = true
        console.log('Player A readying up')
      } else if (room.player_b_id === userId) {
        updateData.player_b_ready = true
        console.log('Player B readying up')
      } else {
        console.error('User not found in room')
        console.error('Room player A ID:', room.player_a_id)
        console.error('Room player B ID:', room.player_b_id)
        console.error('Current user ID:', userId)
        throw new Error('You are not in this room')
      }

      // Check if both players will be ready after this update
      const bothReady = (room.player_a_id === userId ? true : room.player_a_ready) && 
                       (room.player_b_id === userId ? true : room.player_b_ready)

      console.log('Both players ready after update:', bothReady)

      // If both players are ready and present, start side selection
      if (bothReady && room.player_a_id && room.player_b_id) {
        // Start side selection phase instead of going straight to debating
        const deadline = new Date(Date.now() + 10000) // 10 seconds from now
        updateData.status = 'side_selection'
        updateData.current_phase = 'side_selection'
        updateData.side_selection_deadline = deadline.toISOString()
        updateData.phase_start_time = new Date().toISOString()
        updateData.phase_duration = 10
        console.log('Starting side selection phase')
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
        throw new Error(`Failed to ready up: ${updateError.message}`)
      }

      console.log('Successfully readied up')
      return data
    } catch (error) {
      console.error('Ready up error:', error)
      throw error
    }
  },

  // Unready
  async unready(roomId: string): Promise<Room | null> {
    try {
      let userId = await this.getUserId()
      if (!userId) {
        userId = this.getSessionId()
      }
      
      const { data: room, error: fetchError } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single()

      if (fetchError || !room) {
        throw new Error('Room not found')
      }

      let updateData: any = {}
      
      if (room.player_a_id === userId) {
        updateData.player_a_ready = false
      } else if (room.player_b_id === userId) {
        updateData.player_b_ready = false
      } else {
        throw new Error('You are not in this room')
      }

      // Reset to waiting status
      updateData.status = 'waiting'
      updateData.current_phase = null

      const { data, error: updateError } = await supabase
        .from('rooms')
        .update(updateData)
        .eq('id', roomId)
        .select()
        .single()

      if (updateError) {
        console.error('Error unreadying:', updateError)
        throw new Error(`Failed to unready: ${updateError.message}`)
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
      let userId = await this.getUserId()
      if (!userId) {
        userId = this.getSessionId()
      }
      
      const { data: room, error: fetchError } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single()

      if (fetchError || !room) {
        throw new Error('Room not found')
      }

      let updateData: any = {}
      
      if (room.player_a_id === userId) {
        updateData.player_a_id = null
        updateData.player_a_ready = false
        updateData.player_a_side_vote = null
        updateData.player_a_side = null
      } else if (room.player_b_id === userId) {
        updateData.player_b_id = null
        updateData.player_b_ready = false
        updateData.player_b_side_vote = null
        updateData.player_b_side = null
      } else {
        throw new Error('You are not in this room')
      }

      // Reset room status to waiting
      updateData.status = 'waiting'
      updateData.current_phase = null

      const { error: updateError } = await supabase
        .from('rooms')
        .update(updateData)
        .eq('id', roomId)

      if (updateError) {
        console.error('Error leaving room:', updateError)
        throw new Error(`Failed to leave room: ${updateError.message}`)
      }

      return true
    } catch (error) {
      console.error('Leave room error:', error)
      throw error
    }
  },

  // Get room details
  async getRoom(roomId: string): Promise<Room | null> {
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single()

      if (error) {
        console.error('Error fetching room:', error)
        if (error.code === 'PGRST116') {
          return null // Room not found
        }
        throw error
      }

      return data
    } catch (error) {
      console.error('Get room error:', error)
      return null
    }
  },

  // Start opening prep phase
  async startOpeningPrep(roomId: string): Promise<Room | null> {
    try {
      console.log('🎯 Starting opening prep phase for room:', roomId)
      
      const { data, error } = await supabase
        .from('rooms')
        .update({ 
          current_phase: 'opening_prep',
          phase_start_time: new Date().toISOString(),
          phase_duration: 30 // 30 seconds for prep
        })
        .eq('id', roomId)
        .select()
        .single()

      if (error) {
        console.error('Error starting opening prep:', error)
        throw new Error(`Failed to start opening prep: ${error.message}`)
      }

      console.log('✅ Opening prep started successfully:', data)
      return data
    } catch (error) {
      console.error('Start opening prep error:', error)
      throw error
    }
  },

  // Start opening statements phase
  async startOpeningStatements(roomId: string): Promise<Room | null> {
    try {
      console.log('🎯 Starting opening statements for room:', roomId)
      
      const { data, error } = await supabase
        .from('rooms')
        .update({ 
          current_phase: 'opening',
          phase_start_time: new Date().toISOString(),
          phase_duration: 70 // 30s + 10s transition + 30s
        })
        .eq('id', roomId)
        .select()
        .single()

      if (error) {
        console.error('Error starting opening statements:', error)
        throw new Error(`Failed to start opening statements: ${error.message}`)
      }

      console.log('✅ Opening statements started successfully:', data)
      return data
    } catch (error) {
      console.error('Start opening statements error:', error)
      throw error
    }
  },
  async startGameWithSideSelection(roomId: string): Promise<Room | null> {
    try {
      console.log('🎯 Starting game with side selection for room:', roomId)
      
      const deadline = new Date(Date.now() + 10000) // 10 seconds from now
      
      const { data, error } = await supabase
        .from('rooms')
        .update({ 
          status: 'debating',
          current_phase: 'side_selection', // Start with side selection
          side_selection_deadline: deadline.toISOString(),
          phase_start_time: new Date().toISOString(),
          phase_duration: 10 // 10 seconds for side selection
        })
        .eq('id', roomId)
        .select()
        .single()

      if (error) {
        console.error('Error starting game with side selection:', error)
        throw new Error(`Failed to start game: ${error.message}`)
      }

      console.log('✅ Game started with side selection successfully:', data)
      return data
    } catch (error) {
      console.error('Start game with side selection error:', error)
      throw error
    }
  },

  // Enhanced subscription with better error handling
  subscribeToRoom(roomId: string, callback: (room: Room) => void) {
    console.log('Setting up subscription for room:', roomId)
    
    const channel = supabase
      .channel(`room:${roomId}:${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rooms',
          filter: `id=eq.${roomId}`,
        },
        (payload: any) => {
          console.log('🔄 Real-time update received:', {
            event: payload.eventType,
            new: payload.new ? {
              id: payload.new.id,
              player_a_id: payload.new.player_a_id ? payload.new.player_a_id.slice(-8) : null,
              player_b_id: payload.new.player_b_id ? payload.new.player_b_id.slice(-8) : null,
              status: payload.new.status,
              current_phase: payload.new.current_phase
            } : null
          })
          
          if (payload.new) {
            callback(payload.new as Room)
          }
        }
      )
      .subscribe((status: string, error?: Error) => {
        console.log('Subscription status:', status)
        if (error) {
          console.error('Subscription error:', error)
        }
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to room updates')
        }
      })

    return channel
  }
}