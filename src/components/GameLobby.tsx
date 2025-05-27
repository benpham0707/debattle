import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Copy, ArrowLeft, Users, Clock, Target } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface GameLobbyProps {
  roomId: string;
  playerName: string;
  onStartDebate: () => void;
  onBack: () => void;
}

const DEBATE_TOPICS = [
  "Should AI be heavily regulated by governments?",
  "Is social media more harmful than beneficial to society?",
  "Should universal basic income be implemented globally?",
  "Is remote work better than in-person work?",
  "Should video games be considered a sport?",
  "Is privacy more important than security?",
  "Should college education be free for everyone?",
  "Is climate change action more important than economic growth?"
];

export const GameLobby = ({ roomId, playerName, onStartDebate, onBack }: GameLobbyProps) => {
  const [selectedTopic, setSelectedTopic] = useState(DEBATE_TOPICS[0]);
  const [preferredSide, setPreferredSide] = useState<'pro' | 'con' | null>(null);
  const [connectedPlayers] = useState([playerName]); // Simulated for now
  const { toast } = useToast();

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    toast({
      title: "Room ID Copied!",
      description: "Share this code with your opponent",
    });
  };

  const handleTopicSelect = () => {
    const randomTopic = DEBATE_TOPICS[Math.floor(Math.random() * DEBATE_TOPICS.length)];
    setSelectedTopic(randomTopic);
    toast({
      title: "New Topic Selected!",
      description: randomTopic,
    });
  };

  const canStartDebate = connectedPlayers.length >= 2 && preferredSide !== null;

  return (
    <div className="min-h-screen p-4 relative">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button 
            onClick={onBack}
            className="comic-border bg-white hover:bg-gray-50"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          
          <div className="text-center relative">
            <h1 className="font-bold text-4xl text-comic-dark mb-2">BATTLE LOBBY</h1>
            <div className="flex items-center justify-center space-x-2">
              <Badge className="bg-comic-blue text-white font-bold text-lg px-4 py-2">
                ROOM: {roomId}
              </Badge>
              <Button
                onClick={copyRoomId}
                className="comic-border"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="w-20" /> {/* Spacer */}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Players Panel */}
          <Card className="comic-border bg-white p-6 transform -rotate-1 relative">
            <div className="flex items-center mb-4">
              <Users className="h-6 w-6 text-comic-blue mr-2" />
              <h2 className="text-2xl font-bold text-comic-dark">COMBATANTS</h2>
            </div>
            
            <div className="space-y-3">
              {connectedPlayers.map((player, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-comic-yellow comic-border">
                  <span className="font-bold text-comic-dark">{player}</span>
                  <Badge className="bg-comic-green text-white">READY</Badge>
                </div>
              ))}
              
              {connectedPlayers.length < 2 && (
                <div className="p-3 bg-gray-200 comic-border border-dashed">
                  <span className="text-gray-500 font-bold">Waiting for opponent...</span>
                </div>
              )}
            </div>

            <div className="mt-4 p-3 bg-comic-pink/20 comic-border">
              <p className="text-sm text-comic-dark font-bold text-center">
                Share room code <span className="bg-comic-yellow px-2 py-1">{roomId}</span> with your opponent!
              </p>
            </div>
          </Card>

          {/* Topic & Settings Panel */}
          <Card className="comic-border bg-white p-6 transform rotate-1 relative">
            <div className="flex items-center mb-4">
              <Target className="h-6 w-6 text-comic-red mr-2" />
              <h2 className="text-2xl font-bold text-comic-dark">BATTLE TOPIC</h2>
            </div>

            <div className="space-y-4">
              <div className="speech-bubble">
                <p className="font-bold text-comic-dark text-lg">{selectedTopic}</p>
              </div>

              <Button
                onClick={handleTopicSelect}
                className="w-full bg-comic-purple hover:bg-comic-purple/80 text-white font-bold comic-border"
              >
                RANDOMIZE TOPIC
              </Button>

              <div className="space-y-3">
                <h3 className="font-bold text-comic-dark">Choose Your Side:</h3>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={() => setPreferredSide('pro')}
                    className={`font-bold comic-border ${preferredSide === 'pro' ? 'bg-comic-green text-white' : 'bg-white text-comic-dark'}`}
                  >
                    PRO SIDE
                  </Button>
                  <Button
                    onClick={() => setPreferredSide('con')}
                    className={`font-bold comic-border ${preferredSide === 'con' ? 'bg-comic-red text-white' : 'bg-white text-comic-dark'}`}
                  >
                    CON SIDE
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Game Rules */}
        <Card className="comic-border bg-comic-yellow/20 p-6 relative">
          <h3 className="text-xl font-bold text-comic-dark mb-4 flex items-center">
            <Clock className="mr-2 h-5 w-5" />
            BATTLE RULES
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-bold text-comic-dark">📝 Opening Statements: 1 min (30s each)</p>
              <p className="font-bold text-comic-dark">🔄 Rebuttals: 1 min (30s each)</p>
              <p className="font-bold text-comic-dark">⚡ Crossfire: 1.5 min (rapid Q&A)</p>
            </div>
            <div>
              <p className="font-bold text-comic-dark">🎯 Final Arguments: 1 min (30s each)</p>
              <p className="font-bold text-comic-dark">❤️ Health: 100 HP each player</p>
              <p className="font-bold text-comic-dark">🤖 AI judges performance each round</p>
            </div>
          </div>
        </Card>

        {/* Start Button */}
        <div className="text-center relative">
          <Button
            onClick={onStartDebate}
            disabled={!canStartDebate}
            className="bg-comic-red hover:bg-comic-red/80 text-white font-bold text-2xl px-8 py-4 comic-border transform hover:scale-105 transition-transform animate-pulse-glow"
          >
            START BATTLE!
          </Button>
          {!canStartDebate && (
            <p className="text-comic-dark font-bold mt-2">
              {connectedPlayers.length < 2 
                ? "Waiting for opponent..." 
                : "Choose your side to begin!"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
