'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Room } from '@/lib/supabase'
import { roomService } from '@/lib/roomService'
import SideSelection from '../../../components/SideSelection'

export default function GamePage() {
  const params = useParams()
  const router = useRouter()
  const [room, setRoom] = useState<Room | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [playerRole, setPlayerRole] = useState<'player_a' | 'player_b' | 'spectator'>('spectator')
  const [sessionId, setSessionId] = useState<string | null>(null)

  // Use a ref to store the stable player role
  const stablePlayerRole = useRef<'player_a' | 'player_b' | 'spectator'>('spectator')
  const hasJoinedAsPlayer = useRef(false)

  useEffect(() => {
    const roomId = params.id as string
    
    // Get session ID - consistent for this browser session
    const getSessionId = () => {
      let id = localStorage.getItem(`debattle_session_${roomId}`)
      if (!id) {
        id = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        localStorage.setItem(`debattle_session_${roomId}`, id)
      }
      return id
    }
    
    // Get current user ID and session
    const getCurrentUser = async () => {
      const userId = await roomService.getUserId()
      const sessionId = getSessionId()
      setSessionId(sessionId)
      
      console.log('🔑 User identification:', { userId, sessionId })
    }
    getCurrentUser()
    
    // Fetch room data
    const fetchRoom = async () => {
      try {
        const roomData = await roomService.getRoom(roomId)
        if (roomData) {
          // Check if game is actually started
          if (roomData.status !== 'debating') {
            console.log('Game not started, redirecting to room...')
            router.push(`/room/${roomId}`)
            return
          }
          setRoom(roomData)
          
          // Only determine role on initial load
          if (!hasJoinedAsPlayer.current) {
            await determineInitialPlayerRole(roomData)
          }
        } else {
          setError('Room not found')
        }
      } catch (err) {
        console.error('Error fetching room:', err)
        setError('Failed to load game')
      } finally {
        setLoading(false)
      }
    }

    fetchRoom()

    // Subscribe to room updates for real-time game state
    const subscription = roomService.subscribeToRoom(roomId, (updatedRoom) => {
      console.log('🎮 Game room updated:', updatedRoom)
      setRoom(updatedRoom)
      
      // If game ends, redirect back to room
      if (updatedRoom.status === 'finished') {
        router.push(`/room/${roomId}`)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [params.id, router])

  const determineInitialPlayerRole = async (roomData: Room) => {
    const roomId = params.id as string
    const sessionKey = `debattle_session_${roomId}`
    const storedSessionId = localStorage.getItem(sessionKey)
    
    // Check localStorage for existing role assignments
    const playerASession = localStorage.getItem(`${sessionKey}_player_a`)
    const playerBSession = localStorage.getItem(`${sessionKey}_player_b`)
    
    console.log('🎭 Determining initial role:', {
      storedSessionId,
      playerASession,
      playerBSession,
      roomPlayerA: roomData.player_a_id,
      roomPlayerB: roomData.player_b_id
    })
    
    let determinedRole: 'player_a' | 'player_b' | 'spectator' = 'spectator'
    
    // Check if this session matches an existing player assignment
    if (playerASession === storedSessionId && roomData.player_a_id) {
      determinedRole = 'player_a'
      console.log('✅ Identified as Player A from localStorage')
    } else if (playerBSession === storedSessionId && roomData.player_b_id) {
      determinedRole = 'player_b'
      console.log('✅ Identified as Player B from localStorage')
    } else {
      // Check if we can match by user ID
      const userId = await roomService.getUserId()
      const effectiveUserId = userId || storedSessionId
      
      console.log('🔍 Checking user ID match:', { effectiveUserId, roomPlayerA: roomData.player_a_id, roomPlayerB: roomData.player_b_id })
      
      if (roomData.player_a_id === effectiveUserId) {
        determinedRole = 'player_a'
        // Update localStorage to maintain consistency
        localStorage.setItem(`${sessionKey}_player_a`, storedSessionId!)
        console.log('✅ Matched as Player A by user ID')
      } else if (roomData.player_b_id === effectiveUserId) {
        determinedRole = 'player_b'
        // Update localStorage to maintain consistency
        localStorage.setItem(`${sessionKey}_player_b`, storedSessionId!)
        console.log('✅ Matched as Player B by user ID')
      } else {
        console.log('👀 No match found - remaining as spectator')
      }
    }
    
    // Set the role and mark it as stable
    stablePlayerRole.current = determinedRole
    setPlayerRole(determinedRole)
    hasJoinedAsPlayer.current = determinedRole !== 'spectator'
    
    console.log('🎯 Final determined role:', determinedRole)
  }

  // Handle side selection
  const handleSideSelected = async (side: 'pro' | 'con') => {
    if (!room) return
    
    try {
      await roomService.submitSideVote(room.id, side)
      console.log('✅ Side vote submitted:', side)
    } catch (err) {
      console.error('Error submitting side vote:', err)
      setError(err instanceof Error ? err.message : 'Failed to submit vote')
    }
  }

  const handleSideSelectionComplete = async (playerASide: 'pro' | 'con', playerBSide: 'pro' | 'con') => {
    console.log('🎯 Side selection complete:', { playerASide, playerBSide })
    // The room will automatically update via subscription when sides are finalized
    // After side selection, we can transition to the first debate phase
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading game...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-red-500">{error}</div>
      </div>
    )
  }

  if (!room) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-red-500">Game not found</div>
      </div>
    )
  }

  // Show side selection component when in side_selection phase
  if (room.current_phase === 'side_selection' && stablePlayerRole.current !== 'spectator') {
    return (
      <SideSelection
        topic={room.topic}
        roomId={room.id}
        playerRole={stablePlayerRole.current}
        onSideSelected={handleSideSelected}
        onPhaseComplete={handleSideSelectionComplete}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 p-4 border-b border-gray-700">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">🧠 DeBATTLE</h1>
          <div className="text-sm text-gray-400">
            Room: {params.id?.toString().slice(-8)}
          </div>
        </div>
      </div>

      {/* Game Content */}
      <div className="max-w-6xl mx-auto p-6">
        {/* Debug Info */}
        <div className="bg-gray-900 border border-gray-700 rounded p-2 mb-4 text-xs font-mono">
          <div>🎭 Role: {stablePlayerRole.current}</div>
          <div>🔑 Session: {sessionId?.slice(-8)}</div>
          <div>👤 A: {room.player_a_id?.slice(-8) || 'none'} | B: {room.player_b_id?.slice(-8) || 'none'}</div>
          <div>🎮 Status: {room.status} | Phase: {room.current_phase || 'none'}</div>
          {room.player_a_side && room.player_b_side && (
            <div>🎯 Sides: A={room.player_a_side} | B={room.player_b_side}</div>
          )}
        </div>

        {/* Topic Display */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6 text-center">
          <h2 className="text-2xl font-bold mb-2">Debate Topic</h2>
          <p className="text-xl text-blue-300">{room.topic}</p>
          <div className="mt-4 text-sm text-gray-400">
            Current Phase: <span className="capitalize font-semibold text-white">{room.current_phase || 'Loading'}</span>
          </div>
        </div>

        {/* Side Assignments (if completed) */}
        {room.player_a_side && room.player_b_side && (
          <div className="bg-blue-600 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-center mb-4">🎯 Debate Sides</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className={`p-4 rounded-lg text-center ${
                room.player_a_side === 'pro' ? 'bg-green-700' : 'bg-red-700'
              }`}>
                <h3 className="font-semibold mb-2">
                  Player A {stablePlayerRole.current === 'player_a' ? '(You)' : ''}
                </h3>
                <div className="text-2xl mb-2">
                  {room.player_a_side === 'pro' ? '✅' : '❌'}
                </div>
                <div className="font-bold">
                  {room.player_a_side.toUpperCase()}
                </div>
              </div>
              <div className={`p-4 rounded-lg text-center ${
                room.player_b_side === 'pro' ? 'bg-green-700' : 'bg-red-700'
              }`}>
                <h3 className="font-semibold mb-2">
                  Player B {stablePlayerRole.current === 'player_b' ? '(You)' : ''}
                </h3>
                <div className="text-2xl mb-2">
                  {room.player_b_side === 'pro' ? '✅' : '❌'}
                </div>
                <div className="font-bold">
                  {room.player_b_side.toUpperCase()}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Players Health Bar */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className={`rounded-lg p-4 ${
            stablePlayerRole.current === 'player_a' 
              ? 'bg-blue-700 border-2 border-blue-400' 
              : 'bg-blue-700'
          }`}>
            <h3 className="font-semibold mb-2">
              Player A {stablePlayerRole.current === 'player_a' ? '(You)' : ''}
            </h3>
            <div className="mb-2">
              <div className="flex justify-between text-sm">
                <span>Health</span>
                <span>{room.player_a_health}/100</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-3">
                <div 
                  className="bg-blue-400 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${room.player_a_health}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className={`rounded-lg p-4 ${
            stablePlayerRole.current === 'player_b' 
              ? 'bg-green-700 border-2 border-green-400' 
              : 'bg-green-700'
          }`}>
            <h3 className="font-semibold mb-2">
              Player B {stablePlayerRole.current === 'player_b' ? '(You)' : ''}
            </h3>
            <div className="mb-2">
              <div className="flex justify-between text-sm">
                <span>Health</span>
                <span>{room.player_b_health}/100</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-3">
                <div 
                  className="bg-green-400 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${room.player_b_health}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Game Interface */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">🎮 Debate Arena</h3>
          
          {room.current_phase === 'side_selection' ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">⏰</div>
              <h4 className="text-xl font-bold mb-2">Side Selection in Progress</h4>
              <p className="text-gray-400">Players are choosing their debate sides...</p>
            </div>
          ) : room.player_a_side && room.player_b_side ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🔥</div>
              <h4 className="text-2xl font-bold mb-2">Debate Ready!</h4>
              <p className="text-gray-400 mb-4">
                The debate interface will be implemented here
              </p>
              <div className="space-y-2 text-sm text-gray-500">
                <p>• Real-time chat system</p>
                <p>• Phase-based timers</p>
                <p>• AI judging integration</p>
                <p>• Turn-based argument system</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">⏳</div>
              <h4 className="text-xl font-bold mb-2">Waiting for Setup</h4>
              <p className="text-gray-400">Setting up the debate...</p>
            </div>
          )}
        </div>

        {/* Back to Room Button (for testing) */}
        <div className="text-center">
          <button
            onClick={() => router.push(`/room/${params.id}`)}
            className="btn-secondary"
          >
            ← Back to Room (for testing)
          </button>
        </div>
      </div>
    </div>
  )
}