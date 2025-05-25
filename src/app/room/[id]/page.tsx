'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Room } from '@/lib/supabase'
import { roomService } from '@/lib/roomService'

export default function RoomPage() {
  const params = useParams()
  const router = useRouter()
  const [room, setRoom] = useState<Room | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [playerRole, setPlayerRole] = useState<'player_a' | 'player_b' | 'spectator'>('spectator')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isReadyingUp, setIsReadyingUp] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)

  useEffect(() => {
    const roomId = params.id as string
    
    // Generate or get session ID for guest identification
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
      setCurrentUserId(userId)
      setSessionId(sessionId)
    }
    getCurrentUser()
    
    // Fetch initial room data
    const fetchRoom = async () => {
      const roomData = await roomService.getRoom(roomId)
      if (roomData) {
        setRoom(roomData)
        // Determine player role
        determinePlayerRole(roomData)
      } else {
        setError('Room not found')
      }
      setLoading(false)
    }

    fetchRoom()

    // Subscribe to room updates
    const subscription = roomService.subscribeToRoom(roomId, (updatedRoom) => {
      console.log('Room updated via subscription:', updatedRoom)
      setRoom(updatedRoom)
      determinePlayerRole(updatedRoom)
    })

    return () => {
      console.log('Unsubscribing from room updates')
      subscription.unsubscribe()
    }
  }, [params.id])

  const determinePlayerRole = (roomData: Room) => {
    const sessionKey = `debattle_session_${params.id}`
    const storedSessionId = localStorage.getItem(sessionKey)
    
    // Check if this browser session created or joined as player A or B
    const playerASession = localStorage.getItem(`${sessionKey}_player_a`)
    const playerBSession = localStorage.getItem(`${sessionKey}_player_b`)
    
    console.log('Determining role with:', { 
      storedSessionId, 
      playerASession, 
      playerBSession,
      roomPlayerA: roomData.player_a_id,
      roomPlayerB: roomData.player_b_id
    })
    
    if (playerASession === storedSessionId && roomData.player_a_id) {
      console.log('Setting role to player_a')
      setPlayerRole('player_a')
    } else if (playerBSession === storedSessionId && roomData.player_b_id) {
      console.log('Setting role to player_b')
      setPlayerRole('player_b')
    } else {
      console.log('Setting role to spectator')
      setPlayerRole('spectator')
    }
  }

  const copyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(params.id as string)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy room ID:', err)
    }
  }

  const handleReadyUp = async () => {
    if (!room || playerRole === 'spectator') return
    
    try {
      setIsReadyingUp(true)
      setError(null)
      
      const isCurrentlyReady = playerRole === 'player_a' ? room.player_a_ready : room.player_b_ready
      
      if (isCurrentlyReady) {
        await roomService.unready(room.id)
      } else {
        await roomService.readyUp(room.id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to ready up')
    } finally {
      setIsReadyingUp(false)
    }
  }

  const handleLeaveRoom = async () => {
    if (!room) return
    
    try {
      setIsLeaving(true)
      setError(null)
      
      await roomService.leaveRoom(room.id)
      
      // Clear session storage
      const sessionKey = `debattle_session_${params.id}`
      localStorage.removeItem(sessionKey)
      localStorage.removeItem(`${sessionKey}_player_a`)
      localStorage.removeItem(`${sessionKey}_player_b`)
      
      router.push('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to leave room')
      setIsLeaving(false)
    }
  }

  // Remove this function completely - we don't need it anymore
  // const handleJoinAsPlayer = async () => {
  //   // This function is no longer needed since players auto-join when creating/joining rooms
  // }

  const getPlayerStatus = (isPlayerA: boolean): string => {
    if (!room) return 'Waiting...'
    
    const playerId = isPlayerA ? room.player_a_id : room.player_b_id
    const playerReady = isPlayerA ? room.player_a_ready : room.player_b_ready
    
    if (!playerId) return 'Waiting for player...'
    if (playerReady) return '✅ Ready!'
    return 'Not ready'
  }

  const getPlayerLabel = (isPlayerA: boolean): string => {
    const baseLabel = isPlayerA ? 'Player A' : 'Player B'
    if (playerRole === (isPlayerA ? 'player_a' : 'player_b')) {
      return `${baseLabel} (You)`
    }
    return baseLabel
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading room...</div>
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
        <div className="text-xl text-red-500">Room not found</div>
      </div>
    )
  }

  const bothPlayersPresent = room.player_a_id && room.player_b_id
  const bothPlayersReady = room.player_a_ready && room.player_b_ready
  const gameStarted = room.status === 'debating'
  // Removed canJoinAsPlayer since we auto-assign players

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Room ID Section */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Room ID</h2>
            <div className="flex gap-2">
              <button
                onClick={copyRoomId}
                className="btn-secondary text-sm"
              >
                {copied ? 'Copied!' : 'Copy ID'}
              </button>
              {playerRole !== 'spectator' && (
                <button
                  onClick={handleLeaveRoom}
                  className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm"
                  disabled={isLeaving}
                >
                  {isLeaving ? 'Leaving...' : 'Leave Room'}
                </button>
              )}
            </div>
          </div>
          <div className="bg-gray-700 p-3 rounded-lg font-mono text-sm break-all">
            {params.id}
          </div>
          
          {/* Player Status Indicator */}
          <div className="mt-4 text-center">
            <div className={`inline-block px-4 py-2 rounded-lg font-semibold ${
              playerRole === 'player_a' ? 'bg-blue-600' :
              playerRole === 'player_b' ? 'bg-green-600' :
              'bg-gray-600'
            }`}>
              {playerRole === 'player_a' ? '🎮 You are Player A' :
               playerRole === 'player_b' ? '🎮 You are Player B' :
               '👀 You are Spectating'}
            </div>
          </div>
        </div>

        {/* Join as Player Button - REMOVED */}
        {/* Players are auto-assigned when creating/joining rooms */}

        {/* Game Status */}
        {gameStarted && (
          <div className="bg-green-600 rounded-lg p-4 mb-6 text-center">
            <h2 className="text-xl font-bold">🎮 Game Started!</h2>
            <p>The debate is now in progress</p>
          </div>
        )}

        {/* Ready Status */}
        {!gameStarted && bothPlayersPresent && bothPlayersReady && (
          <div className="bg-yellow-600 rounded-lg p-4 mb-6 text-center">
            <h2 className="text-xl font-bold">⚡ Both Players Ready!</h2>
            <p>Game starting...</p>
          </div>
        )}

        {/* Debate Info Section */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h1 className="text-2xl font-bold mb-4">Debate Topic: {room.topic}</h1>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className={`p-4 rounded-lg ${
              playerRole === 'player_a' ? 'bg-blue-700 border-2 border-blue-400' : 'bg-gray-700'
            }`}>
              <h2 className="font-semibold mb-2">{getPlayerLabel(true)}</h2>
              <div className="text-sm text-gray-300 mb-2">
                {getPlayerStatus(true)}
              </div>
              <div className="mt-2">
                Health: {room.player_a_health}
              </div>
            </div>
            
            <div className={`p-4 rounded-lg ${
              playerRole === 'player_b' ? 'bg-green-700 border-2 border-green-400' : 'bg-gray-700'
            }`}>
              <h2 className="font-semibold mb-2">{getPlayerLabel(false)}</h2>
              <div className="text-sm text-gray-300 mb-2">
                {getPlayerStatus(false)}
              </div>
              <div className="mt-2">
                Health: {room.player_b_health}
              </div>
            </div>
          </div>

          <div className="text-center">
            <div className="text-lg mb-4">
              Status: <span className="font-semibold capitalize">{room.status}</span>
            </div>
            
            {/* Ready Up Button */}
            {!gameStarted && playerRole !== 'spectator' && bothPlayersPresent && (
              <div className="mb-4">
                <button
                  onClick={handleReadyUp}
                  className={`px-6 py-3 rounded-lg font-semibold text-lg transition-colors ${
                    (playerRole === 'player_a' ? room.player_a_ready : room.player_b_ready)
                      ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                  disabled={isReadyingUp}
                >
                  {isReadyingUp ? 'Loading...' : 
                   (playerRole === 'player_a' ? room.player_a_ready : room.player_b_ready) ? 
                   'UNREADY' : 'READY UP!'}
                </button>
              </div>
            )}
            
            <div className="text-sm text-gray-400">
              {!bothPlayersPresent 
                ? 'Waiting for another player to join...'
                : bothPlayersReady
                ? 'Game starting...'
                : 'Both players need to ready up to start the debate'
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}