// src/lib/roleManager.ts
// Bulletproof role management system that maintains player roles throughout the entire game session

import React from 'react'

export interface PlayerSession {
  sessionId: string
  playerRole: 'player_a' | 'player_b' | 'spectator'
  roomId: string
  assignedAt: number // timestamp when role was assigned
  isLocked: boolean // prevents role changes once game starts
}

// Helper function to generate a proper UUID v4
function generateUUID(): string {
  // Use crypto.randomUUID if available (modern browsers)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  
  // Fallback to manual generation (proper UUID v4 format)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

// Single source of truth for role management
class RoleManager {
  private static instance: RoleManager
  private currentSession: PlayerSession | null = null
  
  static getInstance(): RoleManager {
    if (!RoleManager.instance) {
      RoleManager.instance = new RoleManager()
    }
    return RoleManager.instance
  }

  // Generate a consistent session ID for this browser (proper UUID format)
  private generateSessionId(): string {
    // First check if we already have a global session ID
    let globalSessionId = localStorage.getItem('debattle_global_session')
    if (!globalSessionId) {
      globalSessionId = generateUUID() // Use proper UUID instead of custom format
      localStorage.setItem('debattle_global_session', globalSessionId)
      console.log('🆕 Generated new global session UUID:', globalSessionId.slice(-8))
    }
    return globalSessionId
  }

  // Initialize or retrieve role for a specific room
  async initializeRole(roomId: string, room: any): Promise<PlayerSession> {
    const sessionKey = `debattle_role_${roomId}`
    
    // First, check if we already have a locked role for this room
    const existingSession = localStorage.getItem(sessionKey)
    if (existingSession) {
      try {
        const parsed: PlayerSession = JSON.parse(existingSession)
        
        // Validate that the session is still valid
        if (this.validateSession(parsed, room)) {
          console.log('✅ ROLE MANAGER - Restored existing valid session:', {
            role: parsed.playerRole,
            sessionId: parsed.sessionId.slice(-8),
            isLocked: parsed.isLocked
          })
          this.currentSession = parsed
          return parsed
        } else {
          console.log('❌ ROLE MANAGER - Existing session invalid, will create new one')
          localStorage.removeItem(sessionKey)
        }
      } catch (error) {
        console.error('❌ ROLE MANAGER - Error parsing existing session:', error)
        localStorage.removeItem(sessionKey)
      }
    }

    // Create new session if none exists or existing is invalid
    const sessionId = this.generateSessionId()
    const playerRole = await this.determineRoleFromRoom(room, sessionId)
    
    const newSession: PlayerSession = {
      sessionId,
      playerRole,
      roomId,
      assignedAt: Date.now(),
      isLocked: room.status === 'debating' // Lock role once game starts
    }

    // Save the session
    localStorage.setItem(sessionKey, JSON.stringify(newSession))
    this.currentSession = newSession

    console.log('🎭 ROLE MANAGER - Created new session:', {
      role: newSession.playerRole,
      sessionId: newSession.sessionId.slice(-8),
      isLocked: newSession.isLocked,
      roomStatus: room.status
    })

    return newSession
  }

  // Validate that a session is still valid for the current room state
  private validateSession(session: PlayerSession, room: any): boolean {
    // Check if room still exists and session ID matches expected player
    if (session.playerRole === 'player_a') {
      return room.player_a_id === session.sessionId
    } else if (session.playerRole === 'player_b') {
      return room.player_b_id === session.sessionId
    } else {
      return session.playerRole === 'spectator' // Spectators are always valid
    }
  }

  // Determine role based on room state and session ID
  private async determineRoleFromRoom(room: any, sessionId: string): Promise<'player_a' | 'player_b' | 'spectator'> {
    console.log('🔍 ROLE MANAGER - Determining role from room:', {
      sessionId: sessionId.slice(-8),
      roomPlayerA: room.player_a_id?.slice(-8),
      roomPlayerB: room.player_b_id?.slice(-8)
    })

    // Check direct ID matches first
    if (room.player_a_id === sessionId) {
      console.log('✅ ROLE MANAGER - Matched as Player A by ID')
      return 'player_a'
    }
    
    if (room.player_b_id === sessionId) {
      console.log('✅ ROLE MANAGER - Matched as Player B by ID')
      return 'player_b'
    }

    // If no match found, user is a spectator
    console.log('👀 ROLE MANAGER - No match found, assigned as spectator')
    return 'spectator'
  }

  // Get current session (used by components)
  getCurrentSession(): PlayerSession | null {
    return this.currentSession
  }

  // Lock the role once game starts (prevents changes during game)
  lockRole(roomId: string): void {
    if (this.currentSession && this.currentSession.roomId === roomId) {
      this.currentSession.isLocked = true
      const sessionKey = `debattle_role_${roomId}`
      localStorage.setItem(sessionKey, JSON.stringify(this.currentSession))
      console.log('🔒 ROLE MANAGER - Role locked for game session')
    }
  }

  // Clear role when leaving room
  clearRole(roomId: string): void {
    const sessionKey = `debattle_role_${roomId}`
    localStorage.removeItem(sessionKey)
    
    if (this.currentSession && this.currentSession.roomId === roomId) {
      this.currentSession = null
    }
    
    console.log('🧹 ROLE MANAGER - Cleared role for room:', roomId.slice(-8))
  }

  // Get session ID for room service compatibility (ensures proper UUID format)
  getSessionId(): string {
    if (this.currentSession) {
      return this.currentSession.sessionId
    }
    return this.generateSessionId()
  }

  // Debug helper
  debugSession(roomId: string): void {
    const sessionKey = `debattle_role_${roomId}`
    const stored = localStorage.getItem(sessionKey)
    
    console.log('🔍 ROLE MANAGER DEBUG:', {
      currentSession: this.currentSession,
      storedSession: stored ? JSON.parse(stored) : null,
      allDebattleKeys: Object.keys(localStorage).filter(k => k.includes('debattle'))
    })
  }
}

export const roleManager = RoleManager.getInstance()

// Helper hook for React components
export function usePlayerRole(roomId: string, room: any) {
  const [session, setSession] = React.useState<PlayerSession | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    if (!room) return

    const initRole = async () => {
      try {
        const playerSession = await roleManager.initializeRole(roomId, room)
        setSession(playerSession)
        
        // Lock role if game is in progress
        if (room.status === 'debating' && !playerSession.isLocked) {
          roleManager.lockRole(roomId)
        }
      } catch (error) {
        console.error('Error initializing role:', error)
      } finally {
        setIsLoading(false)
      }
    }

    initRole()
  }, [roomId, room?.id]) // Only re-run if roomId or room.id changes

  return { session, isLoading }
}

// Compatibility functions for existing code
export function getStablePlayerRole(roomId: string): 'player_a' | 'player_b' | 'spectator' {
  const session = roleManager.getCurrentSession()
  if (session && session.roomId === roomId) {
    return session.playerRole
  }
  return 'spectator'
}

export function getStableSessionId(): string {
  return roleManager.getSessionId()
}