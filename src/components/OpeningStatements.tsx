import React, { useState, useEffect } from 'react';
import { getCurrentTurnInfo } from '@/lib/supabase';
import ChatInterface from './ChatInterface';

interface OpeningStatementsProps {
  topic: string;
  roomId: string;
  playerRole: 'player_a' | 'player_b';
  playerSide: 'pro' | 'con';
  room: any;
}

const OpeningStatements: React.FC<OpeningStatementsProps> = ({
  topic,
  roomId,
  playerRole,
  playerSide,
  room
}) => {
  const [currentTurn, setCurrentTurn] = useState<{
    currentSpeaker: 'player_a' | 'player_b' | 'transition' | 'none';
    timeLeft: number;
  }>({ currentSpeaker: 'none', timeLeft: 0 });

  // Update turn information every second
  useEffect(() => {
    if (!room?.phase_start_time || !room?.phase_duration) return;

    const updateTimer = () => {
      const turnInfo = getCurrentTurnInfo(
        'opening',
        room.phase_start_time,
        room.phase_duration
      );
      setCurrentTurn(turnInfo);
      
      // Auto-progress to rebuttal phase when opening is complete
      if (turnInfo.timeLeft <= 0) {
        console.log('🎤 Opening statements complete - should move to rebuttal');
        // This will be handled by your phase progression logic
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [room?.phase_start_time, room?.phase_duration]);

  const isMyTurn = () => {
    return (
      (currentTurn.currentSpeaker === 'player_a' && playerRole === 'player_a') ||
      (currentTurn.currentSpeaker === 'player_b' && playerRole === 'player_b')
    );
  };

  const getCurrentPhaseDescription = () => {
    switch (currentTurn.currentSpeaker) {
      case 'player_a':
        return playerRole === 'player_a' ? 
          'Your turn to deliver your opening statement!' : 
          'Player A is delivering their opening statement';
      case 'transition':
        return 'Brief transition - get ready for the next speaker';
      case 'player_b':
        return playerRole === 'player_b' ? 
          'Your turn to deliver your opening statement!' : 
          'Player B is delivering their opening statement';
      default:
        return 'Opening statements in progress';
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 p-4 border-b border-gray-700">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">🧠 DeBATTLE - Opening Statements</h1>
          <div className="text-sm text-gray-400">
            Room: {roomId.slice(-8)}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        {/* Timer & Current Speaker */}
        <div className={`rounded-lg p-6 mb-6 text-center transition-colors ${
          currentTurn.currentSpeaker === 'player_a' ? 'bg-blue-600' :
          currentTurn.currentSpeaker === 'player_b' ? 'bg-green-600' :
          currentTurn.currentSpeaker === 'transition' ? 'bg-yellow-600' :
          'bg-gray-600'
        }`}>
          <div className="text-4xl font-bold mb-2">
            {currentTurn.timeLeft}s
          </div>
          <h2 className="text-xl font-bold mb-2">
            {getCurrentPhaseDescription()}
          </h2>
          {isMyTurn() && (
            <p className="text-lg animate-pulse">
              💬 Type your opening statement in the chat below!
            </p>
          )}
        </div>

        {/* Topic Reminder */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6 text-center">
          <h3 className="text-lg font-bold mb-2">🎯 {topic}</h3>
          <p className="text-gray-400">
            You are arguing: <span className={`font-bold ${
              playerSide === 'pro' ? 'text-green-400' : 'text-red-400'
            }`}>
              {playerSide.toUpperCase()}
            </span>
          </p>
        </div>

        {/* Chat Interface - This is the key addition! */}
        <div className="bg-gray-800 rounded-lg mb-6" style={{ height: '500px' }}>
          <ChatInterface
            roomId={roomId}
            playerRole={playerRole}
            playerSide={playerSide}
            currentPhase="opening"
            isMyTurn={isMyTurn()}
            timeLeft={currentTurn.timeLeft}
            disabled={currentTurn.currentSpeaker === 'transition'}
          />
        </div>

        {/* Speaking Order Visual */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-bold text-center mb-4">Speaking Order</h3>
          <div className="flex justify-center items-center gap-4">
            {/* Player A */}
            <div className={`px-4 py-2 rounded-lg text-center ${
              currentTurn.currentSpeaker === 'player_a' 
                ? 'bg-blue-600 border-2 border-blue-400' 
                : currentTurn.timeLeft > 40
                ? 'bg-gray-700'
                : 'bg-green-800' // Completed
            }`}>
              <div className="font-semibold">
                Player A {playerRole === 'player_a' ? '(You)' : ''}
              </div>
              <div className="text-sm">
                {currentTurn.currentSpeaker === 'player_a' ? '🎤 Speaking' : 
                 currentTurn.timeLeft > 40 ? '⏳ First' : '✅ Done'}
              </div>
            </div>

            <div className="text-gray-400">→</div>

            {/* Transition */}
            <div className={`px-4 py-2 rounded-lg text-center ${
              currentTurn.currentSpeaker === 'transition' 
                ? 'bg-yellow-600 border-2 border-yellow-400' 
                : 'bg-gray-700'
            }`}>
              <div className="font-semibold">Transition</div>
              <div className="text-sm">
                {currentTurn.currentSpeaker === 'transition' ? '⏳ Active' : '⏸️ Wait'}
              </div>
            </div>

            <div className="text-gray-400">→</div>

            {/* Player B */}
            <div className={`px-4 py-2 rounded-lg text-center ${
              currentTurn.currentSpeaker === 'player_b' 
                ? 'bg-green-600 border-2 border-green-400' 
                : currentTurn.timeLeft <= 0
                ? 'bg-green-800' // Completed
                : 'bg-gray-700'
            }`}>
              <div className="font-semibold">
                Player B {playerRole === 'player_b' ? '(You)' : ''}
              </div>
              <div className="text-sm">
                {currentTurn.currentSpeaker === 'player_b' ? '🎤 Speaking' : 
                 currentTurn.timeLeft <= 0 ? '✅ Done' : '⏳ Next'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OpeningStatements;