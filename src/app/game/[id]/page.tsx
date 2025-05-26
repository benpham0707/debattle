'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Room } from '@/lib/supabase'
import { roomService } from '@/lib/roomService'
import SideSelection from '../../../components/SideSelection'
import OpeningPrep from '../../../components/OpeningPrep'
import OpeningStatements from '../../../components/OpeningStatements'

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
  const roleInitialized = useRef(false) // Add flag to prevent re-initialization

  useEffect(() => {
    const roomId = params.id as string
    
    // DEBUGGING: Inspect localStorage state
    const debugLocalStorage = () => {
      const sessionKey = `debattle_session_${roomId}`
      console.log('🔍 GAME PAGE - localStorage inspection:')
      console.log(`   - Session key: ${sessionKey}`)
      console.log(`   - Main session: ${localStorage.getItem(sessionKey)?.slice(-8)}`)
      console.log(`   - Player A session: ${localStorage.getItem(`${sessionKey}_player_a`)?.slice(-8)}`)
      console.log(`   - Player B session: ${localStorage.getItem(`${sessionKey}_player_b`)?.slice(-8)}`)
      
      // Log all localStorage keys for this room
      const allKeys = Object.keys(localStorage).filter(key => key.includes(roomId))
      console.log('   - All localStorage keys for this room:', allKeys)
    }
    debugLocalStorage()
    
    // Get session ID - consistent for this browser session
    const getSessionId = () => {
      let id = localStorage.getItem(`debattle_session_${roomId}`)
      if (!id) {
        id = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        localStorage.setItem(`debattle_session_${roomId}`, id)
        console.log('🆕 GAME PAGE - Created new session ID:', id.slice(-8))
      } else {
        console.log('♻️ GAME PAGE - Using existing session ID:', id.slice(-8))
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
          
          // Only determine role ONCE on initial load
          if (!roleInitialized.current) {
            await determineInitialPlayerRole(roomData)
            roleInitialized.current = true
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
      
      // CRITICAL CHECK: Verify our role hasn't been corrupted by room updates
      const currentRole = stablePlayerRole.current;
      console.log('🔍 GAME PAGE - Role validation after room update:');
      console.log(`   - Current stable role: ${currentRole}`);
      console.log(`   - Room Player A ID: ${updatedRoom.player_a_id?.slice(-8)}`);
      console.log(`   - Room Player B ID: ${updatedRoom.player_b_id?.slice(-8)}`);
      console.log(`   - Our session ID: ${sessionId?.slice(-8)}`);
      
      // Double-check localStorage hasn't been corrupted
      const sessionKey = `debattle_session_${roomId}`;
      const playerASession = localStorage.getItem(`${sessionKey}_player_a`);
      const playerBSession = localStorage.getItem(`${sessionKey}_player_b`);
      console.log(`   - Player A localStorage: ${playerASession?.slice(-8)}`);
      console.log(`   - Player B localStorage: ${playerBSession?.slice(-8)}`);
      
      // If our role doesn't match localStorage, something is wrong
      if (currentRole === 'player_a' && playerASession !== sessionId) {
        console.error('🚨 GAME PAGE - Player A role corruption detected!');
        console.error(`   - Expected session: ${sessionId?.slice(-8)}`);
        console.error(`   - Actual localStorage: ${playerASession?.slice(-8)}`);
      }
      if (currentRole === 'player_b' && playerBSession !== sessionId) {
        console.error('🚨 GAME PAGE - Player B role corruption detected!');
        console.error(`   - Expected session: ${sessionId?.slice(-8)}`);
        console.error(`   - Actual localStorage: ${playerBSession?.slice(-8)}`);
      }
      
      setRoom(updatedRoom)
      
      // DON'T recalculate role on updates - keep the stable role
      console.log('👤 Maintaining stable role after update:', stablePlayerRole.current)
      
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
    
    console.log('🎭 GAME PAGE - Starting role determination for room:', roomId.slice(-8))
    console.log('🔑 GAME PAGE - Current session ID:', storedSessionId?.slice(-8))
    
    // Check localStorage for existing role assignments FIRST
    const playerASession = localStorage.getItem(`${sessionKey}_player_a`)
    const playerBSession = localStorage.getItem(`${sessionKey}_player_b`)
    
    console.log('🎭 GAME PAGE - localStorage Role Assignments:')
    console.log(`   - sessionKey: ${sessionKey}`)
    console.log(`   - storedSessionId: ${storedSessionId?.slice(-8)}`)
    console.log(`   - playerASession: ${playerASession?.slice(-8)} (${playerASession ? 'exists' : 'null'})`)
    console.log(`   - playerBSession: ${playerBSession?.slice(-8)} (${playerBSession ? 'exists' : 'null'})`)
    
    console.log('🏠 GAME PAGE - Room Player IDs:')
    console.log(`   - roomData.player_a_id: ${roomData.player_a_id?.slice(-8)}`)
    console.log(`   - roomData.player_b_id: ${roomData.player_b_id?.slice(-8)}`)
    
    let determinedRole: 'player_a' | 'player_b' | 'spectator' = 'spectator'
    
    // PRIORITY 1: Check localStorage role assignments (most reliable)
    console.log('🔍 GAME PAGE - Checking localStorage assignments...')
    
    // Check Player A assignment
    if (playerASession && playerASession === storedSessionId && roomData.player_a_id) {
      console.log('✅ GAME PAGE - MATCH: playerASession equals storedSessionId')
      console.log(`   - playerASession: ${playerASession.slice(-8)}`)
      console.log(`   - storedSessionId: ${storedSessionId?.slice(-8)}`)
      console.log(`   - roomData.player_a_id exists: ${!!roomData.player_a_id}`)
      determinedRole = 'player_a'
      console.log('✅ GAME PAGE - Identified as Player A from localStorage role assignment')
    } 
    // Check Player B assignment
    else if (playerBSession && playerBSession === storedSessionId && roomData.player_b_id) {
      console.log('✅ GAME PAGE - MATCH: playerBSession equals storedSessionId')
      console.log(`   - playerBSession: ${playerBSession.slice(-8)}`)
      console.log(`   - storedSessionId: ${storedSessionId?.slice(-8)}`)
      console.log(`   - roomData.player_b_id exists: ${!!roomData.player_b_id}`)
      determinedRole = 'player_b'
      console.log('✅ GAME PAGE - Identified as Player B from localStorage role assignment')
    } 
    else {
      console.log('❌ GAME PAGE - No localStorage match found')
      console.log('🔍 GAME PAGE - Detailed comparison:')
      console.log(`   - playerASession === storedSessionId: ${playerASession === storedSessionId}`)
      console.log(`   - playerBSession === storedSessionId: ${playerBSession === storedSessionId}`)
      console.log(`   - roomData.player_a_id exists: ${!!roomData.player_a_id}`)
      console.log(`   - roomData.player_b_id exists: ${!!roomData.player_b_id}`)
      
      // PRIORITY 2: Try to match by user ID (fallback)
      console.log('🔄 GAME PAGE - Trying fallback user ID matching...')
      const userId = await roomService.getUserId()
      const effectiveUserId = userId || storedSessionId
      
      console.log('🔍 GAME PAGE - User ID Fallback:', { 
        userId: userId?.slice(-8),
        effectiveUserId: effectiveUserId?.slice(-8), 
        roomPlayerA: roomData.player_a_id?.slice(-8), 
        roomPlayerB: roomData.player_b_id?.slice(-8) 
      })
      
      if (roomData.player_a_id === effectiveUserId) {
        determinedRole = 'player_a'
        // Update localStorage to maintain consistency for future
        if (storedSessionId) {
          localStorage.setItem(`${sessionKey}_player_a`, storedSessionId)
          console.log('🔧 GAME PAGE - Updated localStorage with Player A assignment')
        }
        console.log('✅ GAME PAGE - Matched as Player A by user ID (fallback)')
      } else if (roomData.player_b_id === effectiveUserId) {
        determinedRole = 'player_b'
        // Update localStorage to maintain consistency for future
        if (storedSessionId) {
          localStorage.setItem(`${sessionKey}_player_b`, storedSessionId)
          console.log('🔧 GAME PAGE - Updated localStorage with Player B assignment')
        }
        console.log('✅ GAME PAGE - Matched as Player B by user ID (fallback)')
      } else {
        console.log('👀 GAME PAGE - No match found - remaining as spectator')
        console.log('🔍 GAME PAGE - Complete Debug Info:')
        console.log(`   - storedSessionId: ${storedSessionId?.slice(-8)}`)
        console.log(`   - effectiveUserId: ${effectiveUserId?.slice(-8)}`)
        console.log(`   - roomPlayerAId: ${roomData.player_a_id?.slice(-8)}`)
        console.log(`   - roomPlayerBId: ${roomData.player_b_id?.slice(-8)}`)
        console.log(`   - playerASession: ${playerASession?.slice(-8)}`)
        console.log(`   - playerBSession: ${playerBSession?.slice(-8)}`)
      }
    }
    
    // CRITICAL: Double-check that we don't have conflicting assignments
    if (determinedRole !== 'spectator') {
      console.log('🔍 GAME PAGE - Final validation check:')
      console.log(`   - Determined role: ${determinedRole}`)
      console.log(`   - Session ID: ${storedSessionId?.slice(-8)}`)
      console.log(`   - Player A session: ${playerASession?.slice(-8)}`)
      console.log(`   - Player B session: ${playerBSession?.slice(-8)}`)
      console.log(`   - Room Player A ID: ${roomData.player_a_id?.slice(-8)}`)
      console.log(`   - Room Player B ID: ${roomData.player_b_id?.slice(-8)}`)
      
      // Additional validation
      if (determinedRole === 'player_a' && roomData.player_a_id !== (await roomService.getUserId() || storedSessionId)) {
        console.error('🚨 GAME PAGE - VALIDATION ERROR: Player A role but user ID mismatch!')
      }
      if (determinedRole === 'player_b' && roomData.player_b_id !== (await roomService.getUserId() || storedSessionId)) {
        console.error('🚨 GAME PAGE - VALIDATION ERROR: Player B role but user ID mismatch!')
      }
    }
    
    // Set the role and mark it as stable
    stablePlayerRole.current = determinedRole
    setPlayerRole(determinedRole)
    hasJoinedAsPlayer.current = determinedRole !== 'spectator'
    
    console.log('🎯 GAME PAGE - FINAL determined role:', determinedRole)
    console.log('🔒 GAME PAGE - Role locked in - will not change during game')
    
    // Log localStorage state after role determination
    console.log('📋 GAME PAGE - Final localStorage state:')
    console.log(`   - ${sessionKey}: ${localStorage.getItem(sessionKey)?.slice(-8)}`)
    console.log(`   - ${sessionKey}_player_a: ${localStorage.getItem(`${sessionKey}_player_a`)?.slice(-8)}`)
    console.log(`   - ${sessionKey}_player_b: ${localStorage.getItem(`${sessionKey}_player_b`)?.slice(-8)}`)
  }

  // Handle side selection
  const handleSideSelected = async (side: 'pro' | 'con') => {
    if (!room) return
    
    try {
      console.log(`🗳️ ${stablePlayerRole.current} voting for ${side}`)
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

  // Show opening prep component when in opening_prep phase
  if (room.current_phase === 'opening_prep' && stablePlayerRole.current !== 'spectator') {
    const playerSide = stablePlayerRole.current === 'player_a' ? room.player_a_side : room.player_b_side
    const opponentSide = stablePlayerRole.current === 'player_a' ? room.player_b_side : room.player_a_side
    
    if (playerSide && opponentSide) {
      return (
        <OpeningPrep
          topic={room.topic}
          roomId={room.id}
          playerRole={stablePlayerRole.current}
          playerSide={playerSide}
          opponentSide={opponentSide}
          room={room}
        />
      )
    }
  }

  // Show opening statements component when in opening phase
  if (room.current_phase === 'opening' && stablePlayerRole.current !== 'spectator') {
    const playerSide = stablePlayerRole.current === 'player_a' ? room.player_a_side : room.player_b_side
    
    if (playerSide) {
      return (
        <OpeningStatements
          topic={room.topic}
          roomId={room.id}
          playerRole={stablePlayerRole.current}
          playerSide={playerSide}
          room={room}
        />
      )
    }
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
        {/* Debug Info - Keep this for now to help debug */}
        <div className="bg-gray-900 border border-gray-700 rounded p-2 mb-4 text-xs font-mono">
          <div>🎭 Stable Role: {stablePlayerRole.current}</div>
          <div>🔑 Session: {sessionId?.slice(-8)}</div>
          <div>👤 Room A: {room.player_a_id?.slice(-8) || 'none'} | Room B: {room.player_b_id?.slice(-8) || 'none'}</div>
          <div>🎮 Status: {room.status} | Phase: {room.current_phase || 'none'}</div>
          <div>🔒 Role Initialized: {roleInitialized.current ? 'Yes' : 'No'}</div>
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
              } ${stablePlayerRole.current === 'player_a' ? 'border-2 border-yellow-400' : ''}`}>
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
              } ${stablePlayerRole.current === 'player_b' ? 'border-2 border-yellow-400' : ''}`}>
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
          ) : room.current_phase === 'opening_prep' ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">📝</div>
              <h4 className="text-xl font-bold mb-2">Opening Prep Phase</h4>
              <p className="text-gray-400">Players are preparing their opening statements...</p>
            </div>
          ) : room.current_phase === 'opening' ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">🎤</div>
              <h4 className="text-xl font-bold mb-2">Opening Statements</h4>
              <p className="text-gray-400">Players are delivering their opening arguments...</p>
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
          <div className="space-x-4">
            <button
              onClick={() => router.push(`/room/${params.id}`)}
              className="btn-secondary"
            >
              ← Back to Room (for testing)
            </button>
            <button
              onClick={() => {
                const roomId = params.id as string
                const sessionKey = `debattle_session_${roomId}`
                console.log('🔍 MANUAL localStorage inspection:')
                console.log(`   - ${sessionKey}: ${localStorage.getItem(sessionKey)}`)
                console.log(`   - ${sessionKey}_player_a: ${localStorage.getItem(`${sessionKey}_player_a`)}`)
                console.log(`   - ${sessionKey}_player_b: ${localStorage.getItem(`${sessionKey}_player_b`)}`)
                console.log(`   - Current role: ${stablePlayerRole.current}`)
                console.log(`   - Session ID: ${sessionId}`)
                
                // Check for localStorage pollution
                const allKeys = Object.keys(localStorage).filter(key => key.includes('debattle'));
                console.log('   - All DeBATTLE keys:', allKeys);
                allKeys.forEach(key => {
                  console.log(`     - ${key}: ${localStorage.getItem(key)}`);
                });
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              🔍 Inspect localStorage
            </button>
            <button
              onClick={() => {
                const roomId = params.id as string
                const sessionKey = `debattle_session_${roomId}`
                localStorage.removeItem(sessionKey)  
                localStorage.removeItem(`${sessionKey}_player_a`)
                localStorage.removeItem(`${sessionKey}_player_b`)
                console.log('🧹 Cleared localStorage for this room')
                window.location.reload()
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              🧹 Clear localStorage & Reload
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}