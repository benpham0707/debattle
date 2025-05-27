
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Zap, ArrowLeft, Timer, Shield, Users, Clock, Swords } from 'lucide-react';

interface WaitingRoomProps {
  roomId: string;
  playerName: string;
  onLeaveRoom: () => void;
  onStartDebate?: () => void;
}

export const WaitingRoom = ({ roomId, playerName, onLeaveRoom, onStartDebate }: WaitingRoomProps) => {
  const [isReady, setIsReady] = useState(false);
  const [opponentReady, setOpponentReady] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const [showCountdown, setShowCountdown] = useState(false);

  const battleReadyQuotes = [
    "Time to prove my point!",
    "Logic will be my weapon!",
    "Ready for intellectual combat!",
    "Facts don't lie!",
    "Bring on the debate!"
  ];

  // Simulate opponent joining
  useEffect(() => {
    const timer = setTimeout(() => {
      setOpponentReady(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  // Start countdown when both ready
  useEffect(() => {
    if (isReady && opponentReady && !showCountdown) {
      setShowCountdown(true);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            onStartDebate?.();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isReady, opponentReady, showCountdown, onStartDebate]);

  const handleToggleReady = () => {
    setIsReady(!isReady);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 halftone-bg opacity-30" />
      <div className="absolute inset-0 bg-gradient-to-br from-comic-red/20 via-comic-purple/20 to-comic-blue/20" />
      
      <div className="w-full max-w-6xl space-y-8 animate-fade-in relative z-10">
        {/* Header - Room Code */}
        <div className="text-center">
          <div className="mt-6 bg-comic-dark text-white px-6 py-3 comic-border inline-block transform rotate-1">
            <span className="text-lg font-bold">Room Code: {roomId}</span>
          </div>
        </div>

        {/* Battle Arena Title */}
        <div className="text-center">
          <h1 className="font-bold text-5xl text-comic-dark mb-4 transform -rotate-1 comic-border bg-comic-yellow px-4 py-2 inline-block">
            BATTLE ARENA
          </h1>
        </div>

        {/* Main Battle Arena */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Player 1 Section - Left Side */}
          <Card className="comic-border bg-white p-6 transform -rotate-1 relative overflow-hidden">
            <div 
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: `radial-gradient(circle, #0066FF 1px, transparent 1px)`,
                backgroundSize: '15px 15px',
                backgroundPosition: '0 0'
              }}
            />
            
            <div className="space-y-6 relative z-10">
              <div className="text-center">
                <div className="bg-comic-blue text-white px-4 py-2 comic-border inline-block transform rotate-1 mb-4">
                  <span className="font-bold text-lg">PRO SIDE</span>
                </div>
              </div>

              <div className="text-center space-y-4">
                <div className="relative mx-auto w-fit">
                  <Avatar className="w-24 h-24 mx-auto comic-border bg-comic-blue">
                    <AvatarFallback className="text-white font-bold text-3xl">
                      {playerName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -top-2 -right-2 bg-comic-yellow comic-border rounded-full w-10 h-10 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-comic-dark" />
                  </div>
                </div>
                
                <div>
                  <h3 className="text-2xl font-bold text-comic-dark">{playerName}</h3>
                  <p className="text-comic-dark/70 font-semibold">Defender of Innovation</p>
                </div>
                
                <Badge className={`text-lg px-4 py-2 comic-border ${
                  isReady ? 'bg-comic-green animate-pulse' : 'bg-gray-500'
                }`}>
                  {isReady ? '⚡ READY FOR BATTLE!' : 'Preparing...'}
                </Badge>
                
                {isReady && (
                  <div className="bg-comic-blue/10 text-comic-dark p-4 comic-border rounded-lg">
                    <p className="font-bold text-sm">
                      "{battleReadyQuotes[Math.floor(Math.random() * battleReadyQuotes.length)]}"
                    </p>
                  </div>
                )}
              </div>

              <div className="text-center">
                <Button
                  onClick={handleToggleReady}
                  disabled={showCountdown}
                  className={`font-bold text-lg px-6 py-3 comic-border transform hover:scale-105 transition-transform w-full ${
                    isReady 
                      ? 'bg-comic-green hover:bg-comic-green/80 text-white' 
                      : 'bg-comic-red hover:bg-comic-red/80 text-white'
                  }`}
                >
                  <Zap className="mr-2 h-5 w-5" />
                  {isReady ? 'READY!' : 'GET READY!'}
                </Button>
              </div>
            </div>
          </Card>

          {/* Center VS Section */}
          <div className="flex flex-col items-center space-y-6">
            {/* VS Circle */}
            <div className="relative">
              <div className="w-32 h-32 bg-comic-orange comic-border rounded-full flex items-center justify-center transform rotate-12 animate-bounce">
                <span className="text-4xl font-bold text-white">VS</span>
              </div>
              <Swords className="absolute -top-4 -right-4 w-10 h-10 text-comic-red animate-pulse" />
            </div>
            
            {/* Countdown */}
            {showCountdown && (
              <div className="bg-comic-red text-white px-6 py-4 comic-border text-3xl font-bold animate-pulse rounded-lg transform -rotate-2">
                <Timer className="inline mr-2" />
                {countdown}
              </div>
            )}

            {/* Status */}
            <div className="bg-comic-purple/20 comic-border p-4 transform rotate-1 rounded-lg max-w-sm">
              <p className="text-comic-dark font-bold text-center">
                {!opponentReady ? 'Waiting for opponent...' : 
                 !isReady ? 'Click "GET READY" to start!' :
                 !showCountdown ? 'Both players ready!' :
                 'Battle starting!'}
              </p>
            </div>

            {/* Progress Bar */}
            {!opponentReady && (
              <div className="w-full max-w-sm bg-comic-dark/20 rounded-full h-4 comic-border overflow-hidden">
                <div className="h-full bg-gradient-to-r from-comic-red to-comic-purple animate-pulse w-3/4" />
              </div>
            )}
          </div>

          {/* Player 2 Section - Right Side */}
          <Card className="comic-border bg-white p-6 transform rotate-1 relative overflow-hidden">
            <div 
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: `radial-gradient(circle, #FF1744 1px, transparent 1px)`,
                backgroundSize: '15px 15px',
                backgroundPosition: '0 0'
              }}
            />
            
            <div className="space-y-6 relative z-10">
              <div className="text-center">
                <div className="bg-comic-red text-white px-4 py-2 comic-border inline-block transform -rotate-1 mb-4">
                  <span className="font-bold text-lg">CON SIDE</span>
                </div>
              </div>

              <div className="text-center space-y-4">
                <div className="relative mx-auto w-fit">
                  <Avatar className="w-24 h-24 mx-auto comic-border bg-comic-red">
                    <AvatarFallback className="text-white font-bold text-3xl">
                      {opponentReady ? 'O' : '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -top-2 -right-2 bg-comic-yellow comic-border rounded-full w-10 h-10 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-comic-dark" />
                  </div>
                </div>
                
                <div>
                  <h3 className="text-2xl font-bold text-comic-dark">
                    {opponentReady ? 'Opponent' : 'Finding opponent...'}
                  </h3>
                  <p className="text-comic-dark/70 font-semibold">
                    {opponentReady ? 'Challenger of Change' : 'Searching...'}
                  </p>
                </div>
                
                <Badge className={`text-lg px-4 py-2 comic-border ${
                  opponentReady ? 'bg-comic-green animate-pulse' : 'bg-gray-500'
                }`}>
                  {opponentReady ? '⚡ READY FOR BATTLE!' : 'Joining...'}
                </Badge>
                
                {opponentReady && (
                  <div className="bg-comic-red/10 text-comic-dark p-4 comic-border rounded-lg">
                    <p className="font-bold text-sm">
                      "{battleReadyQuotes[Math.floor(Math.random() * battleReadyQuotes.length)]}"
                    </p>
                  </div>
                )}
              </div>

              <div className="text-center">
                <div className="bg-gray-200 text-gray-500 font-bold text-lg px-6 py-3 comic-border rounded w-full flex items-center justify-center">
                  <Users className="mr-2 h-5 w-5" />
                  {opponentReady ? 'OPPONENT READY' : 'WAITING...'}
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Action Button */}
        <div className="text-center">
          <Button
            onClick={onLeaveRoom}
            className="bg-gray-600 hover:bg-gray-700 text-white font-bold text-lg px-8 py-4 comic-border transform hover:scale-105 transition-transform"
          >
            <ArrowLeft className="mr-2 h-5 w-5" />
            LEAVE ARENA
          </Button>
        </div>
      </div>
    </div>
  );
};
