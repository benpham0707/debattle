import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Room } from '@/lib/supabase';
import { roomService } from '@/lib/roomService';
import { roleManager, usePlayerRole } from '@/lib/roleManager';

interface GameLobbyProps {
  roomId: string;
  room: Room;
}

const GameLobby: React.FC<GameLobbyProps> = ({ roomId, room }) => {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [isReadyingUp, setIsReadyingUp] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isCountingDown, setIsCountingDown] = useState(false);

  const countdownInterval = useRef<NodeJS.Timeout | null>(null);

  // Use role manager to get player session
  const { session: playerSession, isLoading: roleLoading } = usePlayerRole(roomId, room);

  // Watch for game start condition and trigger countdown
  useEffect(() => {
    if (!room) return;

    const bothPlayersReady = room.player_a_ready && room.player_b_ready;
    const bothPlayersPresent = room.player_a_id && room.player_b_id;
    const isReadyToStart = room.status === 'ready_to_start';
    const gameNotStarted = room.status !== 'debating' && room.status !== 'side_selection';

    console.log('Game start check:', {
      bothPlayersReady,
      bothPlayersPresent,
      isReadyToStart,
      gameNotStarted,
      isCountingDown,
      countdown,
      roomStatus: room.status
    });

    // Start countdown when room status is 'ready_to_start' and not already counting
    if (isReadyToStart && !isCountingDown && countdown === null) {
      console.log('🚀 Starting 12-second countdown! (10 numbers + 2 seconds "Entering DeBATTLE")');
      startCountdown();
    }

    // Clear countdown if conditions are no longer met
    if (!isReadyToStart && isCountingDown) {
      console.log('🛑 Clearing countdown - room no longer ready to start');
      clearCountdown();
    }
  }, [room?.status, isCountingDown, countdown]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (countdownInterval.current) {
        clearInterval(countdownInterval.current);
      }
    };
  }, []);

  const startCountdown = () => {
    setIsCountingDown(true);
    setCountdown(10); // Start at 10, then go to "Entering DeBATTLE" for 2 seconds
    
    countdownInterval.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null) return null;
        
        if (prev > 1) {
          // Normal countdown: 10, 9, 8, 7, 6, 5, 4, 3, 2, 1
          return prev - 1;
        } else if (prev === 1) {
          // After 1, show "Entering DeBATTLE" (first time)
          return -1; // Use -1 to indicate first "Entering DeBATTLE"
        } else if (prev === -1) {
          // Show "Entering DeBATTLE" second time
          return -2; // Use -2 to indicate second "Entering DeBATTLE"
        } else {
          // After 2 seconds of "Entering DeBATTLE", start the game
          if (countdownInterval.current) {
            clearInterval(countdownInterval.current);
          }
          setIsCountingDown(false);
          startGame();
          return null;
        }
      });
    }, 1000);
  };

  const clearCountdown = () => {
    if (countdownInterval.current) {
      clearInterval(countdownInterval.current);
      countdownInterval.current = null;
    }
    setIsCountingDown(false);
    setCountdown(null);
  };

  const startGame = async () => {
    if (!room) return;
    
    try {
      console.log('🎯 Starting the game!');
      
      // Update room status to start with side selection
      await roomService.startGameWithSideSelection(room.id);
      
    } catch (error) {
      console.error('Error starting game:', error);
      setError('Failed to start the game');
    }
  };

  // Handle ready up functionality
  const handleReadyUp = async () => {
    if (!room || !playerSession || playerSession.playerRole === 'spectator') return;
    
    try {
      setIsReadyingUp(true);
      setError(null);
      
      const isCurrentlyReady = playerSession.playerRole === 'player_a' ? room.player_a_ready : room.player_b_ready;
      
      console.log('🚀 Ready up action:', {
        playerRole: playerSession.playerRole,
        isCurrentlyReady
      });
      
      if (isCurrentlyReady) {
        await roomService.unready(roomId);
      } else {
        await roomService.readyUp(roomId);
      }
    } catch (err) {
      console.error('Ready up error:', err);
      setError(err instanceof Error ? err.message : 'Failed to ready up');
    } finally {
      setIsReadyingUp(false);
    }
  };

  // Handle leaving room
  const handleLeaveRoom = async () => {
    if (!room) return;
    
    try {
      setIsLeaving(true);
      setError(null);
      
      // Clear countdown if leaving
      clearCountdown();
      
      await roomService.leaveRoom(roomId);
      
      // Clear role when leaving
      roleManager.clearRole(roomId);
      
      // Navigate back to home page
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to leave room');
      setIsLeaving(false);
    }
  };

  // Copy room ID to clipboard
  const copyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy room ID:', err);
      setError('Failed to copy room ID');
    }
  };

  // Get player display name - REMOVED "(You)" text
  const getPlayerName = (isPlayerA: boolean): string => {
    const storedName = isPlayerA ? room.player_a_name : room.player_b_name;
    const fallbackName = isPlayerA ? 'Player A' : 'Player B';
    
    // Simply return the name without "(You)" indicator
    return storedName || fallbackName;
  };

  // Check if current player is ready
  const isPlayerReady = () => {
    if (!playerSession || playerSession.playerRole === 'spectator') return false;
    return playerSession.playerRole === 'player_a' ? room.player_a_ready : room.player_b_ready;
  };

  // Check game state
  const bothPlayersPresent = room.player_a_id && room.player_b_id;
  const bothPlayersReady = room.player_a_ready && room.player_b_ready;
  const gameStarted = room.status === 'debating';
  const canReady = bothPlayersPresent && !gameStarted && playerSession?.playerRole !== 'spectator';

  if (roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading lobby...</div>
      </div>
    );
  }

  // Get countdown display text and styling
  const getCountdownDisplay = () => {
    if (countdown === null) return { text: '', isEntering: false };
    
    if (countdown === -1 || countdown === -2) {
      // Show "Entering DeBATTLE" for the last 2 seconds
      return { 
        text: 'Entering DeBATTLE!', 
        isEntering: true 
      };
    } else {
      // Show normal countdown numbers (10, 9, 8, 7, 6, 5, 4, 3, 2, 1)
      return { 
        text: countdown.toString(), 
        isEntering: false 
      };
    }
  };

  const countdownDisplay = getCountdownDisplay();

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

      {/* Countdown Overlay - Updated with new logic */}
      {countdown !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="text-center">
            <div className={`font-bold mb-4 animate-pulse ${
              countdownDisplay.isEntering 
                ? 'text-4xl text-yellow-400' 
                : 'text-8xl text-white'
            }`} style={{
              textShadow: '0 0 20px rgba(255, 255, 255, 0.5)'
            }}>
              {countdownDisplay.text}
            </div>
            {!countdownDisplay.isEntering && (
              <>
                <div className="text-2xl text-white font-bold mb-2">
                  Battle starting!
                </div>
                <div className="text-lg text-gray-300 mt-2">
                  Topic: {room.topic}
                </div>
              </>
            )}
            {countdownDisplay.isEntering && (
              <div className="text-xl text-yellow-300 font-bold animate-bounce">
                🎮 Get ready to debate! 🎮
              </div>
            )}
          </div>
        </div>
      )}
      
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        position: 'relative',
        zIndex: 10
      }}>
        <div style={{
          width: '100%',
          maxWidth: '80rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '2rem'
        }}>
          {/* Room Code Header */}
          <div style={{ textAlign: 'center' }}>
            <div className="comic-border" style={{
              backgroundColor: '#fbbf24',
              color: 'black',
              padding: '1rem 2rem',
              display: 'inline-block',
              fontWeight: 'bold',
              fontSize: '1.25rem',
              transform: 'rotate(1deg)',
              marginBottom: '1rem'
            }}>
              Room Code: {roomId.slice(-8)}
            </div>
            <button
              onClick={copyRoomId}
              style={{
                marginLeft: '1rem',
                padding: '0.5rem 1rem',
                backgroundColor: copied ? '#10b981' : '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>

          {/* Battle Arena Title */}
          <div style={{ textAlign: 'center' }}>
            <h1 className="comic-border" style={{
              fontWeight: 'bold',
              fontSize: '3rem',
              color: 'black',
              backgroundColor: '#fbbf24',
              padding: '1rem 2rem',
              display: 'inline-block',
              transform: 'rotate(-1deg)'
            }}>
              BATTLE ARENA
            </h1>
          </div>

          {/* Error Display */}
          {error && (
            <div style={{
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid #ef4444',
              color: '#ef4444',
              padding: '1rem',
              borderRadius: '0.5rem',
              textAlign: 'center',
              marginBottom: '1rem'
            }}>
              {error}
            </div>
          )}

          {/* Game Status */}
          {gameStarted && (
            <div style={{
              backgroundColor: '#10b981',
              color: 'white',
              padding: '1rem 2rem',
              borderRadius: '0.5rem',
              textAlign: 'center',
              fontWeight: 'bold',
              fontSize: '1.25rem'
            }}>
              🎮 Game Started! Redirecting to debate...
            </div>
          )}

          {/* Ready Status Messages */}
          {!gameStarted && bothPlayersPresent && bothPlayersReady && !isCountingDown && (
            <div style={{
              backgroundColor: '#f59e0b',
              color: 'white',
              padding: '1rem 2rem',
              borderRadius: '0.5rem',
              textAlign: 'center',
              fontWeight: 'bold',
              fontSize: '1.25rem'
            }}>
              ⚡ Both Players Ready! Starting countdown...
            </div>
          )}

          {/* Main Battle Arena */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            gap: '2rem',
            alignItems: 'start'
          }}>
            {/* Player A Section */}
            <div className="comic-border" style={{
              backgroundColor: 'white',
              padding: '2rem',
              transform: 'rotate(-1deg)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: `radial-gradient(circle, #0066FF 1px, transparent 1px)`,
                backgroundSize: '15px 15px',
                backgroundPosition: '0 0',
                opacity: 0.1
              }} />
              
              <div style={{ position: 'relative', zIndex: 10 }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                  <div style={{
                    width: '6rem',
                    height: '6rem',
                    backgroundColor: '#3b82f6',
                    borderRadius: '50%',
                    margin: '0 auto 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2rem',
                    color: 'white',
                    fontWeight: 'bold',
                    position: 'relative'
                  }}>
                    {room.player_a_id ? 'A' : '?'}
                    <div style={{
                      position: 'absolute',
                      top: '-0.5rem',
                      right: '-0.5rem',
                      backgroundColor: '#fbbf24',
                      width: '2.5rem',
                      height: '2.5rem',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1rem',
                      color: 'black'
                    }}>
                      🛡️
                    </div>
                  </div>
                  
                  <h3 style={{
                    fontSize: '1.5rem',
                    fontWeight: 'bold',
                    color: 'black',
                    marginBottom: '0.5rem'
                  }}>
                    {getPlayerName(true)}
                  </h3>
                  <p style={{
                    color: 'rgba(0, 0, 0, 0.7)',
                    fontWeight: 'bold'
                  }}>
                    Defender of Innovation
                  </p>
                </div>
                
                <div style={{
                  padding: '1rem',
                  backgroundColor: room.player_a_ready ? '#10b981' : '#6b7280',
                  borderRadius: '0.5rem',
                  textAlign: 'center',
                  marginBottom: '1rem',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '1.125rem'
                }}>
                  {room.player_a_ready ? '✅ READY FOR BATTLE!' : '⏳ NOT READY'}
                </div>
                
                {/* Ready Button for Player A */}
                {playerSession?.playerRole === 'player_a' && (
                  <button
                    onClick={handleReadyUp}
                    disabled={isReadyingUp}
                    className="comic-border"
                    style={{
                      width: '100%',
                      backgroundColor: room.player_a_ready ? '#f59e0b' : '#10b981',
                      color: 'white',
                      fontWeight: 'bold',
                      fontSize: '1rem',
                      padding: '0.75rem',
                      border: 'none',
                      cursor: isReadyingUp ? 'not-allowed' : 'pointer',
                      marginBottom: '1rem',
                      opacity: isReadyingUp ? 0.7 : 1
                    }}
                  >
                    {isReadyingUp ? (
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
                        Loading...
                      </div>
                    ) : (
                      <>⚡ {room.player_a_ready ? 'UNREADY' : 'GET READY!'}</>
                    )}
                  </button>
                )}
                
                {room.player_a_ready && (
                  <div style={{
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    color: 'black',
                    padding: '1rem',
                    borderRadius: '0.5rem',
                    textAlign: 'center',
                    fontSize: '0.875rem',
                    fontWeight: 'bold'
                  }}>
                    "Logic will be my weapon!"
                  </div>
                )}
              </div>
            </div>

            {/* Center VS Section */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2rem'
            }}>
              {/* VS Circle */}
              <div style={{
                position: 'relative'
              }}>
                <div style={{
                  width: '8rem',
                  height: '8rem',
                  background: 'linear-gradient(135deg, #f97316, #ef4444)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: 'rotate(12deg)',
                  animation: 'bounce 2s infinite',
                  fontSize: '2rem',
                  fontWeight: 'bold',
                  color: 'white',
                  border: '4px solid black',
                  boxShadow: '6px 6px 0px black'
                }}>
                  VS
                </div>
                <div style={{
                  position: 'absolute',
                  top: '-1rem',
                  right: '-1rem',
                  fontSize: '2.5rem',
                  animation: 'pulse 2s infinite'
                }}>
                  ⚔️
                </div>
              </div>
              
              {/* Status */}
              <div className="comic-border" style={{
                backgroundColor: 'rgba(124, 58, 237, 0.2)',
                padding: '1rem',
                transform: 'rotate(1deg)',
                borderRadius: '0.5rem',
                maxWidth: '16rem',
                textAlign: 'center'
              }}>
                <p style={{
                  color: 'black',
                  fontWeight: 'bold'
                }}>
                  {!bothPlayersPresent ? 'Waiting for opponent...' : 
                   bothPlayersReady ? 
                     (isCountingDown ? 
                       (countdownDisplay.isEntering ? 'Entering DeBATTLE!' : `Battle starting in ${countdown}...`) : 
                       'Both players ready!') :
                   'Players getting ready...'}
                </p>
              </div>
            </div>

            {/* Player B Section */}
            <div className="comic-border" style={{
              backgroundColor: 'white',
              padding: '2rem',
              transform: 'rotate(1deg)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: `radial-gradient(circle, #FF1744 1px, transparent 1px)`,
                backgroundSize: '15px 15px',
                backgroundPosition: '0 0',
                opacity: 0.1
              }} />
              
              <div style={{ position: 'relative', zIndex: 10 }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                  <div style={{
                    width: '6rem',
                    height: '6rem',
                    backgroundColor: '#ef4444',
                    borderRadius: '50%',
                    margin: '0 auto 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2rem',
                    color: 'white',
                    fontWeight: 'bold',
                    position: 'relative'
                  }}>
                    {room.player_b_id ? 'B' : '?'}
                    <div style={{
                      position: 'absolute',
                      top: '-0.5rem',
                      right: '-0.5rem',
                      backgroundColor: '#fbbf24',
                      width: '2.5rem',
                      height: '2.5rem',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1rem',
                      color: 'black'
                    }}>
                      🛡️
                    </div>
                  </div>
                  
                  <h3 style={{
                    fontSize: '1.5rem',
                    fontWeight: 'bold',
                    color: 'black',
                    marginBottom: '0.5rem'
                  }}>
                    {getPlayerName(false)}
                  </h3>
                  <p style={{
                    color: 'rgba(0, 0, 0, 0.7)',
                    fontWeight: 'bold'
                  }}>
                    Challenger of Change
                  </p>
                </div>
                
                <div style={{
                  padding: '1rem',
                  backgroundColor: room.player_b_ready ? '#10b981' : '#6b7280',
                  borderRadius: '0.5rem',
                  textAlign: 'center',
                  marginBottom: '1rem',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '1.125rem'
                }}>
                  {room.player_b_ready ? '✅ READY FOR BATTLE!' : '⏳ NOT READY'}
                </div>
                
                {/* Ready Button for Player B */}
                {playerSession?.playerRole === 'player_b' && (
                  <button
                    onClick={handleReadyUp}
                    disabled={isReadyingUp}
                    className="comic-border"
                    style={{
                      width: '100%',
                      backgroundColor: room.player_b_ready ? '#f59e0b' : '#10b981',
                      color: 'white',
                      fontWeight: 'bold',
                      fontSize: '1rem',
                      padding: '0.75rem',
                      border: 'none',
                      cursor: isReadyingUp ? 'not-allowed' : 'pointer',
                      marginBottom: '1rem',
                      opacity: isReadyingUp ? 0.7 : 1
                    }}
                  >
                    {isReadyingUp ? (
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
                        Loading...
                      </div>
                    ) : (
                      <>⚡ {room.player_b_ready ? 'UNREADY' : 'GET READY!'}</>
                    )}
                  </button>
                )}
                
                {room.player_b_ready && (
                  <div style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    color: 'black',
                    padding: '1rem',
                    borderRadius: '0.5rem',
                    textAlign: 'center',
                    fontSize: '0.875rem',
                    fontWeight: 'bold'
                  }}>
                    "Bring on the debate!"
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '2rem',
            flexWrap: 'wrap'
          }}>
            {/* Leave Button */}
            <button
              onClick={handleLeaveRoom}
              disabled={isLeaving}
              className="comic-border"
              style={{
                backgroundColor: '#6b7280',
                color: 'white',
                fontWeight: 'bold',
                fontSize: '1.25rem',
                padding: '1rem 2rem',
                border: 'none',
                cursor: isLeaving ? 'not-allowed' : 'pointer',
                transform: 'scale(1)',
                transition: 'transform 0.2s',
                opacity: isLeaving ? 0.7 : 1
              }}
              onMouseEnter={(e) => {
                if (!isLeaving) {
                  (e.target as HTMLButtonElement).style.transform = 'scale(1.05)'
                }
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLButtonElement).style.transform = 'scale(1)'
              }}
            >
              {isLeaving ? (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
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
                  Leaving...
                </div>
              ) : (
                <>🚪 LEAVE ARENA</>
              )}
            </button>
          </div>

          {/* Game Rules */}
          <div className="comic-border" style={{
            backgroundColor: 'rgba(251, 191, 36, 0.2)',
            color: 'black',
            padding: '2rem'
          }}>
            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: 'bold',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              ⚡ BATTLE RULES
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '1rem',
              fontSize: '0.875rem',
              fontWeight: 'bold'
            }}>
              <div>
                <p>📝 Opening Statements: 1 min (30s each)</p>
                <p>🔄 Rebuttals: 1 min (30s each)</p>
                <p>⚡ Crossfire: 1.5 min (rapid Q&A)</p>
              </div>
              <div>
                <p>🎯 Final Arguments: 1 min (30s each)</p>
                <p>❤️ Health: 100 HP each player</p>
                <p>🤖 AI judges performance each round</p>
              </div>
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
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default GameLobby;