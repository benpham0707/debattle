'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { roomService } from '@/lib/roomService'

export default function Home() {
  const router = useRouter()
  const [playerName, setPlayerName] = useState('')
  const [roomId, setRoomId] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [isJoining, setIsJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleJoinDeBattle = async () => {
    if (!playerName.trim()) {
      setError('Please enter your battle name')
      return
    }

    try {
      setIsCreating(true)
      setError(null)
      
      console.log('🏗️ Creating new room with player name:', playerName.trim())
      const { room, playerRole } = await roomService.createRoom(playerName.trim())
      
      console.log('✅ Room created successfully:', {
        roomId: room.id,
        playerRole,
        playerName: playerName.trim()
      })
      
      // Navigate to room page
      router.push(`/room/${room.id}`)
    } catch (err) {
      console.error('❌ Create room error:', err)
      setError('An error occurred while creating the room')
    } finally {
      setIsCreating(false)
    }
  }

  const handleCreatePrivateRoom = async () => {
    if (!playerName.trim()) {
      setError('Please enter your battle name')
      return
    }

    try {
      setIsCreating(true)
      setError(null)
      
      console.log('🏗️ Creating private room with player name:', playerName.trim())
      const { room, playerRole } = await roomService.createRoom(playerName.trim())
      
      console.log('✅ Private room created successfully:', {
        roomId: room.id,
        playerRole,
        playerName: playerName.trim()
      })
      
      // Navigate to room page
      router.push(`/room/${room.id}`)
    } catch (err) {
      console.error('❌ Create private room error:', err)
      setError('An error occurred while creating the private room')
    } finally {
      setIsCreating(false)
    }
  }

  const handleJoinPrivateRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!playerName.trim()) {
      setError('Please enter your battle name')
      return
    }
    if (!roomId.trim()) {
      setError('Please enter a room ID')
      return
    }

    try {
      setIsJoining(true)
      setError(null)
      
      console.log('🚪 Attempting to join room with player name:', {
        roomId: roomId.trim(),
        playerName: playerName.trim()
      })
      
      const { room, playerRole } = await roomService.joinRoom(roomId.trim(), playerName.trim())
      
      console.log('✅ Successfully joined room:', {
        roomId: room.id,
        playerRole,
        playerName: playerName.trim()
      })
      
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
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(to bottom right, #dc2626, #7c3aed, #2563eb)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Enhanced background layers */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(to top right, rgba(251, 191, 36, 0.2), transparent, rgba(236, 72, 153, 0.2))'
      }} />
      <div className="halftone-bg" style={{
        position: 'absolute',
        inset: 0,
        opacity: 0.3
      }} />
      
      {/* Floating Elements */}
      <div style={{
        position: 'absolute',
        top: '5rem',
        left: '2.5rem',
        fontSize: '2.5rem',
        animation: 'bounce 2s infinite'
      }}>
        ⚔️
      </div>
      <div style={{
        position: 'absolute',
        bottom: '8rem',
        right: '4rem',
        fontSize: '2rem',
        animation: 'bounce 2s infinite',
        animationDelay: '1s'
      }}>
        🧠
      </div>
      
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        position: 'relative',
        zIndex: 10
      }}>
        <div className="animate-fade-in-up" style={{
          width: '100%',
          maxWidth: '28rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '2rem'
        }}>
          {/* Title */}
          <div style={{ textAlign: 'center' }}>
            <h1 className="comic-border" style={{
              fontWeight: 'bold',
              fontSize: '3.75rem',
              color: 'black',
              marginBottom: '1rem',
              transform: 'rotate(-2deg)',
              backgroundColor: '#fbbf24',
              padding: '1rem',
              display: 'inline-block'
            }}>
              DeBATTLE
            </h1>
            <p style={{
              fontSize: '1.25rem',
              color: 'white',
              fontWeight: 'bold'
            }}>
              AI-Judged Real-Time Debate Arena
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <div style={{
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid #ef4444',
              color: '#ef4444',
              padding: '1rem',
              borderRadius: '0.5rem',
              textAlign: 'center'
            }}>
              {error}
            </div>
          )}

          {/* Main Card */}
          <div className="comic-border" style={{
            backgroundColor: 'white',
            padding: '1.5rem',
            transform: 'rotate(1deg)'
          }}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem'
            }}>
              {/* Player Name Input */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem'
              }}>
                <label style={{
                  fontSize: '1.125rem',
                  fontWeight: 'bold',
                  color: '#1f2937'
                }}>
                  Enter Your Battle Name
                </label>
                <input
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Your Battle Name..."
                  className="comic-border"
                  style={{
                    width: '100%',
                    fontWeight: 'bold',
                    fontSize: '1.125rem',
                    padding: '0.75rem 1rem',
                    borderRadius: '0.5rem',
                    outline: 'none',
                    border: 'none',
                    boxSizing: 'border-box'
                  }}
                  maxLength={20}
                />
              </div>

              {/* Join DeBattle Button */}
              <button
                onClick={handleJoinDeBattle}
                disabled={!playerName.trim() || isCreating}
                className="comic-border"
                style={{
                  width: '100%',
                  backgroundColor: isCreating || !playerName.trim() ? '#9ca3af' : '#dc2626',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '1.25rem',
                  padding: '1rem',
                  border: 'none',
                  cursor: isCreating || !playerName.trim() ? 'not-allowed' : 'pointer',
                  transform: 'scale(1)',
                  transition: 'transform 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (!isCreating && playerName.trim()) {
                    (e.target as HTMLButtonElement).style.transform = 'scale(1.05)'
                  }
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLButtonElement).style.transform = 'scale(1)'
                }}
              >
                {isCreating ? (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}>
                    <div style={{
                      width: '1.25rem',
                      height: '1.25rem',
                      border: '2px solid white',
                      borderTop: '2px solid transparent',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }}></div>
                    Joining DeBATTLE...
                  </div>
                ) : (
                  <>🎤 JOIN DEBATTLE</>
                )}
              </button>

              <div style={{ position: 'relative' }}>
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  <div style={{
                    width: '100%',
                    borderTop: '2px solid #1f2937'
                  }} />
                </div>
                <div style={{
                  position: 'relative',
                  display: 'flex',
                  justifyContent: 'center',
                  fontSize: '0.875rem'
                }}>
                  <span style={{
                    backgroundColor: 'white',
                    padding: '0 0.5rem',
                    color: '#1f2937',
                    fontWeight: 'bold'
                  }}>OR</span>
                </div>
              </div>

              {/* Join Private Room Section */}
              <form onSubmit={handleJoinPrivateRoom} style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem'
              }}>
                <input
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                  placeholder="ROOM CODE"
                  className="comic-border"
                  style={{
                    width: '100%',
                    fontWeight: 'bold',
                    fontSize: '1.125rem',
                    textAlign: 'center',
                    padding: '0.75rem 1rem',
                    borderRadius: '0.5rem',
                    outline: 'none',
                    border: 'none',
                    boxSizing: 'border-box'
                  }}
                  maxLength={36} // UUID length
                />
                <button
                  type="submit"
                  disabled={!playerName.trim() || !roomId.trim() || isJoining}
                  className="comic-border"
                  style={{
                    width: '100%',
                    backgroundColor: isJoining || !playerName.trim() || !roomId.trim() ? '#9ca3af' : '#10b981',
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '1.125rem',
                    padding: '0.75rem',
                    border: 'none',
                    cursor: isJoining || !playerName.trim() || !roomId.trim() ? 'not-allowed' : 'pointer',
                    transform: 'scale(1)',
                    transition: 'transform 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (!isJoining && playerName.trim() && roomId.trim()) {
                      (e.target as HTMLButtonElement).style.transform = 'scale(1.05)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLButtonElement).style.transform = 'scale(1)'
                  }}
                >
                  {isJoining ? (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem'
                    }}>
                      <div style={{
                        width: '1rem',
                        height: '1rem',
                        border: '2px solid white',
                        borderTop: '2px solid transparent',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }}></div>
                      Joining...
                    </div>
                  ) : (
                    <>🔗 JOIN PRIVATE ROOM</>
                  )}
                </button>
                
                {/* Create Private Room Button */}
                <button
                  onClick={handleCreatePrivateRoom}
                  disabled={!playerName.trim() || isCreating}
                  className="comic-border"
                  style={{
                    width: '100%',
                    backgroundColor: isCreating || !playerName.trim() ? '#9ca3af' : '#7c3aed',
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '1.125rem',
                    padding: '0.75rem',
                    border: 'none',
                    cursor: isCreating || !playerName.trim() ? 'not-allowed' : 'pointer',
                    transform: 'scale(1)',
                    transition: 'transform 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (!isCreating && playerName.trim()) {
                      (e.target as HTMLButtonElement).style.transform = 'scale(1.05)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLButtonElement).style.transform = 'scale(1)'
                  }}
                >
                  {isCreating ? (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem'
                    }}>
                      <div style={{
                        width: '1rem',
                        height: '1rem',
                        border: '2px solid white',
                        borderTop: '2px solid transparent',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }}></div>
                      Creating...
                    </div>
                  ) : (
                    <>💼 CREATE PRIVATE ROOM</>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Feature Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: '1rem',
            textAlign: 'center'
          }}>
            <div className="comic-border" style={{
              backgroundColor: '#fbbf24',
              color: 'black',
              padding: '1rem',
              transform: 'rotate(-1deg)'
            }}>
              <div style={{ fontSize: '1.875rem', marginBottom: '0.5rem' }}>⚡</div>
              <h3 style={{ fontWeight: 'bold', color: 'black' }}>AI-Powered Judging</h3>
              <p style={{ fontSize: '0.875rem', color: 'black' }}>GPT-4 scores your arguments in real-time</p>
            </div>
            
            <div className="comic-border" style={{
              backgroundColor: '#10b981',
              color: 'white',
              padding: '1rem',
              transform: 'rotate(1deg)'
            }}>
              <div style={{ fontSize: '1.875rem', marginBottom: '0.5rem' }}>❤️</div>
              <h3 style={{ fontWeight: 'bold', color: 'white' }}>Health-Based Combat</h3>
              <p style={{ fontSize: '0.875rem', color: 'white' }}>Lose HP based on debate performance</p>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}