
import React, { useState } from 'react';
import { WelcomeScreen } from '@/components/WelcomeScreen';
import { GameLobby } from '@/components/GameLobby';
import { DebateRoom } from '@/components/DebateRoom';
import { WaitingRoom } from '@/components/WaitingRoom';
import { MatchmakingScreen } from '@/components/MatchmakingScreen';
import { NewsDropdown } from '@/components/NewsDropdown';
import { DirectoryDropdown } from '@/components/DirectoryDropdown';

export type GameState = 'welcome' | 'matchmaking' | 'lobby' | 'waiting' | 'debate';

const Index = () => {
  const [gameState, setGameState] = useState<GameState>('welcome');
  const [roomId, setRoomId] = useState<string>('');
  const [playerName, setPlayerName] = useState<string>('');

  const handleJoinMatchmaking = (room: string, name: string) => {
    setPlayerName(name);
    setGameState('matchmaking');
  };

  const handleMatchFound = (foundRoomId: string) => {
    setRoomId(foundRoomId);
    // Go directly to debate room instead of lobby
    setGameState('debate');
  };

  const handleJoinPrivateRoom = (room: string, name: string) => {
    setRoomId(room);
    setPlayerName(name);
    setGameState('waiting');
  };

  const handleStartDebate = () => {
    setGameState('debate');
  };

  const handleBackToWelcome = () => {
    setGameState('welcome');
    setRoomId('');
    setPlayerName('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-comic-red via-comic-purple to-comic-blue relative overflow-hidden">
      {/* Enhanced background with multiple layers */}
      <div className="absolute inset-0 bg-gradient-to-tr from-comic-yellow/20 via-transparent to-comic-pink/20" />
      <div className="absolute inset-0 halftone-bg opacity-30" />
      
      {/* Header with dropdowns */}
      <div className="absolute top-4 left-0 right-0 z-50 flex justify-between items-start px-6">
        <div className="relative">
          <NewsDropdown />
        </div>
        <div className="relative">
          <DirectoryDropdown playerName={playerName} />
        </div>
      </div>

      <div className="min-h-screen relative z-10 pt-16">
        {gameState === 'welcome' && (
          <WelcomeScreen 
            onJoinRoom={handleJoinMatchmaking}
            onJoinPrivateRoom={handleJoinPrivateRoom}
          />
        )}

        {gameState === 'matchmaking' && (
          <MatchmakingScreen
            playerName={playerName}
            onMatchFound={handleMatchFound}
            onCancel={handleBackToWelcome}
          />
        )}
        
        {gameState === 'lobby' && (
          <GameLobby 
            roomId={roomId}
            playerName={playerName}
            onStartDebate={handleStartDebate}
            onBack={handleBackToWelcome}
          />
        )}

        {gameState === 'waiting' && (
          <WaitingRoom 
            roomId={roomId}
            playerName={playerName}
            onLeaveRoom={handleBackToWelcome}
            onStartDebate={handleStartDebate}
          />
        )}
        
        {gameState === 'debate' && (
          <DebateRoom 
            roomId={roomId}
            playerName={playerName}
            onBack={handleBackToWelcome}
          />
        )}
      </div>
    </div>
  );
};

export default Index;
