// src/lib/roleManager.ts - FIXED VERSION

import React from 'react'

export interface PlayerSession {
  sessionId: string
  playerRole: 'player_a' | 'player_b' | 'spectator'
  roomId: string
  assignedAt: number
  isLocked: boolean
}

// Helper function to generate a proper UUID v4
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

class RoleManager {
  private static instance: RoleManager
  private currentSession: PlayerSession | null = null
  private globalSessionId: string | null = null // Store globally
  
  static getInstance(): RoleManager {
    if (!RoleManager.instance) {
      RoleManager.instance = new RoleManager()
    }
    return RoleManager.instance
  }

  // FIXED: Consistent session ID generation/retrieval
  getSessionId(): string {
    // If we already have a global session ID, use it
    if (this.globalSessionId) {
      console.log('🔑 Using existing global session ID:', this.globalSessionId.slice(-8))
      return this.globalSessionId
    }
    
    // Check if we have one stored in localStorage
    const stored = localStorage.getItem('debattle_global_session_id')
    if (stored) {
      console.log('🔑 Retrieved session ID from localStorage:', stored.slice(-8))
      this.globalSessionId = stored
      return stored
    }
    
    // Generate a new one and store it
    const newId = generateUUID()
    console.log('🔑 Generated new global session ID:', newId.slice(-8))
    this.globalSessionId = newId
    localStorage.setItem('debattle_global_session_id', newId)
    
    return newId
  }

  // Set role directly when we know what it should be
  setRole(roomId: string, room: any, playerRole: 'player_a' | 'player_b' | 'spectator'): PlayerSession {
    const sessionId = this.getSessionId() // Use consistent session ID
    
    console.log('🎭 ROLE MANAGER - Setting role directly:', {
      role: playerRole,
      sessionId: sessionId.slice(-8),
      roomId: roomId.slice(-8)
    })

    const session: PlayerSession = {
      sessionId,
      playerRole,
      roomId,
      assignedAt: Date.now(),
      isLocked: room.status === 'debating'
    }

    // Save it
    const sessionKey = `debattle_role_${roomId}`
    localStorage.setItem(sessionKey, JSON.stringify(session))
    this.currentSession = session

    return session
  }

  // Get role for a room
  getRole(roomId: string): PlayerSession | null {
    // First check memory
    if (this.currentSession && this.currentSession.roomId === roomId) {
      return this.currentSession
    }

    // Then check localStorage
    const sessionKey = `debattle_role_${roomId}`
    const stored = localStorage.getItem(sessionKey)
    if (stored) {
      try {
        const session = JSON.parse(stored)
        this.currentSession = session
        return session
      } catch (error) {
        console.error('Error parsing stored session:', error)
        localStorage.removeItem(sessionKey)
      }
    }

    return null
  }

  // Clear role
  clearRole(roomId: string): void {
    const sessionKey = `debattle_role_${roomId}`
    localStorage.removeItem(sessionKey)
    
    if (this.currentSession && this.currentSession.roomId === roomId) {
      this.currentSession = null
    }
  }

  // Lock role
  lockRole(roomId: string): void {
    if (this.currentSession && this.currentSession.roomId === roomId) {
      this.currentSession.isLocked = true
      const sessionKey = `debattle_role_${roomId}`
      localStorage.setItem(sessionKey, JSON.stringify(this.currentSession))
    }
  }

  getCurrentSession(): PlayerSession | null {
    return this.currentSession
  }

  debugSession(roomId: string): void {
    console.log('🔍 ROLE MANAGER DEBUG:', {
      globalSessionId: this.globalSessionId?.slice(-8),
      currentSession: this.currentSession,
      roomId: roomId.slice(-8),
      storedSessions: Object.keys(localStorage).filter(k => k.includes('debattle'))
    })
  }

  // Clear all stored data (for testing)
  clearAll(): void {
    this.globalSessionId = null
    this.currentSession = null
    localStorage.removeItem('debattle_global_session_id')
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('debattle_')) {
        localStorage.removeItem(key)
      }
    })
    console.log('🧹 Cleared all role manager data')
  }
}

export const roleManager = RoleManager.getInstance()

// Simple hook - FIXED to use consistent session matching
export function usePlayerRole(roomId: string, room: any) {
  const [session, setSession] = React.useState<PlayerSession | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    if (!room) return

    // Check if we already have a role for this room
    let playerSession = roleManager.getRole(roomId)
    
    if (!playerSession) {
      // Determine role based on room data using the SAME session ID
      let role: 'player_a' | 'player_b' | 'spectator' = 'spectator'
      const sessionId = roleManager.getSessionId() // This will be consistent now
      
      console.log('🎭 Role determination:', {
        sessionId: sessionId.slice(-8),
        roomPlayerA: room.player_a_id?.slice(-8),
        roomPlayerB: room.player_b_id?.slice(-8)
      })
      
      if (room.player_a_id === sessionId) {
        role = 'player_a'
        console.log('✅ Matched as Player A')
      } else if (room.player_b_id === sessionId) {
        role = 'player_b'
        console.log('✅ Matched as Player B')
      } else {
        console.log('👀 No match - spectator role')
      }
      
      playerSession = roleManager.setRole(roomId, room, role)
    }
    
    setSession(playerSession)
    setIsLoading(false)
  }, [roomId, room?.id, room?.status])

  return { session, isLoading }
}