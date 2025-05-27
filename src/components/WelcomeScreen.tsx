
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Gamepad2, Users, Zap, Swords } from 'lucide-react';

interface WelcomeScreenProps {
  onJoinRoom: (roomId: string, playerName: string) => void;
  onJoinPrivateRoom?: (roomId: string, playerName: string) => void;
}

export const WelcomeScreen = ({ onJoinRoom, onJoinPrivateRoom }: WelcomeScreenProps) => {
  const [playerName, setPlayerName] = useState('');
  const [roomId, setRoomId] = useState('');

  const generateRoomId = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleJoinMatchmaking = () => {
    if (!playerName.trim()) return;
    // For now, simulate matchmaking by creating a room
    const newRoomId = generateRoomId();
    onJoinRoom(newRoomId, playerName);
  };

  const handleCreateRoom = () => {
    if (!playerName.trim()) return;
    const newRoomId = generateRoomId();
    if (onJoinPrivateRoom) {
      onJoinPrivateRoom(newRoomId, playerName);
    }
  };

  const handleJoinPrivateRoomClick = () => {
    if (!playerName.trim() || !roomId.trim()) return;
    if (onJoinPrivateRoom) {
      onJoinPrivateRoom(roomId.toUpperCase(), playerName);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 animate-fade-in-up">
        {/* Title */}
        <div className="text-center">
          <h1 className="font-bold text-6xl text-comic-dark mb-4 transform -rotate-2 comic-border bg-comic-yellow px-4 py-2 inline-block">
            DeBATTLE
          </h1>
          <p className="text-xl text-comic-dark font-bold">
            AI-Judged Real-Time Debate Arena
          </p>
        </div>

        {/* Main Card */}
        <Card className="comic-border bg-white p-6 transform rotate-1">
          <div className="space-y-6">
            {/* Player Name Input */}
            <div className="space-y-3">
              <label className="text-lg font-bold text-comic-dark">
                Enter Your Battle Name
              </label>
              <Input
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Your Battle Name..."
                className="comic-border font-bold text-lg"
                maxLength={20}
              />
            </div>

            {/* Main Matchmaking Button */}
            <Button
              onClick={handleJoinMatchmaking}
              disabled={!playerName.trim()}
              className="w-full bg-comic-red hover:bg-comic-red/80 text-white font-bold text-xl py-4 comic-border transform hover:scale-105 transition-transform"
            >
              <Swords className="mr-2 h-6 w-6" />
              JOIN DEBATTLE
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t-2 border-comic-dark" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-2 text-comic-dark font-bold">OR</span>
              </div>
            </div>

            {/* Private Room Options */}
            <div className="space-y-3">
              <div className="space-y-2">
                <Input
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                  placeholder="ROOM CODE"
                  className="comic-border font-bold text-lg text-center"
                  maxLength={6}
                />
                <Button
                  onClick={handleJoinPrivateRoomClick}
                  disabled={!playerName.trim() || !roomId.trim()}
                  className="w-full bg-comic-purple hover:bg-comic-purple/80 text-white font-bold text-lg py-3 comic-border transform hover:scale-105 transition-transform"
                >
                  <Users className="mr-2 h-5 w-5" />
                  JOIN PRIVATE ROOM
                </Button>
                
                <Button
                  onClick={handleCreateRoom}
                  disabled={!playerName.trim()}
                  className="w-full bg-comic-blue hover:bg-comic-blue/80 text-white font-bold text-lg py-3 comic-border transform hover:scale-105 transition-transform"
                >
                  <Gamepad2 className="mr-2 h-5 w-5" />
                  CREATE PRIVATE ROOM
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 gap-4 text-center">
          <div className="bg-comic-yellow comic-border p-4 transform -rotate-1">
            <Zap className="mx-auto h-8 w-8 text-comic-dark mb-2" />
            <h3 className="font-bold text-comic-dark">AI-Powered Judging</h3>
            <p className="text-sm text-comic-dark">GPT-4 scores your arguments in real-time</p>
          </div>
          
          <div className="bg-comic-green comic-border p-4 transform rotate-1">
            <Users className="mx-auto h-8 w-8 text-comic-dark mb-2" />
            <h3 className="font-bold text-comic-dark">Health-Based Combat</h3>
            <p className="text-sm text-comic-dark">Lose HP based on debate performance</p>
          </div>
        </div>
      </div>
    </div>
  );
};
