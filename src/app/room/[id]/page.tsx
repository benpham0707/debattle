'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Room } from '@/lib/supabase'
import { roomService } from '@/lib/roomService'
import { roleManager, usePlayerRole } from '@/lib/roleManager'
import GameLobby from '@/components/GameLobby'

export default function RoomPage() {
  const params = useParams()
  if (!params) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="text-xl text-red-500">Invalid route parameters</div>
    </div>
  }
  const router = useRouter()
  const [room, setRoom] = useState<Room | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Countdown state for game start
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
        playerB: updatedRoom.player_b_id?.slice(-8),
        playerAReady: updatedRoom.player_a_ready,
        playerBReady: updatedRoom.player_b_ready
      })
      
      setRoom(updatedRoom)
      
      // If game starts, redirect to game page
      if (updatedRoom.status === 'debating' || updatedRoom.status === 'side_selection') {
        console.log('🎮 ROOM PAGE - Game starting, redirecting to game page')
        
        // Lock the role before navigating to game
        if (playerSession) {
          roleManager.lockRole(updatedRoom.id)
        }
        
        router.push(`/game/${updatedRoom.id}`)
      }
    })

    return () => {
      console.log('🔌 Unsubscribing from room updates')
      subscription.unsubscribe()
      
      // Cleanup countdown interval
      if (countdownInterval.current) {
        clearInterval(countdownInterval.current)
      }
    }
  }, [params.id, router, playerSession])

  // Watch for game start condition and trigger countdown
  useEffect(() => {
    if (!room) return

    const bothPlayersReady = room.player_a_ready && room.player_b_ready
    const bothPlayersPresent = room.player_a_id && room.player_b_id
    const gameNotStarted = room.status !== 'debating' && room.status !== 'side_selection'

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
  }, [room?.player_a_ready, room?.player_b_ready, room?.status, isCountingDown, countdown])

  const startCountdown = () => {
    setIsCountingDown(true)
    setCountdown(12)
    
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
      
      // Update room status to start with side selection
      await roomService.startGameWithSideSelection(room.id)
      
    } catch (error) {
      console.error('Error starting game:', error)
      setError('Failed to start the game')
    }
  }

  // Loading state
  if (loading || roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-spin">⚙️</div>
          <div className="text-xl">Loading room...</div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <div className="text-xl text-red-500 mb-4">{error}</div>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Return Home
          </button>
        </div>
      </div>
    )
  }

  // Room not found
  if (!room) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <div className="text-center">
          <div className="text-6xl mb-4">🔍</div>
          <div className="text-xl text-gray-400 mb-4">Room not found</div>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Return Home
          </button>
        </div>
      </div>
    )
  }

  // Show game lobby for waiting/ready states
  if (room.status === 'waiting' || room.status === 'ready_to_start') {
    return <GameLobby roomId={params.id as string} room={room} />
  }

  // If game has started, redirect (this should be handled by useEffect but just in case)
  if (room.status === 'debating' || room.status === 'side_selection') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">🎮</div>
          <div className="text-xl">Game started! Redirecting...</div>
        </div>
      </div>
    )
  }

  // Game finished state
  if (room.status === 'finished') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <div className="text-center max-w-2xl mx-auto p-6">
          <div className="text-6xl mb-4">🏆</div>
          <h1 className="text-3xl font-bold mb-4">Game Finished!</h1>
          
          {/* Winner Display */}
          {room.winner_name && (
            <div className="bg-yellow-600 rounded-lg p-4 mb-6">
              <h2 className="text-2xl font-bold">🎉 Winner: {room.winner_name}</h2>
            </div>
          )}
          
          {/* Final Health Display */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-blue-700 rounded-lg p-4">
              <h3 className="font-semibold mb-2">Player A</h3>
              <div className="text-2xl font-bold mb-2">{room.player_a_health} HP</div>
              <div className="w-full bg-gray-700 rounded-full h-3">
                <div 
                  className="bg-blue-400 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${room.player_a_health}%` }}
                ></div>
              </div>
            </div>
            
            <div className="bg-green-700 rounded-lg p-4">
              <h3 className="font-semibold mb-2">Player B</h3>
              <div className="text-2xl font-bold mb-2">{room.player_b_health} HP</div>
              <div className="w-full bg-gray-700 rounded-full h-3">
                <div 
                  className="bg-green-400 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${room.player_b_health}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-gray-400">
              Topic: <span className="text-blue-300">{room.topic}</span>
            </p>
            
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => router.push('/')}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                🏠 Return Home
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                🔄 New Game
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Fallback - should not normally reach here
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
      <div className="text-center">
        <div className="text-6xl mb-4">❓</div>
        <div className="text-xl text-gray-400 mb-4">Unknown room state: {room.status}</div>
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Room ID: {params.id?.toString().slice(-8)}<br/>
            Status: {room.status}<br/>
            Phase: {room.current_phase || 'none'}
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Return Home
          </button>
        </div>
      </div>
    </div>
  )
}