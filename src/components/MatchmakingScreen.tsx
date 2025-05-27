
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, Swords, Users, ArrowLeft } from 'lucide-react';

interface MatchmakingScreenProps {
  playerName: string;
  onMatchFound: (roomId: string) => void;
  onCancel: () => void;
}

export const MatchmakingScreen = ({ playerName, onMatchFound, onCancel }: MatchmakingScreenProps) => {
  const [searchTime, setSearchTime] = useState(0);
  const [dots, setDots] = useState('');

  useEffect(() => {
    const timer = setInterval(() => {
      setSearchTime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const dotTimer = setInterval(() => {
      setDots(prev => {
        if (prev === '...') return '';
        return prev + '.';
      });
    }, 500);

    return () => clearInterval(dotTimer);
  }, []);

  // Simulate finding a match after some time (for demo purposes)
  useEffect(() => {
    const matchTimer = setTimeout(() => {
      const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
      onMatchFound(roomId);
    }, Math.random() * 8000 + 5000); // 5-13 seconds

    return () => clearTimeout(matchTimer);
  }, [onMatchFound]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 halftone-bg opacity-30" />
      <div className="absolute inset-0 bg-gradient-to-br from-comic-red/20 via-comic-purple/20 to-comic-blue/20" />
      
      {/* Floating Elements */}
      <div className="absolute top-20 left-10 animate-bounce">
        <Swords className="h-8 w-8 text-comic-red opacity-60" />
      </div>
      <div className="absolute bottom-32 right-16 animate-bounce delay-1000">
        <Users className="h-6 w-6 text-comic-blue opacity-60" />
      </div>
      
      <div className="w-full max-w-md space-y-8 animate-fade-in relative z-10">
        {/* Header */}
        <div className="text-center">
          <h1 className="font-bold text-5xl text-comic-dark mb-4 transform -rotate-1 comic-border bg-comic-yellow px-4 py-2 inline-block">
            FINDING MATCH
          </h1>
          <p className="text-lg text-comic-dark font-bold">
            Searching for worthy opponent{dots}
          </p>
        </div>

        {/* Main Matchmaking Card */}
        <Card className="comic-border bg-white p-8 transform rotate-1 relative overflow-hidden">
          {/* Halftone overlay on card */}
          <div 
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `radial-gradient(circle, #FF1744 1px, transparent 1px)`,
              backgroundSize: '15px 15px',
              backgroundPosition: '0 0'
            }}
          />
          
          <div className="space-y-6 relative z-10">
            {/* Player Info */}
            <div className="text-center">
              <div className="bg-comic-blue comic-border px-4 py-2 inline-block transform -rotate-1 mb-4">
                <span className="text-white font-bold text-lg">{playerName}</span>
              </div>
            </div>

            {/* Loading Animation */}
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <Loader2 className="h-16 w-16 text-comic-red animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Swords className="h-8 w-8 text-comic-dark" />
                </div>
              </div>
              
              <div className="text-center">
                <p className="text-comic-dark font-bold text-xl">
                  SEARCHING FOR BATTLE
                </p>
                <p className="text-comic-dark/70 font-semibold">
                  Time: {formatTime(searchTime)}
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-comic-dark/20 rounded-full h-3 comic-border overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-comic-red to-comic-purple animate-pulse"
                style={{
                  width: `${Math.min(100, (searchTime / 10) * 100)}%`,
                  transition: 'width 1s ease-out'
                }}
              />
            </div>

            {/* Tips */}
            <div className="bg-comic-yellow/20 comic-border p-4 transform -rotate-1">
              <p className="text-comic-dark font-bold text-sm text-center">
                💡 TIP: Prepare your strongest arguments while we find your opponent!
              </p>
            </div>
          </div>
        </Card>

        {/* Cancel Button */}
        <div className="text-center">
          <Button
            onClick={onCancel}
            className="bg-comic-dark hover:bg-comic-dark/80 text-white font-bold py-3 px-6 comic-border transform hover:scale-105 transition-transform"
          >
            <ArrowLeft className="mr-2 h-5 w-5" />
            CANCEL SEARCH
          </Button>
        </div>
      </div>
    </div>
  );
};
