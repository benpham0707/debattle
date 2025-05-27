import React, { useState, useEffect, useRef } from 'react';
import { Message } from '@/lib/supabase';
import { roomService } from '@/lib/roomService';
import { roleManager } from '@/lib/roleManager';

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
    
    if (!newMessage.trim() || isSending || !playerSide || disabled || playerRole === 'spectator') {
      return;
    }

    try {
      setIsSending(true);
      
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
    } finally {
      setIsSending(false);
    }
  };

  const isMyMessage = (message: Message) => {
    const currentSessionId = roleManager.getSessionId();
    return message.user_id === currentSessionId;
  };

  const getMessageTimeString = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getCharacterLimit = () => {
    const limits: { [key: string]: number } = {
      'opening': 500,
      'rebuttal': 300,
      'crossfire': 150,
      'final': 400
    };
    return limits[currentPhase] || 300;
  };

  const characterLimit = getCharacterLimit();
  const isOverLimit = newMessage.length > characterLimit;

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
    <div className="flex flex-col h-full bg-gray-900 rounded-lg border border-gray-700">
      {/* Header with turn indicator */}
      <div className="p-4 border-b border-gray-700 bg-gray-800 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-lg font-semibold">🗣️ Debate Arena</div>
            <div className="text-sm text-gray-400 capitalize">
              {currentPhase} Phase
            </div>
          </div>
          
          {/* Turn Timer */}
          <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
            isMyTurn && !disabled 
              ? 'bg-green-600 text-white animate-pulse' 
              : 'bg-gray-600 text-gray-300'
          }`}>
            {isMyTurn && !disabled ? `Your turn - ${timeLeft}s` : 'Opponent\'s turn'}
          </div>
        </div>
      </div>

      {/* Messages Area - DM Style */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-900">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <div className="text-6xl mb-4">⚔️</div>
            <h3 className="text-xl font-semibold mb-2">Ready to Debate?</h3>
            <p className="text-center">
              Make your arguments and counter your opponent.<br/>
              Messages will appear here in real-time.
            </p>
          </div>
        ) : (
          <>
            {messages.map((message, index) => {
              const isFromMe = isMyMessage(message);
              const isPro = message.player_side === 'pro';
              
              return (
                <div
                  key={message.id}
                  className={`flex ${isFromMe ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-lg ${isFromMe ? 'order-2' : 'order-1'}`}>
                    {/* Message bubble */}
                    <div
                      className={`px-4 py-3 rounded-2xl shadow-lg ${
                        isFromMe
                          ? playerSide === 'pro' 
                            ? 'bg-green-600 text-white' 
                            : 'bg-red-600 text-white'
                          : isPro
                          ? 'bg-green-500 text-white'
                          : 'bg-red-500 text-white'
                      }`}
                    >
                      <p className="text-sm leading-relaxed">{message.content}</p>
                    </div>
                    
                    {/* Timestamp and side label */}
                    <div className={`flex items-center gap-2 mt-1 text-xs text-gray-500 ${
                      isFromMe ? 'justify-end' : 'justify-start'
                    }`}>
                      <span>{getMessageTimeString(message.created_at)}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        isPro ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
                      }`}>
                        {isPro ? 'PRO' : 'CON'}
                      </span>
                      {isFromMe && <span>You</span>}
                    </div>
                  </div>
                  
                  {/* Avatar */}
                  <div className={`flex-shrink-0 ${isFromMe ? 'order-1 mr-3' : 'order-2 ml-3'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                      isPro ? 'bg-green-600' : 'bg-red-600'
                    }`}>
                      {isPro ? '✅' : '❌'}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-gray-700 bg-gray-800 rounded-b-lg">
        {/* Character counter */}
        <div className="flex justify-between items-center mb-2 text-xs">
          <span className="text-gray-400">
            {playerSide && (
              <span className={`px-2 py-1 rounded-full font-semibold ${
                playerSide === 'pro' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
              }`}>
                Arguing {playerSide.toUpperCase()}
              </span>
            )}
          </span>
          <span className={`font-mono ${isOverLimit ? 'text-red-400' : 'text-gray-400'}`}>
            {newMessage.length}/{characterLimit}
          </span>
        </div>

        <form onSubmit={handleSendMessage} className="flex gap-3">
          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={
              disabled
                ? 'Phase not active...'
                : !isMyTurn
                ? 'Wait for your turn...'
                : `Type your ${currentPhase} argument...`
            }
            className={`flex-1 px-4 py-3 bg-gray-700 text-white rounded-full border-2 transition-all ${
              isOverLimit 
                ? 'border-red-500' 
                : isMyTurn && !disabled
                ? 'border-blue-500 focus:border-blue-400' 
                : 'border-gray-600'
            } focus:outline-none`}
            disabled={disabled || playerRole === 'spectator' || !playerSide || !isMyTurn}
            maxLength={characterLimit + 50}
          />
          
          <button
            type="submit"
            disabled={!canSendMessage()}
            className={`px-6 py-3 rounded-full font-semibold transition-all ${
              canSendMessage()
                ? playerSide === 'pro'
                  ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg'
                  : 'bg-red-600 hover:bg-red-700 text-white shadow-lg'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isSending ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Sending</span>
              </div>
            ) : (
              'Send'
            )}
          </button>
        </form>

        {/* Helpful tip */}
        {isMyTurn && !disabled && (
          <div className="mt-2 text-xs text-gray-500 text-center">
            💡 Be persuasive and clear. You have {timeLeft} seconds to make your point.
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatInterface;