import React, { useState, useEffect } from 'react';
import { roomService } from '@/lib/roomService';

interface SideSelectionProps {
  topic: string;
  roomId: string;
  playerRole: 'player_a' | 'player_b';
  onSideSelected: (side: 'pro' | 'con') => void;
  onPhaseComplete: (playerASide: 'pro' | 'con', playerBSide: 'pro' | 'con') => void;
}

const SideSelection: React.FC<SideSelectionProps> = ({
  topic,
  roomId,
  playerRole,
  onSideSelected,
  onPhaseComplete
}) => {
  const [timeLeft, setTimeLeft] = useState(10);
  const [selectedSide, setSelectedSide] = useState<'pro' | 'con' | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [isWaitingForResults, setIsWaitingForResults] = useState(false);
  const [room, setRoom] = useState<any>(null);

  // Debug log to ensure we're getting the correct playerRole
  useEffect(() => {
    console.log('🎭 SideSelection initialized with playerRole:', playerRole);
  }, [playerRole]);

  // Fetch initial room state and subscribe to updates
  useEffect(() => {
    const fetchRoom = async () => {
      const roomData = await roomService.getRoom(roomId);
      setRoom(roomData);
      console.log('🏠 Room data in SideSelection:', roomData);
    };
    
    fetchRoom();

    // Subscribe to room updates to get real-time voting results
    const subscription = roomService.subscribeToRoom(roomId, async (updatedRoom) => {
      console.log('🔄 Room update in SideSelection:', updatedRoom);
      setRoom(updatedRoom);
      
      // Check if side selection is complete
      if (updatedRoom.player_a_side && updatedRoom.player_b_side) {
        // Move to opening prep phase
        if (updatedRoom.current_phase === 'side_selection') {
          // Transition to prep phase
          try {
            await roomService.startOpeningPrep(roomId);
          } catch (error) {
            console.error('Error starting opening prep:', error);
          }
        } else if (updatedRoom.current_phase === 'opening_prep') {
          onPhaseComplete(updatedRoom.player_a_side, updatedRoom.player_b_side);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [roomId, onPhaseComplete]);

  // Countdown timer based on room deadline
  useEffect(() => {
    if (!room?.side_selection_deadline) return;

    const updateTimer = () => {
      const deadline = new Date(room.side_selection_deadline).getTime();
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((deadline - now) / 1000));
      
      setTimeLeft(remaining);
      
      if (remaining === 0 && !isWaitingForResults) {
        handleTimeUp();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [room?.side_selection_deadline, isWaitingForResults]);

  const handleSideSelection = async (side: 'pro' | 'con') => {
    if (hasVoted || isWaitingForResults) return;
    
    console.log(`🗳️ ${playerRole} selecting side: ${side}`);
    setSelectedSide(side);
    setHasVoted(true);
    onSideSelected(side);
  };

  const handleTimeUp = async () => {
    if (!hasVoted && !isWaitingForResults) {
      setIsWaitingForResults(true);
      // Time's up - finalize side selection
      try {
        await roomService.finalizeSideSelection(roomId);
      } catch (error) {
        console.error('Error finalizing side selection:', error);
      }
    }
  };

  const getSideDescription = (side: 'pro' | 'con') => {
    return side === 'pro' ? 'Supporting the statement' : 'Opposing the statement';
  };

  const getVoteStatus = () => {
    if (!room) return { aVoted: false, bVoted: false };
    return {
      aVoted: !!room.player_a_side_vote,
      bVoted: !!room.player_b_side_vote
    };
  };

  const { aVoted, bVoted } = getVoteStatus();
  const bothVoted = aVoted && bVoted;

  // If both players have voted and we have final assignments, show results
  if (room?.player_a_side && room?.player_b_side) {
    const playerASide = room.player_a_side;
    const playerBSide = room.player_b_side;
    const playerAVote = room.player_a_side_vote;
    const playerBVote = room.player_b_side_vote;
    const myFinalSide = playerRole === 'player_a' ? playerASide : playerBSide;

    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="max-w-4xl mx-auto p-6">
          {/* Debug Info */}
          <div className="bg-gray-900 border border-gray-700 rounded p-2 mb-4 text-xs font-mono">
            <div>🎭 My Role: {playerRole}</div>
            <div>🎯 My Final Side: {myFinalSide}</div>
            <div>🗳️ My Vote: {playerRole === 'player_a' ? playerAVote : playerBVote}</div>
            <div>🏠 Room ID: {roomId.slice(-8)}</div>
          </div>

          {/* Topic Display */}
          <div className="bg-gray-800 rounded-lg p-8 mb-8 text-center">
            <h2 className="text-2xl font-bold mb-4">🎯 Debate Topic</h2>
            <p className="text-3xl font-semibold text-blue-300 mb-6">{topic}</p>
          </div>

          {/* Results Display */}
          <div className="bg-gray-800 rounded-lg p-8">
            <h3 className="text-2xl font-bold text-center mb-6">📋 Final Assignments</h3>
            
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div className={`p-6 rounded-lg text-center ${
                playerASide === 'pro' ? 'bg-green-700' : 'bg-red-700'
              } ${playerRole === 'player_a' ? 'border-2 border-yellow-400' : ''}`}>
                <h4 className="text-xl font-semibold mb-2">
                  Player A {playerRole === 'player_a' ? '(You)' : ''}
                </h4>
                <div className="text-3xl mb-2">
                  {playerASide === 'pro' ? '✅' : '❌'}
                </div>
                <div className="text-lg font-bold">
                  {playerASide.toUpperCase()}
                </div>
                <div className="text-sm text-gray-300 mt-2">
                  Voted: {playerAVote?.toUpperCase() || 'No vote'}
                </div>
              </div>

              <div className={`p-6 rounded-lg text-center ${
                playerBSide === 'pro' ? 'bg-green-700' : 'bg-red-700'
              } ${playerRole === 'player_b' ? 'border-2 border-yellow-400' : ''}`}>
                <h4 className="text-xl font-semibold mb-2">
                  Player B {playerRole === 'player_b' ? '(You)' : ''}
                </h4>
                <div className="text-3xl mb-2">
                  {playerBSide === 'pro' ? '✅' : '❌'}
                </div>
                <div className="text-lg font-bold">
                  {playerBSide.toUpperCase()}
                </div>
                <div className="text-sm text-gray-300 mt-2">
                  Voted: {playerBVote?.toUpperCase() || 'No vote'}
                </div>
              </div>
            </div>

            <div className="text-center">
              {playerAVote === playerBVote ? (
                <p className="text-yellow-400 mb-4">
                  🎲 Both players chose the same side - random assignment made!
                </p>
              ) : (
                <p className="text-green-400 mb-4">
                  ✅ Players chose different sides - preferences honored!
                </p>
              )}
              
              <div className={`inline-block px-6 py-3 rounded-lg text-xl font-bold ${
                myFinalSide === 'pro' ? 'bg-green-600' : 'bg-red-600'
              }`}>
                You are arguing: {myFinalSide.toUpperCase()}
              </div>
              
              <p className="text-gray-400 mt-4">
                Preparing to start the debate...
              </p>
            </div>
          </div>

          {/* Status */}
          <div className="text-center mt-8 text-gray-400">
            Room: {roomId.slice(-8)} | You are {playerRole.replace('_', ' ').toUpperCase()}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <div className="max-w-4xl mx-auto p-6">
        {/* Debug Info */}
        <div className="bg-gray-900 border border-gray-700 rounded p-2 mb-4 text-xs font-mono">
          <div>🎭 My Role: {playerRole}</div>
          <div>🗳️ Has Voted: {hasVoted ? 'Yes' : 'No'}</div>
          <div>✅ Selected: {selectedSide || 'None'}</div>
          <div>🏠 Room ID: {roomId.slice(-8)}</div>
        </div>

        {/* Countdown Timer */}
        <div className="text-center mb-8">
          {!isWaitingForResults && (
            <div className={`text-6xl font-bold mb-4 ${timeLeft <= 3 ? 'text-red-400 animate-pulse' : 'text-blue-400'}`}>
              {timeLeft}
            </div>
          )}
          
          {isWaitingForResults && (
            <div className="text-2xl text-yellow-400 animate-pulse">
              Finalizing results...
            </div>
          )}
        </div>

        {/* Topic Display */}
        <div className="bg-gray-800 rounded-lg p-8 mb-8 text-center">
          <h2 className="text-2xl font-bold mb-4">🎯 Debate Topic</h2>
          <p className="text-3xl font-semibold text-blue-300 mb-6">{topic}</p>
          
          {!isWaitingForResults && (
            <p className="text-gray-400 text-lg">
              Choose which side you'd like to argue
            </p>
          )}
        </div>

        {/* Voting Status */}
        {(aVoted || bVoted) && !isWaitingForResults && (
          <div className="bg-gray-700 rounded-lg p-4 mb-6 text-center">
            <h3 className="text-lg font-semibold mb-2">Voting Status</h3>
            <div className="flex justify-center gap-6">
              <div className={`px-4 py-2 rounded ${aVoted ? 'bg-green-600' : 'bg-gray-600'}`}>
                Player A: {aVoted ? '✅ Voted' : '⏳ Waiting'}
              </div>
              <div className={`px-4 py-2 rounded ${bVoted ? 'bg-green-600' : 'bg-gray-600'}`}>
                Player B: {bVoted ? '✅ Voted' : '⏳ Waiting'}
              </div>
            </div>
            {bothVoted && (
              <p className="text-green-400 mt-2">
                Both players voted! Calculating assignments...
              </p>
            )}
          </div>
        )}

        {/* Side Selection Buttons */}
        {!isWaitingForResults && (
          <div className="grid grid-cols-2 gap-8">
            {/* Pro Side */}
            <button
              onClick={() => handleSideSelection('pro')}
              disabled={hasVoted || timeLeft === 0}
              className={`p-8 rounded-lg border-2 transition-all duration-300 ${
                selectedSide === 'pro'
                  ? 'bg-green-600 border-green-400 scale-105'
                  : hasVoted || timeLeft === 0
                  ? 'bg-gray-700 border-gray-600 opacity-50 cursor-not-allowed'
                  : 'bg-gray-800 border-gray-600 hover:border-green-400 hover:bg-green-900'
              }`}
            >
              <div className="text-6xl mb-4">✅</div>
              <h3 className="text-2xl font-bold mb-2">PRO</h3>
              <p className="text-gray-300">{getSideDescription('pro')}</p>
              {selectedSide === 'pro' && (
                <div className="mt-4 text-green-300 font-semibold">
                  ✓ Selected
                </div>
              )}
            </button>

            {/* Con Side */}
            <button
              onClick={() => handleSideSelection('con')}
              disabled={hasVoted || timeLeft === 0}
              className={`p-8 rounded-lg border-2 transition-all duration-300 ${
                selectedSide === 'con'
                  ? 'bg-red-600 border-red-400 scale-105'
                  : hasVoted || timeLeft === 0
                  ? 'bg-gray-700 border-gray-600 opacity-50 cursor-not-allowed'
                  : 'bg-gray-800 border-gray-600 hover:border-red-400 hover:bg-red-900'
              }`}
            >
              <div className="text-6xl mb-4">❌</div>
              <h3 className="text-2xl font-bold mb-2">CON</h3>
              <p className="text-gray-300">{getSideDescription('con')}</p>
              {selectedSide === 'con' && (
                <div className="mt-4 text-red-300 font-semibold">
                  ✓ Selected
                </div>
              )}
            </button>
          </div>
        )}

        {/* Instructions */}
        {!hasVoted && !isWaitingForResults && timeLeft > 0 && (
          <div className="text-center mt-8 text-gray-400">
            <p className="text-lg">Click on your preferred side to vote</p>
            <p className="text-sm mt-2">
              If both players choose the same side, assignments will be random
            </p>
          </div>
        )}

        {/* Waiting message */}
        {hasVoted && !isWaitingForResults && (
          <div className="text-center mt-8">
            <p className="text-lg text-green-400">
              ✅ Your vote has been submitted!
            </p>
            <p className="text-gray-400 mt-2">
              Waiting for {bothVoted ? 'results' : 'other player to vote'}...
            </p>
          </div>
        )}

        {/* Status */}
        <div className="text-center mt-8 text-gray-400">
          Room: {roomId.slice(-8)} | You are {playerRole.replace('_', ' ').toUpperCase()}
        </div>
      </div>
    </div>
  );
};

export default SideSelection;