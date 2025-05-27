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

  // Update turn information
  useEffect(() => {
    if (!room?.phase_start_time || !room?.phase_duration) return;

    const updateTimer = () => {
      const turnInfo = getCurrentTurnInfo(
        'opening',
        room.phase_start_time,
        room.phase_duration
      );
      setCurrentTurn(turnInfo);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [room?.phase_start_time, room?.phase_duration]);

  const getSpeakerLabel = (speaker: string) => {
    switch (speaker) {
      case 'player_a':
        return `Player A ${playerRole === 'player_a' ? '(You)' : ''}`;
      case 'player_b':
        return `Player B ${playerRole === 'player_b' ? '(You)' : ''}`;
      case 'transition':
        return 'Transition Period';
      default:
        return 'Waiting...';
    }
  };

  const getSpeakerColor = (speaker: string) => {
    switch (speaker) {
      case 'player_a':
        return 'bg-blue-600';
      case 'player_b':
        return 'bg-green-600';
      case 'transition':
        return 'bg-yellow-600';
      default:
        return 'bg-gray-600';
    }
  };

  const isMyTurn = () => {
    return (
      (currentTurn.currentSpeaker === 'player_a' && playerRole === 'player_a') ||
      (currentTurn.currentSpeaker === 'player_b' && playerRole === 'player_b')
    );
  };

  const getStatusMessage = () => {
    if (currentTurn.currentSpeaker === 'transition') {
      return 'Brief transition - prepare for next speaker';
    } else if (isMyTurn()) {
      return '🎤 It\'s your turn to speak!';
    } else if (currentTurn.currentSpeaker !== 'none') {
      return 'Listen to your opponent\'s opening statement';
    } else {
      return 'Opening statements phase';
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

      {/* Main Content */}
      <div className="max-w-6xl mx-auto p-6">
        {/* Current Speaker Display */}
        <div className={`rounded-lg p-8 mb-6 text-center ${getSpeakerColor(currentTurn.currentSpeaker)}`}>
          <div className="text-4xl font-bold mb-2">{currentTurn.timeLeft}</div>
          <h2 className="text-2xl font-bold mb-2">
            {getSpeakerLabel(currentTurn.currentSpeaker)}
          </h2>
          <p className="text-lg">
            {getStatusMessage()}
          </p>
        </div>

        {/* Topic Display */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6 text-center">
          <h2 className="text-xl font-bold mb-2">🎯 Debate Topic</h2>
          <p className="text-2xl text-blue-300 mb-4">{topic}</p>
          <p className="text-gray-400">
            You are arguing: <span className={`font-bold ${playerSide === 'pro' ? 'text-green-400' : 'text-red-400'}`}>
              {playerSide.toUpperCase()}
            </span>
          </p>
        </div>

        {/* Split Layout: Speaking Progress + Chat */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Speaking Progress */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-bold mb-4 text-center">Speaking Progress</h3>
            
            <div className="grid grid-cols-3 gap-2">
              {/* Player A */}
              <div className={`p-3 rounded-lg text-center ${
                currentTurn.currentSpeaker === 'player_a' 
                  ? 'bg-blue-600 border-2 border-blue-400' 
                  : 'bg-gray-700'
              }`}>
                <h4 className="font-semibold mb-1 text-sm">
                  Player A {playerRole === 'player_a' ? '(You)' : ''}
                </h4>
                <div className="text-xl mb-1">
                  {currentTurn.currentSpeaker === 'player_a' ? '🎤' : '✅'}
                </div>
                <div className="text-xs">
                  {currentTurn.currentSpeaker === 'player_a' ? 'Speaking' : 'Complete'}
                </div>
              </div>

              {/* Transition */}
              <div className={`p-3 rounded-lg text-center ${
                currentTurn.currentSpeaker === 'transition' 
                  ? 'bg-yellow-600 border-2 border-yellow-400' 
                  : 'bg-gray-700'
              }`}>
                <h4 className="font-semibold mb-1 text-sm">Transition</h4>
                <div className="text-xl mb-1">
                  {currentTurn.currentSpeaker === 'transition' ? '⏳' : '⏸️'}
                </div>
                <div className="text-xs">
                  {currentTurn.currentSpeaker === 'transition' ? 'Active' : 'Waiting'}
                </div>
              </div>

              {/* Player B */}
              <div className={`p-3 rounded-lg text-center ${
                currentTurn.currentSpeaker === 'player_b' 
                  ? 'bg-green-600 border-2 border-green-400' 
                  : 'bg-gray-700'
              }`}>
                <h4 className="font-semibold mb-1 text-sm">
                  Player B {playerRole === 'player_b' ? '(You)' : ''}
                </h4>
                <div className="text-xl mb-1">
                  {currentTurn.currentSpeaker === 'player_b' ? '🎤' : 
                   currentTurn.timeLeft > 40 ? '⏳' : '✅'}
                </div>
                <div className="text-xs">
                  {currentTurn.currentSpeaker === 'player_b' ? 'Speaking' : 
                   currentTurn.timeLeft > 40 ? 'Waiting' : 'Complete'}
                </div>
              </div>
            </div>
          </div>

          {/* Chat Interface */}
          <div className="h-96">
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
        </div>

        {/* Instructions */}
        <div className="bg-blue-900 rounded-lg p-6">
          <h3 className="text-lg font-bold mb-4">📋 Opening Statement Guidelines</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-2">What to include:</h4>
              <ul className="space-y-1 text-sm text-gray-300">
                <li>• Clear statement of your position</li>
                <li>• 2-3 main supporting arguments</li>
                <li>• Brief evidence or examples</li>
                <li>• Strong, memorable conclusion</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Remember:</h4>
              <ul className="space-y-1 text-sm text-gray-300">
                <li>• You have exactly 30 seconds</li>
                <li>• Type your arguments in chat</li>
                <li>• Stay focused on your key points</li>
                <li>• Set the tone for the debate</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OpeningStatements;