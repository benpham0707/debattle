// src/lib/roleManager.ts - SIMPLE VERSION

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
  
  static getInstance(): RoleManager {
    if (!RoleManager.instance) {
      RoleManager.instance = new RoleManager()
    }
    return RoleManager.instance
  }

  // SIMPLE: Just get a session ID - generate once per page load
  getSessionId(): string {
    if (this.currentSession) {
      return this.currentSession.sessionId
    }
    
    // Generate a new one for this tab/page load
    return generateUUID()
  }

  // SIMPLE: Set role directly when we know what it should be
  setRole(roomId: string, room: any, playerRole: 'player_a' | 'player_b' | 'spectator'): PlayerSession {
    const sessionId = this.getSessionId()
    
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

  // SIMPLE: Get role for a room
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

  // SIMPLE: Clear role
  clearRole(roomId: string): void {
    const sessionKey = `debattle_role_${roomId}`
    localStorage.removeItem(sessionKey)
    
    if (this.currentSession && this.currentSession.roomId === roomId) {
      this.currentSession = null
    }
  }

  // SIMPLE: Lock role
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
      currentSession: this.currentSession,
      roomId: roomId.slice(-8),
      storedSessions: Object.keys(localStorage).filter(k => k.includes('debattle'))
    })
  }
}

export const roleManager = RoleManager.getInstance()

// Simple hook
export function usePlayerRole(roomId: string, room: any) {
  const [session, setSession] = React.useState<PlayerSession | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    if (!room) return

    // Just get the existing role or set as spectator
    let playerSession = roleManager.getRole(roomId)
    
    if (!playerSession) {
      // Determine role based on room data
      let role: 'player_a' | 'player_b' | 'spectator' = 'spectator'
      const sessionId = roleManager.getSessionId()
      
      if (room.player_a_id === sessionId) {
        role = 'player_a'
      } else if (room.player_b_id === sessionId) {
        role = 'player_b'
      }
      
      playerSession = roleManager.setRole(roomId, room, role)
    }
    
    setSession(playerSession)
    setIsLoading(false)
  }, [roomId, room?.id])

  return { session, isLoading }
}