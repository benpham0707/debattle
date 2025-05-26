'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Room } from '@/lib/supabase'
import { roomService } from '@/lib/roomService'

export default function GamePage() {
  const params = useParams()
  const router = useRouter()
  const [room, setRoom] = useState<Room | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const roomId = params.id as string
    
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
        {/* Topic Display */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6 text-center">
          <h2 className="text-2xl font-bold mb-2">Debate Topic</h2>
          <p className="text-xl text-blue-300">{room.topic}</p>
          <div className="mt-4 text-sm text-gray-400">
            Current Phase: <span className="capitalize font-semibold text-white">{room.current_phase || 'Opening'}</span>
          </div>
        </div>

        {/* Players Health Bar */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="bg-blue-700 rounded-lg p-4">
            <h3 className="font-semibold mb-2">Player A</h3>
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

          <div className="bg-green-700 rounded-lg p-4">
            <h3 className="font-semibold mb-2">Player B</h3>
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

        {/* Game Interface Placeholder */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">🎮 Game Interface</h3>
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔥</div>
            <h4 className="text-2xl font-bold mb-2">Debate Time!</h4>
            <p className="text-gray-400 mb-4">
              The actual debate interface will be implemented here
            </p>
            <div className="space-y-2 text-sm text-gray-500">
              <p>• Real-time chat system</p>
              <p>• Phase-based timers</p>
              <p>• AI judging integration</p>
              <p>• Turn-based argument system</p>
            </div>
          </div>
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