'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Room } from '@/lib/supabase'
import { roomService } from '@/lib/roomService'
import { roleManager, usePlayerRole } from '@/lib/roleManager'

export default function RoomPage() {
  const params = useParams()
  const router = useRouter()
  const [room, setRoom] = useState<Room | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [isReadyingUp, setIsReadyingUp] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)
  
  // Countdown state
  const [countdown, setCountdown] = useState<number | null>(null)
  const [isCountingDown, setIsCountingDown] = useState(false)
  
  const countdownInterval = useRef<NodeJS.Timeout | null>(null)

  // Use the simple role hook
  const { session: playerSession, isLoading: roleLoading } = usePlayerRole(params.id as string, room)

  useEffect(() => {
    const roomId = params.id as string
    
    // Fetch initial room data
    const fetchRoom = async () => {
      try {
        const roomData = await roomService.getRoom(roomId)
        if (roomData) {
          setRoom(roomData)
          console.log('🏠 ROOM PAGE - Room loaded:', {
            roomId: roomData.id.slice(-8),
            playerA: roomData.player_a_id?.slice(-8),
            playerB: roomData.player_b_id?.slice(-8),
            status: roomData.status
          })
        } else {
          setError('Room not found')
        }
      } catch (err) {
        console.error('Error fetching room:', err)
        setError('Failed to load room')
      } finally {
        setLoading(false)
      }
    }

    fetchRoom()

    // Subscribe to room updates
    const subscription = roomService.subscribeToRoom(roomId, (updatedRoom) => {
      console.log('🔄 ROOM PAGE - Room updated:', {
        status: updatedRoom.status,
        playerA: updatedRoom.player_a_id?.slice(-8),
        playerB: updatedRoom.player_b_id?.slice(-8)
      })
      
      setRoom(updatedRoom)
    })

    return () => {
      console.log('🔌 Unsubscribing from room updates')
      subscription.unsubscribe()
      
      // Cleanup countdown interval
      if (countdownInterval.current) {
        clearInterval(countdownInterval.current)
      }
    }
  }, [params.id])

  // Watch for game start condition and trigger countdown
  useEffect(() => {
    if (!room) return

    const bothPlayersReady = room.player_a_ready && room.player_b_ready
    const bothPlayersPresent = room.player_a_id && room.player_b_id
    const gameNotStarted = room.status !== 'debating'

    console.log('Game start check:', {
      bothPlayersReady,
      bothPlayersPresent,
      gameNotStarted,
      isCountingDown,
      countdown,
      roomStatus: room.status
    })

    // Start countdown when both players are ready but game hasn't started
    if (bothPlayersReady && bothPlayersPresent && gameNotStarted && !isCountingDown && countdown === null) {
      console.log('🚀 Starting 5-second countdown!')
      startCountdown()
    }

    // Navigate to game when status changes to debating
    if (room.status === 'debating' && countdown === null && !isCountingDown) {
      console.log('🎮 Game started! Navigating to game page...')
      
      // Lock the role before navigating to game
      if (playerSession) {
        roleManager.lockRole(room.id)
      }
      
      router.push(`/game/${room.id}`)
    }
  }, [room, isCountingDown, countdown, router, playerSession])

  const startCountdown = () => {
    setIsCountingDown(true)
    setCountdown(5)
    
    countdownInterval.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          // Countdown finished - start the game
          if (countdownInterval.current) {
            clearInterval(countdownInterval.current)
          }
          setIsCountingDown(false)
          startGame()
          return null
        }
        return prev - 1
      })
    }, 1000)
  }

  const startGame = async () => {
    if (!room) return
    
    try {
      console.log('🎯 Starting the game!')
      
      // Update room status to 'debating' with side_selection phase
      await roomService.startGameWithSideSelection(room.id)
      
    } catch (error) {
      console.error('Error starting game:', error)
      setError('Failed to start the game')
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
    if (!room || !playerSession || playerSession.playerRole === 'spectator') return
    
    try {
      setIsReadyingUp(true)
      setError(null)
      
      const isCurrentlyReady = playerSession.playerRole === 'player_a' ? room.player_a_ready : room.player_b_ready
      
      console.log('🚀 Ready up action:', {
        playerRole: playerSession.playerRole,
        isCurrentlyReady
      })
      
      if (isCurrentlyReady) {
        await roomService.unready(room.id)
      } else {
        await roomService.readyUp(room.id)
      }
    } catch (err) {
      console.error('Ready up error:', err)
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
      
      // Clear role when leaving
      roleManager.clearRole(room.id)
      
      router.push('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to leave room')
      setIsLeaving(false)
    }
  }

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
    if (playerSession && playerSession.playerRole === (isPlayerA ? 'player_a' : 'player_b')) {
      return `${baseLabel} (You)`
    }
    return baseLabel
  }

  if (loading || roleLoading) {
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

  if (!room || !playerSession) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-red-500">Room not found</div>
      </div>
    )
  }

  const bothPlayersPresent = room.player_a_id && room.player_b_id
  const bothPlayersReady = room.player_a_ready && room.player_b_ready
  const gameStarted = room.status === 'debating'

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Debug Info - Shows stable role management working */}
        <div className="bg-gray-900 border border-gray-700 rounded p-2 mb-4 text-xs font-mono">
          <div>🎭 Role: {playerSession.playerRole}</div>
          <div>🔑 Session ID: {playerSession.sessionId.slice(-8)}</div>
          <div>🔒 Role Locked: {playerSession.isLocked ? 'Yes' : 'No'}</div>
          <div>👤 Room A: {room.player_a_id?.slice(-8) || 'none'} | Room B: {room.player_b_id?.slice(-8) || 'none'}</div>
          <div>🎮 Status: {room.status} | Phase: {room.current_phase || 'none'}</div>
          {room.player_a_side && room.player_b_side && (
            <div>🎯 Sides: A={room.player_a_side} | B={room.player_b_side}</div>
          )}
          {countdown !== null && <div>⏰ Countdown: {countdown}</div>}
        </div>

        {/* Countdown Overlay */}
        {countdown !== null && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="text-center">
              <div className="text-8xl font-bold text-white mb-4 animate-pulse">
                {countdown}
              </div>
              <div className="text-2xl text-white">
                Get Ready to Debate!
              </div>
              <div className="text-lg text-gray-300 mt-2">
                Topic: {room.topic}
              </div>
            </div>
          </div>
        )}

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
              {playerSession.playerRole !== 'spectator' && (
                <button
                  onClick={handleLeaveRoom}
                  className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm"
                  disabled={isLeaving}
                >
                  {isLeaving ? 'Leaving...' : 'Leave Room'}
                </button>
              )}
              <button
                onClick={() => roleManager.debugSession(room.id)}
                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
              >
                🔍 Debug Role
              </button>
            </div>
          </div>
          <div className="bg-gray-700 p-3 rounded-lg font-mono text-sm break-all">
            {params.id}
          </div>
          
          {/* Player Status Indicator */}
          <div className="mt-4 text-center">
            <div className={`inline-block px-4 py-2 rounded-lg font-semibold ${
              playerSession.playerRole === 'player_a' ? 'bg-blue-600' :
              playerSession.playerRole === 'player_b' ? 'bg-green-600' :
              'bg-gray-600'
            }`}>
              {playerSession.playerRole === 'player_a' ? '🎮 You are Player A' :
               playerSession.playerRole === 'player_b' ? '🎮 You are Player B' :
               '👀 You are Spectating'}
            </div>
          </div>
        </div>

        {/* Game Status */}
        {gameStarted && (
          <div className="bg-green-600 rounded-lg p-4 mb-6 text-center">
            <h2 className="text-xl font-bold">🎮 Game Started!</h2>
            <p>The debate is now in progress</p>
          </div>
        )}

        {/* Countdown Status */}
        {isCountingDown && countdown !== null && (
          <div className="bg-yellow-600 rounded-lg p-4 mb-6 text-center">
            <h2 className="text-xl font-bold">⏰ Game Starting in {countdown}...</h2>
            <p>Get ready to debate!</p>
          </div>
        )}

        {/* Ready Status */}
        {!gameStarted && bothPlayersPresent && bothPlayersReady && !isCountingDown && (
          <div className="bg-yellow-600 rounded-lg p-4 mb-6 text-center">
            <h2 className="text-xl font-bold">⚡ Both Players Ready!</h2>
            <p>Starting countdown...</p>
          </div>
        )}

        {/* Side Selection Results */}
        {room.status === 'ready_to_start' && room.player_a_side && room.player_b_side && (
          <div className="bg-blue-600 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-center mb-4">🎯 Sides Assigned!</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className={`p-4 rounded-lg text-center ${
                room.player_a_side === 'pro' ? 'bg-green-700' : 'bg-red-700'
              }`}>
                <h3 className="font-semibold mb-2">
                  {getPlayerLabel(true)}
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
                  {getPlayerLabel(false)}
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

        {/* Debate Info Section */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h1 className="text-2xl font-bold mb-4">Debate Topic: {room.topic}</h1>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className={`p-4 rounded-lg ${
              playerSession.playerRole === 'player_a' ? 'bg-blue-700 border-2 border-blue-400' : 'bg-gray-700'
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
              playerSession.playerRole === 'player_b' ? 'bg-green-700 border-2 border-green-400' : 'bg-gray-700'
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
              Status: <span className="font-semibold capitalize">{room.status.replace('_', ' ')}</span>
              {room.current_phase && (
                <span className="ml-2 text-sm text-gray-400">
                  (Phase: {room.current_phase})
                </span>
              )}
            </div>
            
            {/* Ready Up Button */}
            {!gameStarted && playerSession.playerRole !== 'spectator' && bothPlayersPresent && 
             room.status === 'waiting' && (
              <div className="mb-4">
                <button
                  onClick={handleReadyUp}
                  className={`px-6 py-3 rounded-lg font-semibold text-lg transition-colors ${
                    (playerSession.playerRole === 'player_a' ? room.player_a_ready : room.player_b_ready)
                      ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                  disabled={isReadyingUp}
                >
                  {isReadyingUp ? 'Loading...' : 
                   (playerSession.playerRole === 'player_a' ? room.player_a_ready : room.player_b_ready) ? 
                   'UNREADY' : 'READY UP!'}
                </button>
              </div>
            )}
            
            <div className="text-sm text-gray-400">
              {!bothPlayersPresent 
                ? 'Waiting for another player to join...'
                : room.status === 'side_selection'
                ? 'Side selection in progress...'
                : room.status === 'ready_to_start'
                ? 'Sides assigned! Game will start soon...'
                : bothPlayersReady
                ? 'Both players ready! Starting side selection...'
                : 'Both players need to ready up to start the debate'
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}