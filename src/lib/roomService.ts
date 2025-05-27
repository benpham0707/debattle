import { supabase } from './supabase'
import { Room, Message } from './supabase'
import { roleManager } from './roleManager'

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

// Validate UUID format
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
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

  // Get session ID from role manager (ensures consistency)
  getSessionId(): string {
    return roleManager.getSessionId()
  },

  // Create a new room
  async createRoom(): Promise<{ room: Room; playerRole: 'player_a' | 'player_b' }> {
    let userId = await this.getUserId()
    
    console.log('🏗️ ROOM SERVICE - Creating room with user:', userId?.slice(-8))
    
    // If no authenticated user, use session UUID for guests
    if (!userId) {
      userId = this.getSessionId()
      console.log('🎯 ROOM SERVICE - Using session UUID for creator:', userId.slice(-8))
    }
    
    // CRITICAL: Validate UUID format before database insertion
    if (!isValidUUID(userId)) {
      console.error('❌ ROOM SERVICE - Invalid UUID format, generating new one:', userId)
      userId = generateUUID()
      console.log('✅ ROOM SERVICE - Generated new valid UUID:', userId.slice(-8))
    }
    
    const randomTopic = DEBATE_TOPICS[Math.floor(Math.random() * DEBATE_TOPICS.length)]

    const roomData = {
      topic: randomTopic,
      status: 'waiting' as const,
      player_a_health: 100,
      player_b_health: 100,
      player_a_ready: false,
      player_b_ready: false,
      player_a_id: userId,
    }
    
    console.log('🏗️ ROOM SERVICE - Room data to insert:', {
      ...roomData,
      player_a_id: roomData.player_a_id.slice(-8)
    })

    const { data, error } = await supabase
      .from('rooms')
      .insert([roomData])
      .select()
      .single()

    if (error) {
      console.error('❌ ROOM SERVICE - Error creating room:', error)
      throw new Error(`Failed to create room: ${error.message}`)
    }

    console.log('✅ ROOM SERVICE - Room created successfully')
    return { room: data, playerRole: 'player_a' }
  },

  // Join an existing room with proper error handling
  async joinRoom(roomId: string, userId?: string): Promise<{ room: Room; playerRole: 'player_a' | 'player_b' }> {
    try {
      // Use provided userId or get current user ID or use session ID
      let actualUserId = userId || await this.getUserId()
      if (!actualUserId) {
        actualUserId = this.getSessionId()
        console.log('🎯 ROOM SERVICE - Using session UUID for joiner:', actualUserId.slice(-8))
      }

      // CRITICAL: Validate UUID format before proceeding  
      if (!isValidUUID(actualUserId)) {
        console.error('❌ ROOM SERVICE - Invalid UUID format, generating new one:', actualUserId)
        actualUserId = generateUUID()
        console.log('✅ ROOM SERVICE - Generated new valid UUID:', actualUserId.slice(-8))
      }

      console.log('🚪 ROOM SERVICE - Join attempt:', {
        roomId: roomId.slice(-8),
        userId: actualUserId.slice(-8)
      })

      // First, check if the room exists and get its current state
      const { data: currentRoom, error: fetchError } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single()

      if (fetchError) {
        console.error('❌ ROOM SERVICE - Error fetching room:', fetchError)
        if (fetchError.code === 'PGRST116') {
          throw new Error('Room not found')
        }
        throw new Error(`Database error: ${fetchError.message}`)
      }

      if (!currentRoom) {
        throw new Error('Room not found')
      }

      console.log('🏠 ROOM SERVICE - Current room state:', {
        id: currentRoom.id.slice(-8),
        player_a_id: currentRoom.player_a_id?.slice(-8),
        player_b_id: currentRoom.player_b_id?.slice(-8),
        status: currentRoom.status
      })

      // Check if user is already in the room
      if (currentRoom.player_a_id === actualUserId) {
        console.log('✅ ROOM SERVICE - User already in room as Player A')
        return { room: currentRoom, playerRole: 'player_a' }
      }
      
      if (currentRoom.player_b_id === actualUserId) {
        console.log('✅ ROOM SERVICE - User already in room as Player B')
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
        console.log('🎭 ROOM SERVICE - Joining as Player A')
      } else {
        updateData = { 
          player_b_id: actualUserId,
          player_b_ready: false
        }
        playerRole = 'player_b'
        console.log('🎭 ROOM SERVICE - Joining as Player B')
      }

      // Update the room
      const { data: updatedRoom, error: updateError } = await supabase
        .from('rooms')
        .update(updateData)
        .eq('id', roomId)
        .select()
        .single()

      if (updateError) {
        console.error('❌ ROOM SERVICE - Error updating room:', updateError)
        throw new Error(`Failed to join room: ${updateError.message}`)
      }

      if (!updatedRoom) {
        throw new Error('Failed to update room - no data returned')
      }

      console.log('✅ ROOM SERVICE - Successfully joined as:', playerRole)
      return { room: updatedRoom, playerRole }

    } catch (error) {
      console.error('❌ ROOM SERVICE - Join room error:', error)
      throw error
    }
  },

  // Ready up for the game
  async readyUp(roomId: string): Promise<Room | null> {
    try {
      // Get user ID from role manager for consistency
      let userId = await this.getUserId()
      if (!userId) {
        userId = this.getSessionId()
      }
      
      // Validate UUID format
      if (!isValidUUID(userId)) {
        console.error('❌ ROOM SERVICE - Invalid UUID format in readyUp:', userId)
        userId = generateUUID()
        console.log('✅ ROOM SERVICE - Generated new valid UUID for readyUp:', userId.slice(-8))
      }
      
      console.log('🚀 ROOM SERVICE - Ready up with user:', userId.slice(-8))
      
      // Get current room state
      const { data: room, error: fetchError } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single()

      if (fetchError || !room) {
        console.error('❌ ROOM SERVICE - Error fetching room for ready up:', fetchError)
        throw new Error('Room not found')
      }

      // Determine which player is ready-ing up
      let updateData: any = {}
      
      if (room.player_a_id === userId) {
        updateData.player_a_ready = true
        console.log('🅰️ ROOM SERVICE - Player A readying up')
      } else if (room.player_b_id === userId) {
        updateData.player_b_ready = true
        console.log('🅱️ ROOM SERVICE - Player B readying up')
      } else {
        console.error('❌ ROOM SERVICE - User not found in room:', {
          userId: userId.slice(-8),
          roomPlayerA: room.player_a_id?.slice(-8),
          roomPlayerB: room.player_b_id?.slice(-8)
        })
        throw new Error('You are not in this room')
      }

      // Check if both players will be ready after this update
      const bothReady = (room.player_a_id === userId ? true : room.player_a_ready) && 
                       (room.player_b_id === userId ? true : room.player_b_ready)

      console.log('✅ ROOM SERVICE - Both players ready after update:', bothReady)

      // If both players are ready and present, start side selection
      if (bothReady && room.player_a_id && room.player_b_id) {
        // Start side selection phase instead of going straight to debating
        const deadline = new Date(Date.now() + 10000) // 10 seconds from now
        updateData.status = 'side_selection'
        updateData.current_phase = 'side_selection'
        updateData.side_selection_deadline = deadline.toISOString()
        updateData.phase_start_time = new Date().toISOString()
        updateData.phase_duration = 10
        console.log('🎯 ROOM SERVICE - Starting side selection phase')
      }

      // Update the room
      const { data, error: updateError } = await supabase
        .from('rooms')
        .update(updateData)
        .eq('id', roomId)
        .select()
        .single()

      if (updateError) {
        console.error('❌ ROOM SERVICE - Error readying up:', updateError)
        throw new Error(`Failed to ready up: ${updateError.message}`)
      }

      console.log('✅ ROOM SERVICE - Successfully readied up')
      return data
    } catch (error) {
      console.error('❌ ROOM SERVICE - Ready up error:', error)
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

      // Validate UUID format
      if (!isValidUUID(userId)) {
        console.error('❌ ROOM SERVICE - Invalid UUID format in submitSideVote:', userId)
        userId = generateUUID()
        console.log('✅ ROOM SERVICE - Generated new valid UUID for submitSideVote:', userId.slice(-8))
      }

      console.log('🗳️ ROOM SERVICE - Submitting vote:', {
        userId: userId.slice(-8),
        side,
        roomId: roomId.slice(-8)
      })

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
        console.log('🅰️ ROOM SERVICE - Player A voted for:', side)
      } else if (room.player_b_id === userId) {
        updateData.player_b_side_vote = side
        console.log('🅱️ ROOM SERVICE - Player B voted for:', side)
      } else {
        console.error('❌ ROOM SERVICE - User not in room for voting:', {
          userId: userId.slice(-8),
          roomPlayerA: room.player_a_id?.slice(-8),
          roomPlayerB: room.player_b_id?.slice(-8)
        })
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
        console.error('❌ ROOM SERVICE - Error submitting vote:', updateError)
        throw new Error(`Failed to submit vote: ${updateError.message}`)
      }

      console.log('✅ ROOM SERVICE - Vote submitted successfully')
      return data
    } catch (error) {
      console.error('❌ ROOM SERVICE - Submit side vote error:', error)
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

      console.log('🎯 ROOM SERVICE - Finalizing side selection:', {
        playerAVote: room.player_a_side_vote,
        playerBVote: room.player_b_side_vote
      })

      // Apply side assignment logic
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
          console.log('🎲 ROOM SERVICE - Random assignment (both chose same side)')
        } else {
          // Different sides - honor their choices
          playerASide = room.player_a_side_vote
          playerBSide = room.player_b_side_vote
          console.log('✅ ROOM SERVICE - Honored different choices')
        }
      } else if (room.player_a_side_vote && !room.player_b_side_vote) {
        // Only A voted - A gets choice, B gets opposite
        playerASide = room.player_a_side_vote
        playerBSide = room.player_a_side_vote === 'pro' ? 'con' : 'pro'
        console.log('🅰️ ROOM SERVICE - Only Player A voted')
      } else if (!room.player_a_side_vote && room.player_b_side_vote) {
        // Only B voted - B gets choice, A gets opposite
        playerBSide = room.player_b_side_vote
        playerASide = room.player_b_side_vote === 'pro' ? 'con' : 'pro'
        console.log('🅱️ ROOM SERVICE - Only Player B voted')
      } else {
        // Nobody voted - random assignment
        if (Math.random() > 0.5) {
          playerASide = 'pro'
          playerBSide = 'con'
        } else {
          playerASide = 'con'
          playerBSide = 'pro'
        }
        console.log('🎲 ROOM SERVICE - Random assignment (no votes)')
      }

      console.log('🎯 ROOM SERVICE - Final side assignments:', { playerASide, playerBSide })

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
        console.error('❌ ROOM SERVICE - Error finalizing side selection:', updateError)
        throw new Error(`Failed to finalize sides: ${updateError.message}`)
      }

      console.log('✅ ROOM SERVICE - Side selection finalized')
      return data
    } catch (error) {
      console.error('❌ ROOM SERVICE - Finalize side selection error:', error)
      throw error
    }
  },

  // Send a chat message during debate
  async sendMessage(
    roomId: string, 
    content: string, 
    phase: string, 
    playerSide: 'pro' | 'con',
    playerRole: 'player_a' | 'player_b'
  ): Promise<Message | null> {
    try {
      let userId = await this.getUserId()
      if (!userId) {
        userId = this.getSessionId()
      }

      // Validate UUID format
      if (!isValidUUID(userId)) {
        console.error('❌ ROOM SERVICE - Invalid UUID format in sendMessage:', userId)
        userId = generateUUID()
        console.log('✅ ROOM SERVICE - Generated new valid UUID for sendMessage:', userId.slice(-8))
      }

      console.log('💬 ROOM SERVICE - Sending message:', {
        roomId: roomId.slice(-8),
        userId: userId.slice(-8),
        phase,
        playerSide,
        contentLength: content.length
      })

      // Determine sender name based on role and side
      const senderName = `${playerRole === 'player_a' ? 'Player A' : 'Player B'} (${playerSide.toUpperCase()})`

      const messageData = {
        room_id: roomId,
        user_id: userId,
        sender_name: senderName,
        content: content,
        phase: phase as 'side_selection' | 'opening' | 'rebuttal' | 'crossfire' | 'final' | 'judging',
        player_side: playerSide
      }

      const { data, error } = await supabase
        .from('messages')
        .insert([messageData])
        .select()
        .single()

      if (error) {
        console.error('❌ ROOM SERVICE - Error sending message:', error)
        throw new Error(`Failed to send message: ${error.message}`)
      }

      console.log('✅ ROOM SERVICE - Message sent successfully')
      return data as Message
    } catch (error) {
      console.error('❌ ROOM SERVICE - Send message error:', error)
      throw error
    }
  },

  // Get all messages for a room
  async getMessages(roomId: string): Promise<Message[]> {
    try {
      console.log('📜 ROOM SERVICE - Loading messages for room:', roomId.slice(-8))

      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('❌ ROOM SERVICE - Error loading messages:', error)
        throw new Error(`Failed to load messages: ${error.message}`)
      }

      console.log('✅ ROOM SERVICE - Loaded messages:', data?.length || 0)
      return (data as Message[]) || []
    } catch (error) {
      console.error('❌ ROOM SERVICE - Get messages error:', error)
      return []
    }
  },

  // Subscribe to new messages in real-time
  subscribeToMessages(roomId: string, callback: (message: Message) => void) {
    console.log('📡 ROOM SERVICE - Setting up message subscription for room:', roomId.slice(-8))
    
    const channel = supabase
      .channel(`messages:${roomId}:${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload: any) => {
          console.log('💬 ROOM SERVICE - New message received:', {
            sender: payload.new?.sender_name,
            phase: payload.new?.phase,
            side: payload.new?.player_side,
            contentLength: payload.new?.content?.length
          })
          
          if (payload.new) {
            callback(payload.new as Message)
          }
        }
      )
      .subscribe((status: string, error?: Error) => {
        console.log('📡 ROOM SERVICE - Message subscription status:', status)
        if (error) {
          console.error('❌ ROOM SERVICE - Message subscription error:', error)
        }
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ ROOM SERVICE - Successfully subscribed to message updates')
        }
      })

    return channel
  },

  // Unready
  async unready(roomId: string): Promise<Room | null> {
    try {
      let userId = await this.getUserId()
      if (!userId) {
        userId = this.getSessionId()
      }
      
      // Validate UUID format
      if (!isValidUUID(userId)) {
        console.error('❌ ROOM SERVICE - Invalid UUID format in unready:', userId)
        userId = generateUUID()
        console.log('✅ ROOM SERVICE - Generated new valid UUID for unready:', userId.slice(-8))
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
        console.log('🅰️ ROOM SERVICE - Player A unreadying')
      } else if (room.player_b_id === userId) {
        updateData.player_b_ready = false
        console.log('🅱️ ROOM SERVICE - Player B unreadying')
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
        console.error('❌ ROOM SERVICE - Error unreadying:', updateError)
        throw new Error(`Failed to unready: ${updateError.message}`)
      }

      console.log('✅ ROOM SERVICE - Successfully unreadied')
      return data
    } catch (error) {
      console.error('❌ ROOM SERVICE - Unready error:', error)
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

      // Validate UUID format
      if (!isValidUUID(userId)) {
        console.error('❌ ROOM SERVICE - Invalid UUID format in leaveRoom:', userId)
        userId = generateUUID()
        console.log('✅ ROOM SERVICE - Generated new valid UUID for leaveRoom:', userId.slice(-8))
      }

      console.log('🚪 ROOM SERVICE - Leaving room:', {
        roomId: roomId.slice(-8),
        userId: userId.slice(-8)
      })
      
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
        console.log('🅰️ ROOM SERVICE - Player A leaving')
      } else if (room.player_b_id === userId) {
        updateData.player_b_id = null
        updateData.player_b_ready = false
        updateData.player_b_side_vote = null
        updateData.player_b_side = null
        console.log('🅱️ ROOM SERVICE - Player B leaving')
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
        console.error('❌ ROOM SERVICE - Error leaving room:', updateError)
        throw new Error(`Failed to leave room: ${updateError.message}`)
      }

      console.log('✅ ROOM SERVICE - Successfully left room')
      return true
    } catch (error) {
      console.error('❌ ROOM SERVICE - Leave room error:', error)
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
        if (error.code === 'PGRST116') {
          return null // Room not found
        }
        console.error('❌ ROOM SERVICE - Error fetching room:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('❌ ROOM SERVICE - Get room error:', error)
      return null
    }
  },

  // Start opening prep phase
  async startOpeningPrep(roomId: string): Promise<Room | null> {
    try {
      console.log('📝 ROOM SERVICE - Starting opening prep phase for room:', roomId.slice(-8))
      
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
        console.error('❌ ROOM SERVICE - Error starting opening prep:', error)
        throw new Error(`Failed to start opening prep: ${error.message}`)
      }

      console.log('✅ ROOM SERVICE - Opening prep started successfully')
      return data
    } catch (error) {
      console.error('❌ ROOM SERVICE - Start opening prep error:', error)
      throw error
    }
  },

  // Start opening statements phase
  async startOpeningStatements(roomId: string): Promise<Room | null> {
    try {
      console.log('🎤 ROOM SERVICE - Starting opening statements for room:', roomId.slice(-8))
      
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
        console.error('❌ ROOM SERVICE - Error starting opening statements:', error)
        throw new Error(`Failed to start opening statements: ${error.message}`)
      }

      console.log('✅ ROOM SERVICE - Opening statements started successfully')
      return data
    } catch (error) {
      console.error('❌ ROOM SERVICE - Start opening statements error:', error)
      throw error
    }
  },
  // Add this function to your roomService.ts

  // Start rebuttal phase
  async startRebuttalPhase(roomId: string): Promise<Room | null> {
    try {
      console.log('🔄 ROOM SERVICE - Starting rebuttal phase for room:', roomId.slice(-8))
      
      const { data, error } = await supabase
        .from('rooms')
        .update({ 
          current_phase: 'rebuttal',
          phase_start_time: new Date().toISOString(),
          phase_duration: 70 // 30s + 10s transition + 30s (same as opening)
        })
        .eq('id', roomId)
        .select()
        .single()

      if (error) {
        console.error('❌ ROOM SERVICE - Error starting rebuttal phase:', error)
        throw new Error(`Failed to start rebuttal phase: ${error.message}`)
      }

      console.log('✅ ROOM SERVICE - Rebuttal phase started successfully')
      return data
    } catch (error) {
      console.error('❌ ROOM SERVICE - Start rebuttal phase error:', error)
      throw error
    }
  }, 

  // Start game with side selection
  async startGameWithSideSelection(roomId: string): Promise<Room | null> {
    try {
      console.log('🎮 ROOM SERVICE - Starting game with side selection for room:', roomId.slice(-8))
      
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
        console.error('❌ ROOM SERVICE - Error starting game with side selection:', error)
        throw new Error(`Failed to start game: ${error.message}`)
      }

      console.log('✅ ROOM SERVICE - Game started with side selection successfully')
      return data
    } catch (error) {
      console.error('❌ ROOM SERVICE - Start game with side selection error:', error)
      throw error
    }
  },

  // Enhanced subscription with better error handling
  subscribeToRoom(roomId: string, callback: (room: Room) => void) {
    console.log('📡 ROOM SERVICE - Setting up subscription for room:', roomId.slice(-8))
    
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
          console.log('🔄 ROOM SERVICE - Real-time update received:', {
            event: payload.eventType,
            new: payload.new ? {
              id: payload.new.id.slice(-8),
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
        console.log('📡 ROOM SERVICE - Subscription status:', status)
        if (error) {
          console.error('❌ ROOM SERVICE - Subscription error:', error)
        }
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ ROOM SERVICE - Successfully subscribed to room updates')
        }
      })

    return channel
  }
}