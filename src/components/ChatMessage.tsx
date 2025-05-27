
import React from 'react';

interface Message {
  id: string;
  player: string;
  content: string;
  timestamp: Date;
  phase: string;
}

interface ChatMessageProps {
  message: Message;
  isOwn: boolean;
}

export const ChatMessage = ({ message, isOwn }: ChatMessageProps) => {
  const getBubbleStyle = () => {
    if (isOwn) {
      return 'speech-bubble bg-comic-blue text-white ml-8';
    }
    return 'speech-bubble bg-white text-comic-dark mr-8';
  };

  const getPlayerColor = () => {
    return isOwn ? 'text-comic-blue' : 'text-comic-red';
  };

  return (
    <div className={`${isOwn ? 'text-right' : 'text-left'} animate-slide-in-${isOwn ? 'right' : 'left'}`}>
      <div className={`inline-block max-w-xs ${getBubbleStyle()}`}>
        <div className="flex items-center justify-between mb-1">
          <span className={`text-xs font-bold ${getPlayerColor()}`}>
            {message.player}
          </span>
          <span className="text-xs opacity-75">
            {message.timestamp.toLocaleTimeString()}
          </span>
        </div>
        <p className="font-bold">{message.content}</p>
        <div className="text-xs opacity-75 mt-1">
          {message.phase.toUpperCase()} PHASE
        </div>
      </div>
    </div>
  );
};
