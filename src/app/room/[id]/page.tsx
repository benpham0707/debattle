'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Room } from '@/lib/supabase'
import { roomService } from '@/lib/roomService'

export default function RoomPage() {
  const params = useParams()
  const [room, setRoom] = useState<Room | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const roomId = params.id as string
    
    // Fetch initial room data
    const fetchRoom = async () => {
      const roomData = await roomService.getRoom(roomId)
      if (roomData) {
        setRoom(roomData)
      } else {
        setError('Room not found')
      }
      setLoading(false)
    }

    fetchRoom()

    // Subscribe to room updates
    const subscription = roomService.subscribeToRoom(roomId, (updatedRoom) => {
      setRoom(updatedRoom)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [params.id])

  const copyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(params.id as string)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy room ID:', err)
    }
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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Room ID Section */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Room ID</h2>
            <button
              onClick={copyRoomId}
              className="btn-secondary text-sm"
            >
              {copied ? 'Copied!' : 'Copy ID'}
            </button>
          </div>
          <div className="bg-gray-700 p-3 rounded-lg font-mono text-sm break-all">
            {params.id}
          </div>
        </div>

        {/* Debate Info Section */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h1 className="text-2xl font-bold mb-4">Debate Topic: {room.topic}</h1>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-700 p-4 rounded-lg">
              <h2 className="font-semibold mb-2">Player A</h2>
              <div className="text-sm text-gray-300">
                {room.player_a_id ? 'Joined' : 'Waiting...'}
              </div>
              <div className="mt-2">
                Health: {room.player_a_health}
              </div>
            </div>
            
            <div className="bg-gray-700 p-4 rounded-lg">
              <h2 className="font-semibold mb-2">Player B</h2>
              <div className="text-sm text-gray-300">
                {room.player_b_id ? 'Joined' : 'Waiting...'}
              </div>
              <div className="mt-2">
                Health: {room.player_b_health}
              </div>
            </div>
          </div>

          <div className="text-center">
            <div className="text-lg mb-2">
              Status: <span className="font-semibold">{room.status}</span>
            </div>
            {room.status === 'waiting' && (
              <div className="text-sm text-gray-400">
                Share the Room ID with your opponent to start the debate
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 