
import React from 'react';
import { Clock } from 'lucide-react';

interface DebateTimerProps {
  timeRemaining: number;
  phase: string;
}

export const DebateTimer = ({ timeRemaining, phase }: DebateTimerProps) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerColor = () => {
    if (timeRemaining > 15) return 'text-comic-green';
    if (timeRemaining > 5) return 'text-comic-yellow';
    return 'text-comic-red';
  };

  return (
    <div className="flex items-center space-x-2 comic-border bg-white px-4 py-2">
      <Clock className={`h-5 w-5 ${getTimerColor()}`} />
      <div className="text-center">
        <div className={`text-2xl font-bold ${getTimerColor()}`}>
          {formatTime(timeRemaining)}
        </div>
        <div className="text-xs font-bold text-comic-dark uppercase">
          {phase}
        </div>
      </div>
    </div>
  );
};
