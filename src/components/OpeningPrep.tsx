import React, { useState, useEffect } from 'react';
import { roomService } from '@/lib/roomService';

interface OpeningPrepProps {
  topic: string;
  roomId: string;
  playerRole: 'player_a' | 'player_b';
  playerSide: 'pro' | 'con';
  opponentSide: 'pro' | 'con';
  room: any;
}

const OpeningPrep: React.FC<OpeningPrepProps> = ({
  topic,
  roomId,
  playerRole,
  playerSide,
  opponentSide,
  room
}) => {
  const [timeLeft, setTimeLeft] = useState(30);

  // Countdown timer based on room phase timing
  useEffect(() => {
    if (!room?.phase_start_time || !room?.phase_duration) return;

    const updateTimer = () => {
      const startTime = new Date(room.phase_start_time).getTime();
      const now = Date.now();
      const elapsed = Math.floor((now - startTime) / 1000);
      const remaining = Math.max(0, room.phase_duration - elapsed);
      
      setTimeLeft(remaining);
      
      if (remaining === 0) {
        // Prep time is up - start opening statements
        handlePrepComplete();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [room?.phase_start_time, room?.phase_duration]);

  const handlePrepComplete = async () => {
    try {
      await roomService.startOpeningStatements(roomId);
      console.log('✅ Opening statements started');
    } catch (error) {
      console.error('Error starting opening statements:', error);
    }
  };

  const getSideColor = (side: 'pro' | 'con') => {
    return side === 'pro' ? 'text-green-400' : 'text-red-400';
  };

  const getSideIcon = (side: 'pro' | 'con') => {
    return side === 'pro' ? '✅' : '❌';
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <div className="max-w-4xl mx-auto p-6">
        {/* Countdown Timer */}
        <div className="text-center mb-8">
          <div className={`text-6xl font-bold mb-4 ${timeLeft <= 5 ? 'text-red-400 animate-pulse' : 'text-blue-400'}`}>
            {timeLeft}
          </div>
          <h2 className="text-2xl font-bold text-yellow-400">Opening Prep Time</h2>
          <p className="text-gray-400 mt-2">Use this time to prepare your opening statement</p>
        </div>

        {/* Topic Display */}
        <div className="bg-gray-800 rounded-lg p-8 mb-8 text-center">
          <h2 className="text-2xl font-bold mb-4">🎯 Debate Topic</h2>
          <p className="text-3xl font-semibold text-blue-300 mb-6">{topic}</p>
        </div>

        {/* Your Assignment */}
        <div className="bg-gray-800 rounded-lg p-8 mb-8">
          <h3 className="text-2xl font-bold text-center mb-6">Your Assignment</h3>
          
          <div className="text-center mb-6">
            <div className={`inline-block px-8 py-4 rounded-lg text-2xl font-bold ${
              playerSide === 'pro' ? 'bg-green-600' : 'bg-red-600'
            }`}>
              {getSideIcon(playerSide)} You are arguing: {playerSide.toUpperCase()}
            </div>
          </div>

          <div className="text-center text-gray-300">
            <p className="text-lg mb-4">
              You will be {playerSide === 'pro' ? 'supporting' : 'opposing'} this statement.
            </p>
            <p className="text-sm">
              Your opponent will be arguing the {opponentSide.toUpperCase()} side.
            </p>
          </div>
        </div>

        {/* Prep Instructions */}
        <div className="bg-blue-900 rounded-lg p-6 mb-8">
          <h3 className="text-xl font-bold mb-4">💡 Prep Tips</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-semibold mb-2">For your opening statement:</h4>
              <ul className="space-y-1 text-gray-300">
                <li>• Start with a clear position</li>
                <li>• Present 2-3 main arguments</li>
                <li>• Use evidence or examples</li>
                <li>• Keep it concise (30 seconds)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Think about:</h4>
              <ul className="space-y-1 text-gray-300">
                <li>• Your strongest points</li>
                <li>• Potential counter-arguments</li>
                <li>• Real-world examples</li>
                <li>• Key statistics or facts</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Speaking Order */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-xl font-bold text-center mb-4">📋 Speaking Order</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className={`p-4 rounded-lg ${
              playerRole === 'player_a' ? 'bg-blue-600 border-2 border-blue-400' : 'bg-gray-700'
            }`}>
              <h4 className="font-semibold mb-2">
                Player A {playerRole === 'player_a' ? '(You)' : ''}
              </h4>
              <div className="text-2xl mb-2">🥇</div>
              <div className="text-sm">Speaks First</div>
              <div className="text-sm text-gray-300">30 seconds</div>
            </div>
            
            <div className="p-4 rounded-lg bg-yellow-600">
              <h4 className="font-semibold mb-2">Transition</h4>
              <div className="text-2xl mb-2">⏳</div>
              <div className="text-sm">Brief Pause</div>
              <div className="text-sm text-gray-300">10 seconds</div>
            </div>
            
            <div className={`p-4 rounded-lg ${
              playerRole === 'player_b' ? 'bg-green-600 border-2 border-green-400' : 'bg-gray-700'
            }`}>
              <h4 className="font-semibold mb-2">
                Player B {playerRole === 'player_b' ? '(You)' : ''}
              </h4>
              <div className="text-2xl mb-2">🥈</div>
              <div className="text-sm">Speaks Second</div>
              <div className="text-sm text-gray-300">30 seconds</div>
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="text-center mt-8 text-gray-400">
          <p>Room: {roomId.slice(-8)} | Opening statements will begin automatically</p>
        </div>
      </div>
    </div>
  );
};

export default OpeningPrep;