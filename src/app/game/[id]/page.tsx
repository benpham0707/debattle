'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Room } from '@/lib/supabase'
import { roomService } from '@/lib/roomService'
import { roleManager, usePlayerRole } from '@/lib/roleManager'
import SideSelection from '../../../components/SideSelection'
import OpeningPrep from '../../../components/OpeningPrep'
import OpeningStatements from '../../../components/OpeningStatements'
import Rebuttals from '../../../components/Rebuttals'

export default function GamePage() {
  const params = useParams();
  if (!params) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-red-500">Invalid route parameters</div>
      </div>
    );
  }
  const router = useRouter()
  const [room, setRoom] = useState<Room | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Use the simple role hook
  const { session: playerSession, isLoading: roleLoading } = usePlayerRole(params.id as string, room)

  useEffect(() => {
    const roomId = params.id as string
    
    console.log('🎮 GAME PAGE - Starting with roomId:', roomId.slice(-8))
    
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
          
          console.log('🎮 GAME PAGE - Room loaded:', {
            status: roomData.status,
            phase: roomData.current_phase,
            playerA: roomData.player_a_id?.slice(-8),
            playerB: roomData.player_b_id?.slice(-8)
          })
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
      console.log('🎮 GAME PAGE - Room updated:', {
        status: updatedRoom.status,
        phase: updatedRoom.current_phase,
        playerA: updatedRoom.player_a_id?.slice(-8),
        playerB: updatedRoom.player_b_id?.slice(-8),
        healthA: updatedRoom.player_a_health,
        healthB: updatedRoom.player_b_health
      })
      
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

  // Handle side selection
  const handleSideSelected = async (side: 'pro' | 'con') => {
    if (!room || !playerSession) return
    
    try {
      console.log(`🗳️ ${playerSession.playerRole} voting for ${side}`)
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
  }

  if (loading || roleLoading) {
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

  if (!room || !playerSession) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-red-500">Game not found</div>
      </div>
    )
  }

  // Show side selection component when in side_selection phase
  if (room.current_phase === 'side_selection' && playerSession.playerRole !== 'spectator') {
    return (
      <SideSelection
        topic={room.topic}
        roomId={room.id}
        playerRole={playerSession.playerRole}
        onSideSelected={handleSideSelected}
        onPhaseComplete={handleSideSelectionComplete}
      />
    )
  }

  // Show opening prep component when in opening_prep phase
  if (room.current_phase === 'opening_prep' && playerSession.playerRole !== 'spectator') {
    const playerSide = playerSession.playerRole === 'player_a' ? room.player_a_side : room.player_b_side
    const opponentSide = playerSession.playerRole === 'player_a' ? room.player_b_side : room.player_a_side
    
    if (playerSide && opponentSide) {
      return (
        <OpeningPrep
          topic={room.topic}
          roomId={room.id}
          playerRole={playerSession.playerRole}
          playerSide={playerSide}
          opponentSide={opponentSide}
          room={room}
        />
      )
    }
  }

  // Show opening statements component when in opening phase
  if (room.current_phase === 'opening' && playerSession.playerRole !== 'spectator') {
    const playerSide = playerSession.playerRole === 'player_a' ? room.player_a_side : room.player_b_side
    
    if (playerSide) {
      return (
        <OpeningStatements
          topic={room.topic}
          roomId={room.id}
          playerRole={playerSession.playerRole}
          playerSide={playerSide}
          room={room}
        />
      )
    }
  }

  // Show rebuttals component when in rebuttal phase
  if (room.current_phase === 'rebuttal' && playerSession.playerRole !== 'spectator') {
    const playerSide = playerSession.playerRole === 'player_a' ? room.player_a_side : room.player_b_side
    
    if (playerSide) {
      return (
        <Rebuttals
          topic={room.topic}
          roomId={room.id}
          playerRole={playerSession.playerRole}
          playerSide={playerSide}
          room={room}
        />
      )
    }
  }

  // Show judging phase
  if (room.current_phase === 'judging') {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="max-w-2xl mx-auto text-center">
          {/* Header */}
          <div className="bg-gray-800 p-4 rounded-t-lg">
            <h1 className="text-xl font-bold">🧠 DeBATTLE</h1>
            <div className="text-sm text-gray-400">
              Room: {params.id?.toString().slice(-8)}
            </div>
          </div>

          {/* Judging Content */}
          <div className="bg-purple-900 p-8 rounded-b-lg">
            <div className="text-6xl mb-4 animate-pulse">🤖</div>
            <h2 className="text-3xl font-bold mb-4">AI Judging in Progress</h2>
            <p className="text-lg text-gray-300 mb-6">
              Our AI judge is analyzing the arguments and determining the winner...
            </p>
            
            {/* Current Health Display */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-blue-700 rounded-lg p-4">
                <h3 className="font-semibold mb-2">
                  Player A {playerSession.playerRole === 'player_a' ? '(You)' : ''}
                </h3>
                <div className="text-2xl font-bold mb-2">{room.player_a_health} HP</div>
                <div className="w-full bg-gray-700 rounded-full h-3">
                  <div 
                    className="bg-blue-400 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${room.player_a_health}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="bg-green-700 rounded-lg p-4">
                <h3 className="font-semibold mb-2">
                  Player B {playerSession.playerRole === 'player_b' ? '(You)' : ''}
                </h3>
                <div className="text-2xl font-bold mb-2">{room.player_b_health} HP</div>
                <div className="w-full bg-gray-700 rounded-full h-3">
                  <div 
                    className="bg-green-400 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${room.player_b_health}%` }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="text-sm text-gray-400">
              Please wait while the AI evaluates the latest round...
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Default fallback view - shouldn't normally be reached
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
          <div>🎭 Role: {playerSession.playerRole}</div>
          <div>🔑 Session ID: {playerSession.sessionId.slice(-8)}</div>
          <div>🔒 Role Locked: {playerSession.isLocked ? 'Yes' : 'No'}</div>
          <div>👤 Room A: {room.player_a_id?.slice(-8) || 'none'} | Room B: {room.player_b_id?.slice(-8) || 'none'}</div>
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
              } ${playerSession.playerRole === 'player_a' ? 'border-2 border-yellow-400' : ''}`}>
                <h3 className="font-semibold mb-2">
                  Player A {playerSession.playerRole === 'player_a' ? '(You)' : ''}
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
              } ${playerSession.playerRole === 'player_b' ? 'border-2 border-yellow-400' : ''}`}>
                <h3 className="font-semibold mb-2">
                  Player B {playerSession.playerRole === 'player_b' ? '(You)' : ''}
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
            playerSession.playerRole === 'player_a' 
              ? 'bg-blue-700 border-2 border-blue-400' 
              : 'bg-blue-700'
          }`}>
            <h3 className="font-semibold mb-2">
              Player A {playerSession.playerRole === 'player_a' ? '(You)' : ''}
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
            playerSession.playerRole === 'player_b' 
              ? 'bg-green-700 border-2 border-green-400' 
              : 'bg-green-700'
          }`}>
            <h3 className="font-semibold mb-2">
              Player B {playerSession.playerRole === 'player_b' ? '(You)' : ''}
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

        {/* Game Interface Placeholder */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">🎮 Debate Arena</h3>
          
          <div className="text-center py-12">
            <div className="text-4xl mb-4">❓</div>
            <h4 className="text-xl font-bold mb-2">Unknown Phase</h4>
            <p className="text-gray-400">
              Current phase: {room.current_phase || 'none'}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              This shouldn't normally happen. Please check the debug info above.
            </p>
          </div>
        </div>

        {/* Debug and Testing Controls */}
        <div className="text-center">
          <div className="space-x-4">
            <button
              onClick={() => router.push(`/room/${params.id}`)}
              className="btn-secondary"
            >
              ← Back to Room (for testing)
            </button>
            <button
              onClick={() => roleManager.debugSession(room.id)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              🔍 Debug Role
            </button>
            <button
              onClick={() => {
                console.log('🎭 GAME PAGE - Current State:')
                console.log('   - Player Session:', playerSession)
                console.log('   - Room Status:', room.status)
                console.log('   - Room Phase:', room.current_phase)
                console.log('   - Room Player A:', room.player_a_id?.slice(-8))
                console.log('   - Room Player B:', room.player_b_id?.slice(-8))
                console.log('   - Player A Health:', room.player_a_health)
                console.log('   - Player B Health:', room.player_b_health)
                console.log('   - Player A Side:', room.player_a_side)
                console.log('   - Player B Side:', room.player_b_side)
              }}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              📊 Log State
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}