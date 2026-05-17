import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calculator, BookOpen, Atom, Globe, Clock, Trophy, Star, Medal, ArrowRight, Timer, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { subjects, quizQuestions, memoryCards } from '../lib/gameContent';
import { toast } from 'sonner';

interface Game {
  id: string;
  title: string;
  description: string;
  type: 'math' | 'quiz' | 'memory' | 'sequence';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  reward: number;
  topics: string[];
  timeLimit: number;
}

interface GameState {
  score: number;
  timeLeft: number;
  currentQuestion: number;
  answers: number[];
  matchedPairs: number;
  flippedCards: number[];
}

// Gamepad icon component since it's not in lucide-react
export function Gamepad2({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      className={className} 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <line x1="6" y1="12" x2="10" y2="12"></line>
      <line x1="8" y1="10" x2="8" y2="14"></line>
      <line x1="15" y1="13" x2="15.01" y2="13"></line>
      <line x1="18" y1="11" x2="18.01" y2="11"></line>
      <rect x="2" y="6" width="20" height="12" rx="2"></rect>
    </svg>
  );
}

export function Games() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    timeLeft: 0,
    currentQuestion: 0,
    answers: [],
    matchedPairs: 0,
    flippedCards: []
  });

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (selectedGame && gameState.timeLeft > 0) {
      timer = setInterval(() => {
        setGameState(prev => ({
          ...prev,
          timeLeft: prev.timeLeft - 1
        }));
      }, 1000);
    } else if (gameState.timeLeft === 0 && selectedGame) {
      endGame();
    }
    return () => clearInterval(timer);
  }, [selectedGame, gameState.timeLeft]);

  const startGame = (game: Game) => {
    setSelectedGame(game);
    setGameState({
      score: 0,
      timeLeft: game.timeLimit,
      currentQuestion: 0,
      answers: [],
      matchedPairs: 0,
      flippedCards: []
    });
  };

  const endGame = async () => {
    if (!selectedGame || !user?.id) return;

    try {
      // Calculate final score and rewards
      const timeBonus = Math.floor(gameState.timeLeft / 10);
      const finalScore = gameState.score + timeBonus;
      const satsEarned = Math.floor(selectedGame.reward * (finalScore / 100));

      // Record progress
      await supabase.from('student_progress').upsert({
        student_id: user.id,
        content_id: selectedGame.id,
        completed: true,
        quiz_score: finalScore,
        rewards_claimed: true,
        last_played: new Date().toISOString()
      });

      // Award sats
      await supabase.from('awards').insert({
        student_id: user.id,
        sats: satsEarned,
        reason: `Completed ${selectedGame.title} with score: ${finalScore}`
      });

      toast.success(`Game completed! Earned ${satsEarned} sats!`);
      queryClient.invalidateQueries({ queryKey: ['student-balance'] });
    } catch (error) {
      console.error('Error recording game progress:', error);
      toast.error('Failed to save game progress');
    } finally {
      setSelectedGame(null);
      setGameState({
        score: 0,
        timeLeft: 0,
        currentQuestion: 0,
        answers: [],
        matchedPairs: 0,
        flippedCards: []
      });
    }
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const renderGameContent = () => {
    if (!selectedGame) return null;

    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900">{selectedGame.title}</h3>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500">Score: {gameState.score}</span>
            <span className="flex items-center text-sm text-gray-500">
              <Timer className="h-4 w-4 mr-1" />
              {formatTime(gameState.timeLeft)}
            </span>
            <span className="text-sm text-orange-500">{selectedGame.reward} sats reward</span>
          </div>
        </div>

        {/* Game-specific content */}
        {selectedGame.type === 'quiz' && renderQuiz()}
        {selectedGame.type === 'memory' && renderMemoryGame()}
        {selectedGame.type === 'sequence' && renderSequenceGame()}

        <button
          onClick={() => setSelectedGame(null)}
          className="mt-6 w-full px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
        >
          Exit Game
        </button>
      </div>
    );
  };

  const renderQuiz = () => {
    const questions = quizQuestions[selectedGame?.id as keyof typeof quizQuestions];
    if (!questions || !selectedGame) return null;

    const currentQ = questions[gameState.currentQuestion];
    return (
      <div className="space-y-6">
        <p className="text-lg font-medium text-gray-900">{currentQ.question}</p>
        <div className="grid grid-cols-1 gap-3">
          {currentQ.options.map((option, index) => (
            <button
              key={index}
              onClick={() => handleQuizAnswer(index)}
              className="p-3 text-left bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {option}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderMemoryGame = () => {
    const cards = memoryCards[selectedGame?.id as keyof typeof memoryCards];
    if (!cards || !selectedGame) return null;

    return (
      <div className="grid grid-cols-4 gap-4">
        {cards.map((card, index) => (
          <div
            key={index}
            onClick={() => handleCardFlip(index)}
            className={`aspect-[3/4] rounded-lg cursor-pointer transition-all transform ${
              gameState.flippedCards.includes(index) ? 'rotate-y-180' : ''
            }`}
          >
            <div className="h-full bg-orange-500 text-white flex items-center justify-center p-4">
              <span className="text-sm font-medium">{card.term}</span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderSequenceGame = () => {
    // Implementation for sequence game type
    return (
      <div className="space-y-4">
        <p className="text-lg font-medium text-gray-900">Order these events chronologically:</p>
        {/* Add sequence game implementation */}
      </div>
    );
  };

  const handleQuizAnswer = (answerIndex: number) => {
    const questions = quizQuestions[selectedGame?.id as keyof typeof quizQuestions];
    if (!questions || !selectedGame) return;

    const isCorrect = answerIndex === questions[gameState.currentQuestion].answer;
    if (isCorrect) {
      setGameState(prev => ({
        ...prev,
        score: prev.score + 10,
        currentQuestion: prev.currentQuestion + 1
      }));
      toast.success('Correct answer!');
    } else {
      toast.error('Try again!');
    }

    if (gameState.currentQuestion >= questions.length - 1) {
      endGame();
    }
  };

  const handleCardFlip = (cardIndex: number) => {
    if (gameState.flippedCards.length === 2) return;

    setGameState(prev => ({
      ...prev,
      flippedCards: [...prev.flippedCards, cardIndex]
    }));

    // Check for match
    if (gameState.flippedCards.length === 1) {
      const firstCard = gameState.flippedCards[0];
      const secondCard = cardIndex;

      setTimeout(() => {
        const cards = memoryCards[selectedGame?.id as keyof typeof memoryCards];
        if (cards[firstCard].term === cards[secondCard].definition ||
            cards[firstCard].definition === cards[secondCard].term) {
          setGameState(prev => ({
            ...prev,
            score: prev.score + 20,
            matchedPairs: prev.matchedPairs + 1,
            flippedCards: []
          }));
          toast.success('Match found!');

          if (gameState.matchedPairs + 1 === cards.length / 2) {
            endGame();
          }
        } else {
          setGameState(prev => ({
            ...prev,
            flippedCards: []
          }));
        }
      }, 1000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Trophy className="h-6 w-6 text-orange-500" />
          <h2 className="text-xl font-semibold text-gray-900">Educational Games</h2>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!selectedGame ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {Object.entries(subjects).map(([key, subject]) => (
              <div key={key} className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">{subject.title}</h3>
                  </div>
                  <div className="space-y-4">
                    {subject.games.map(game => (
                      <button
                        key={game.id}
                        onClick={() => startGame(game)}
                        className="w-full text-left p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="font-medium text-gray-900">{game.title}</h4>
                            <p className="text-sm text-gray-500">{game.description}</p>
                          </div>
                          <span className="text-orange-500 text-sm font-medium">
                            {game.reward} sats
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        ) : (
          renderGameContent()
        )}
      </AnimatePresence>
    </div>
  );
}