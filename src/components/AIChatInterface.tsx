import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, User, Bot, AlertTriangle } from 'lucide-react';
import { chatWithAI } from '../lib/ai';
import { useAuthStore } from '../store/authStore';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

interface AIChatInterfaceProps {
  className?: string;
}

export function AIChatInterface({ className }: AIChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      content: "Hello! I'm your educational assistant. Ask me any questions about your studies or topics you're curious about!",
      sender: 'ai',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuthStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      sender: 'user',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setError('');
    
    try {
      // Prepare chat history for context
      const chatHistory = messages
        .slice(-6) // Only use last 6 messages for context
        .map(msg => `${msg.sender === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
        .join('\n');
      
      const response = await chatWithAI(inputMessage, chatHistory, user?.id);
      
      if (response.error) {
        setError(response.error);
        toast.error('Failed to get a response');
      } else {
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: response.content,
          sender: 'ai',
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, aiMessage]);
      }
    } catch (err) {
      console.error('Error in chat:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      toast.error('Failed to get a response');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-100 flex flex-col h-[600px] hover:shadow-neu transition-all duration-300 ${className}`}>
      <div className="p-4 border-b border-gray-100">
        <h3 className="text-lg font-medium text-gray-900 flex items-center">
          <Bot className="h-5 w-5 text-blue-500 mr-2" />
          Educational AI Assistant
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          Ask me anything about your studies or topics you're interested in learning about
        </p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div 
              key={message.id} 
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <motion.div 
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.sender === 'user' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-100 text-gray-800'
                }`}
                whileHover={{ scale: 1.02 }}
              >
                <div className="flex items-center mb-1">
                  {message.sender === 'user' ? (
                    <>
                      <span className="font-medium">You</span>
                      <User className="h-4 w-4 ml-1" />
                    </>
                  ) : (
                    <>
                      <Bot className="h-4 w-4 mr-1" />
                      <span className="font-medium">AI Assistant</span>
                    </>
                  )}
                </div>
                <p className="whitespace-pre-line">{message.content}</p>
                <p className="text-xs opacity-70 mt-1">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </motion.div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {isLoading && (
          <motion.div 
            className="flex justify-start"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="bg-gray-100 rounded-lg p-3 max-w-[80%]">
              <div className="flex items-center">
                <Bot className="h-4 w-4 mr-1" />
                <span className="font-medium">AI Assistant</span>
              </div>
              <div className="flex items-center mt-2">
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                <span className="ml-2 text-gray-600">Thinking...</span>
              </div>
            </div>
          </motion.div>
        )}
        
        {error && (
          <motion.div 
            className="flex justify-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="bg-red-50 text-red-700 rounded-lg p-3 max-w-[90%] flex items-start">
              <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Error</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          </motion.div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      <div className="p-4 border-t border-gray-100">
        <div className="flex space-x-2">
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            rows={2}
            disabled={isLoading}
          />
          <motion.button
            onClick={handleSendMessage}
            disabled={isLoading || !inputMessage.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 self-end"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </motion.button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Press Enter to send, Shift+Enter for a new line
        </p>
      </div>
    </div>
  );
}