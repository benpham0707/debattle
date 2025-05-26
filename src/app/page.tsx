'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { roomService } from '@/lib/roomService'

export default function Home() {
  const router = useRouter()
  const [roomId, setRoomId] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [isJoining, setIsJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreateRoom = async () => {
    try {
      setIsCreating(true)
      setError(null)
      
      console.log('🏗️ Creating new room...')
      const { room, playerRole } = await roomService.createRoom()
      
      console.log('✅ Room created successfully:', {
        roomId: room.id,
        playerRole,
        sessionId: roomService.getSessionId().slice(-8)
      })
      
      // No need to manually set localStorage - RoleManager handles it automatically
      router.push(`/room/${room.id}`)
    } catch (err) {
      console.error('❌ Create room error:', err)
      setError('An error occurred while creating the room')
    } finally {
      setIsCreating(false)
    }
  }

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!roomId.trim()) {
      setError('Please enter a room ID')
      return
    }

    try {
      setIsJoining(true)
      setError(null)
      
      console.log('🚪 Attempting to join room:', roomId.trim())
      
      const { room, playerRole } = await roomService.joinRoom(roomId.trim())
      
      console.log('✅ Successfully joined room:', {
        roomId: room.id,
        playerRole,
        sessionId: roomService.getSessionId().slice(-8)
      })
      
      // No need to manually set localStorage - RoleManager handles it automatically
      router.push(`/room/${room.id}`)
    } catch (err) {
      console.error('❌ Join room error:', err)
      if (err instanceof Error) {
        setError(`Failed to join room: ${err.message}`)
      } else {
        setError('An error occurred while joining the room')
      }
    } finally {
      setIsJoining(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-2xl mx-auto text-center">
        <h1 className="text-4xl font-bold mb-8">🧠 DeBATTLE</h1>
        <p className="text-xl mb-4">Face off in AI-judged real-time debates</p>
        <p className="text-gray-400 mb-12">Create a custom debate room or join an existing one</p>

        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg mb-8">
            {error}
          </div>
        )}

        <div className="space-y-8">
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Create Custom DeBATTLE</h2>
            <p className="text-gray-400 mb-6">
              Create a new debate room and share the ID with your opponent
            </p>
            <button
              onClick={handleCreateRoom}
              className="btn-primary w-full"
              disabled={isCreating}
            >
              {isCreating ? 'Creating Room...' : 'Create New Room'}
            </button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-900 text-gray-400">or</span>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Join DeBATTLE</h2>
            <p className="text-gray-400 mb-6">
              Enter a room ID to join an existing debate
            </p>
            <form onSubmit={handleJoinRoom} className="space-y-4">
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="Enter Room ID"
                className="input-field w-full"
                disabled={isJoining}
              />
              <button 
                type="submit" 
                className="btn-secondary w-full"
                disabled={isJoining || !roomId.trim()}
              >
                {isJoining ? 'Joining Room...' : 'Join Room'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}