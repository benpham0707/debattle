import React, { useState, useEffect, useRef } from 'react';
import { Message } from '@/lib/supabase';
import { roomService } from '@/lib/roomService';

interface ChatInterfaceProps {
  roomId: string;
  playerRole: 'player_a' | 'player_b' | 'spectator';
  playerSide: 'pro' | 'con' | null;
  currentPhase: string;
  isMyTurn: boolean;
  timeLeft: number;
  disabled?: boolean;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  roomId,
  playerRole,
  playerSide,
  currentPhase,
  isMyTurn,
  timeLeft,
  disabled = false
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focus input when it's player's turn
  useEffect(() => {
    if (isMyTurn && !disabled && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isMyTurn, disabled]);

  // Load initial messages and subscribe to new ones
  useEffect(() => {
    const loadMessages = async () => {
      try {
        const roomMessages = await roomService.getMessages(roomId);
        setMessages(roomMessages);
      } catch (error) {
        console.error('Error loading messages:', error);
      }
    };

    loadMessages();

    // Subscribe to new messages
    const subscription = roomService.subscribeToMessages(roomId, (newMessage) => {
      setMessages(prev => [...prev, newMessage]);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [roomId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || isSending || !playerSide || disabled || playerRole === 'spectator') return;

    try {
      setIsSending(true);
      
      // At this point, we know playerRole is not 'spectator' due to the early return above
      await roomService.sendMessage(
        roomId,
        newMessage.trim(),
        currentPhase,
        playerSide,
        playerRole as 'player_a' | 'player_b'
      );
      
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      // You might want to show an error toast here
    } finally {
      setIsSending(false);
    }
  };

  const getMessageSenderLabel = (message: Message) => {
    // Determine if this message is from the current player
    const isFromCurrentPlayer = message.user_id === roomService.getSessionId();
    
    if (isFromCurrentPlayer) {
      return 'You';
    }
    
    // Determine which player sent it based on the side
    return message.player_side === 'pro' ? 'Pro Player' : 'Con Player';
  };

  const getMessageTimeString = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getPhaseLabel = (phase: string) => {
    const labels: { [key: string]: string } = {
      'opening': 'Opening',
      'rebuttal': 'Rebuttal',
      'crossfire': 'Crossfire',
      'final': 'Final Argument'
    };
    return labels[phase] || phase;
  };

  const getCharacterLimit = () => {
    const limits: { [key: string]: number } = {
      'opening': 500,
      'rebuttal': 300,
      'crossfire': 150,
      'final': 400
    };
    return limits[currentPhase] || 200;
  };

  const characterLimit = getCharacterLimit();
  const isOverLimit = newMessage.length > characterLimit;

  const getTurnStatus = () => {
    if (disabled) return 'Phase not active';
    if (playerRole === 'spectator') return 'You are spectating';
    if (!playerSide) return 'Side not assigned';
    if (isMyTurn) return `Your turn - ${timeLeft}s remaining`;
    return 'Opponent\'s turn';
  };

  const canSendMessage = () => {
    return !disabled && 
           playerRole !== 'spectator' && 
           playerSide && 
           isMyTurn && 
           newMessage.trim() && 
           !isOverLimit && 
           !isSending;
  };

  return (
    <div className="flex flex-col h-full bg-gray-800 rounded-lg">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">💬 Debate Chat</h3>
          <div className="text-sm text-gray-400">
            {getPhaseLabel(currentPhase)} Phase
          </div>
        </div>
        
        {/* Turn Status */}
        <div className={`mt-2 text-sm px-3 py-1 rounded-full text-center ${
          isMyTurn && !disabled ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300'
        }`}>
          {getTurnStatus()}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <div className="text-4xl mb-2">💭</div>
            <p>No messages yet. Start the debate!</p>
          </div>
        ) : (
          messages.map((message) => {
            const isFromCurrentPlayer = message.user_id === roomService.getSessionId();
            
            return (
              <div
                key={message.id}
                className={`flex ${isFromCurrentPlayer ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    isFromCurrentPlayer
                      ? 'bg-blue-600 text-white'
                      : message.player_side === 'pro'
                      ? 'bg-green-700 text-white'
                      : 'bg-red-700 text-white'
                  }`}
                >
                  {/* Message Header */}
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-semibold">
                      {getMessageSenderLabel(message)}
                      {message.player_side && (
                        <span className="ml-1 opacity-75">
                          ({message.player_side.toUpperCase()})
                        </span>
                      )}
                    </span>
                    <span className="text-xs opacity-75">
                      {getMessageTimeString(message.created_at)}
                    </span>
                  </div>
                  
                  {/* Message Content */}
                  <p className="text-sm break-words">{message.content}</p>
                  
                  {/* Phase Badge */}
                  {message.phase && (
                    <div className="mt-1">
                      <span className="text-xs bg-black bg-opacity-20 px-2 py-1 rounded">
                        {getPhaseLabel(message.phase)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-gray-700">
        <form onSubmit={handleSendMessage} className="space-y-2">
          {/* Character Counter */}
          <div className="flex justify-between text-xs text-gray-400">
            <span>
              {playerSide && `Arguing ${playerSide.toUpperCase()}`}
            </span>
            <span className={isOverLimit ? 'text-red-400' : ''}>
              {newMessage.length}/{characterLimit}
            </span>
          </div>
          
          {/* Input Field */}
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={
                disabled
                  ? 'Chat not available in this phase'
                  : !isMyTurn
                  ? 'Wait for your turn...'
                  : `Make your ${currentPhase} argument...`
              }
              className={`flex-1 input-field ${
                isOverLimit ? 'border-red-500' : ''
              }`}
              disabled={!canSendMessage()}
              maxLength={characterLimit + 50} // Allow typing over limit to show warning
            />
            <button
              type="submit"
              disabled={!canSendMessage()}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                canSendMessage()
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
            >
              {isSending ? '⏳' : '📤'}
            </button>
          </div>
          
          {/* Helper Text */}
          {isMyTurn && !disabled && (
            <div className="text-xs text-gray-500">
              💡 Tip: Be clear, concise, and persuasive. You have {timeLeft} seconds remaining.
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default ChatInterface;