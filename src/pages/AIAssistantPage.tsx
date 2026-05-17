import React from 'react';
import { AIChatInterface } from '../components/AIChatInterface';
import { Brain } from 'lucide-react';
import { motion } from 'framer-motion';

export function AIAssistantPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <motion.div 
        className="mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Brain className="h-8 w-8 text-blue-500 mr-3" />
          AI Learning Assistant
        </h1>
        <p className="mt-2 text-gray-600">
          Get help with your educational questions and explore new concepts with our AI assistant.
        </p>
      </motion.div>

      <motion.div 
        className="w-full"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <AIChatInterface />
      </motion.div>
    </div>
  );
}