import React, { useState } from 'react';
import { Brain, Loader2, AlertTriangle, CheckCircle, XCircle, ArrowRight, Timer } from 'lucide-react';
import { generateQuiz } from '../lib/ai';
import { useAuthStore } from '../store/authStore';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { ConfettiEffect } from './ConfettiEffect';

interface AIQuizGeneratorProps {
  className?: string;
}

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

export function AIQuizGenerator({ className }: AIQuizGeneratorProps) {
  const [quizTopic, setQuizTopic] = useState('');
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [generatedQuiz, setGeneratedQuiz] = useState<QuizQuestion[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [userAnswers, setUserAnswers] = useState<number[]>([]);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [score, setScore] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  // Mutation for saving quiz results
  const saveQuizResultsMutation = useMutation({
    mutationFn: async (data: { 
      topic: string; 
      difficulty: string; 
      score: number; 
      totalQuestions: number;
    }) => {
      // Create a content entry for this quiz
      const { data: contentData, error: contentError } = await supabase
        .from('educational_content')
        .insert({
          title: `AI Quiz: ${data.topic}`,
          content: `Generated quiz about ${data.topic} (${data.difficulty} difficulty)`,
          difficulty_level: data.difficulty,
          reward_sats: calculateReward(data.score, data.difficulty),
          type: 'game',
          published: true,
          metadata: { 
            generatedBy: 'ai',
            topic: data.topic
          }
        })
        .select()
        .single();

      if (contentError) throw contentError;

      // Record student progress
      const { error: progressError } = await supabase
        .from('student_progress')
        .insert({
          student_id: user?.id,
          content_id: contentData.id,
          completed: true,
          quiz_score: data.score,
          rewards_claimed: true,
          completed_at: new Date().toISOString(),
          best_score: data.score
        });

      if (progressError) throw progressError;

      // Award SATs based on score
      const satsEarned = calculateReward(data.score, data.difficulty);
      
      if (satsEarned > 0) {
        const { error: awardError } = await supabase
          .from('awards')
          .insert({
            student_id: user?.id,
            sats: satsEarned,
            reason: `Completed AI quiz on ${data.topic} with score: ${data.score}%`
          });

        if (awardError) throw awardError;
      }

      return { satsEarned };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['student-balance'] });
      queryClient.invalidateQueries({ queryKey: ['student-progress'] });
      setShowConfetti(true);
      toast.success(`Earned ${data.satsEarned} SATs for completing the quiz!`);
    },
    onError: (error) => {
      console.error('Error saving quiz results:', error);
      toast.error('Failed to save quiz results');
    }
  });

  const handleGenerateQuiz = async () => {
    if (!quizTopic.trim()) {
      toast.error('Please enter a topic for the quiz');
      return;
    }

    setIsGenerating(true);
    setError('');
    setGeneratedQuiz([]);
    setUserAnswers([]);
    setCurrentQuestion(0);
    setQuizCompleted(false);
    
    try {
      const response = await generateQuiz(quizTopic, difficulty, user?.id);
      
      if (response.error) {
        setError(response.error);
        toast.error('Failed to generate quiz');
      } else if (Array.isArray(response.content) && response.content.length > 0) {
        // Process the quiz questions to ensure they have the right format
        const processedQuiz = response.content.map(q => ({
          question: q.question,
          options: q.options || [],
          correctAnswer: q.correctAnswer !== undefined ? q.correctAnswer : 
                        (q.correct_answer !== undefined ? q.correct_answer : 0),
          explanation: q.explanation || ''
        }));
        
        setGeneratedQuiz(processedQuiz);
        toast.success('Quiz generated successfully!');
      } else {
        console.error('Invalid quiz format:', response.content);
        setError('Failed to parse quiz questions. The AI response was not in the expected format.');
        toast.error('Failed to generate quiz');
      }
    } catch (err) {
      console.error('Error generating quiz:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      toast.error('Failed to generate quiz');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAnswer = (answerIndex: number) => {
    const newAnswers = [...userAnswers];
    newAnswers[currentQuestion] = answerIndex;
    setUserAnswers(newAnswers);

    // If this is the last question, calculate score
    if (currentQuestion === generatedQuiz.length - 1) {
      const correctAnswers = newAnswers.reduce((sum, answer, index) => {
        return sum + (answer === generatedQuiz[index].correctAnswer ? 1 : 0);
      }, 0);
      
      const finalScore = Math.round((correctAnswers / generatedQuiz.length) * 100);
      setScore(finalScore);
      setQuizCompleted(true);
      
      // Save quiz results
      if (user?.id) {
        saveQuizResultsMutation.mutate({
          topic: quizTopic,
          difficulty,
          score: finalScore,
          totalQuestions: generatedQuiz.length
        });
      }
    } else {
      // Move to next question
      setTimeout(() => {
        setCurrentQuestion(currentQuestion + 1);
      }, 500);
    }
  };

  const resetQuiz = () => {
    setUserAnswers([]);
    setCurrentQuestion(0);
    setQuizCompleted(false);
    setScore(0);
  };

  const calculateReward = (score: number, difficulty: string): number => {
    const baseReward = 
      difficulty === 'beginner' ? 50 :
      difficulty === 'intermediate' ? 100 :
      150; // advanced
    
    // Only award if score is at least 60%
    if (score < 60) return 0;
    
    // Scale reward based on score
    return Math.round(baseReward * (score / 100));
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm p-6 border border-gray-100 hover:shadow-neu transition-all duration-300 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Brain className="h-5 w-5 text-purple-500 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">AI Quiz Generator</h3>
        </div>
      </div>
      
      <div className="space-y-4">
        <AnimatePresence mode="wait">
          {!generatedQuiz.length || quizCompleted ? (
            <motion.div
              key="quiz-form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <p className="text-gray-600">
                Generate a custom quiz on any Bitcoin or financial topic to test your knowledge and earn SATs.
              </p>
              
              <div className="flex space-x-2">
                <div className="flex-1">
                  <input
                    type="text"
                    value={quizTopic}
                    onChange={(e) => setQuizTopic(e.target.value)}
                    placeholder="Enter a topic (e.g., 'Bitcoin history', 'blockchain')"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as any)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
              
              <motion.button
                onClick={handleGenerateQuiz}
                disabled={isGenerating || !quizTopic.trim()}
                className="w-full px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 flex items-center justify-center"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating Quiz...
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4 mr-2" />
                    Generate Quiz
                  </>
                )}
              </motion.button>
              
              {error && (
                <motion.div 
                  className="mt-4 p-4 bg-red-50 rounded-lg border border-red-100"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="flex items-start">
                    <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-red-800">Error</h4>
                      <p className="text-sm text-red-600 mt-1">{error}</p>
                    </div>
                  </div>
                </motion.div>
              )}
              
              {quizCompleted && (
                <motion.div 
                  className="mt-4 p-6 bg-purple-50 rounded-lg border border-purple-100 text-center"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                >
                  <ConfettiEffect active={showConfetti} duration={4000} />
                  <motion.h4 
                    className="font-medium text-purple-800 text-lg mb-2"
                    initial={{ scale: 0.9 }}
                    animate={{ scale: [0.9, 1.1, 1] }}
                    transition={{ duration: 0.5 }}
                  >
                    Quiz Completed!
                  </motion.h4>
                  <motion.p 
                    className="text-gray-700 mb-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    Your score: <span className="font-bold text-purple-700">{score}%</span>
                  </motion.p>
                  {score >= 60 ? (
                    <motion.div 
                      className="mb-4 p-3 bg-green-100 rounded-lg text-green-800"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                    >
                      <CheckCircle className="h-5 w-5 inline mr-2" />
                      You earned {calculateReward(score, difficulty)} SATs!
                    </motion.div>
                  ) : (
                    <motion.div 
                      className="mb-4 p-3 bg-yellow-100 rounded-lg text-yellow-800"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                    >
                      <AlertTriangle className="h-5 w-5 inline mr-2" />
                      Score at least 60% to earn SATs!
                    </motion.div>
                  )}
                  <div className="flex space-x-3">
                    <motion.button
                      onClick={resetQuiz}
                      className="flex-1 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.7 }}
                    >
                      Try Again
                    </motion.button>
                    <motion.button
                      onClick={() => {
                        setQuizTopic('');
                        setGeneratedQuiz([]);
                        setQuizCompleted(false);
                      }}
                      className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.8 }}
                    >
                      New Quiz
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="quiz-questions"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="bg-purple-50 rounded-lg p-6 border border-purple-100"
            >
              <div className="mb-4 flex justify-between items-center">
                <h4 className="font-medium text-purple-800">
                  Question {currentQuestion + 1} of {generatedQuiz.length}
                </h4>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-purple-600">Topic: {quizTopic}</span>
                  <motion.div 
                    className="bg-purple-200 px-2 py-1 rounded-full flex items-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <Timer className="h-3 w-3 mr-1 text-purple-700" />
                    <span className="text-xs text-purple-700">{difficulty}</span>
                  </motion.div>
                </div>
              </div>
              
              <motion.p 
                className="text-gray-800 font-medium mb-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={`question-${currentQuestion}`}
              >
                {generatedQuiz[currentQuestion].question}
              </motion.p>
              
              <div className="space-y-3 mb-6">
                <AnimatePresence mode="wait">
                  {generatedQuiz[currentQuestion].options.map((option, index) => (
                    <motion.button
                      key={`${currentQuestion}-${index}`}
                      onClick={() => handleAnswer(index)}
                      className={`w-full p-3 text-left rounded-lg transition-colors ${
                        userAnswers[currentQuestion] === index
                          ? userAnswers[currentQuestion] === generatedQuiz[currentQuestion].correctAnswer
                            ? 'bg-green-100 border-green-300 border'
                            : 'bg-red-100 border-red-300 border'
                          : 'bg-white border border-gray-200 hover:bg-purple-50'
                      }`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.2, delay: index * 0.1 }}
                      whileHover={userAnswers[currentQuestion] === undefined ? { scale: 1.02, backgroundColor: "#f3e8ff" } : {}}
                      whileTap={userAnswers[currentQuestion] === undefined ? { scale: 0.98 } : {}}
                      disabled={userAnswers[currentQuestion] !== undefined}
                    >
                      <span className="inline-block w-6 h-6 rounded-full bg-purple-100 text-purple-800 text-center mr-2">
                        {String.fromCharCode(65 + index)}
                      </span>
                      {option}
                      
                      {userAnswers[currentQuestion] === index && (
                        <motion.span 
                          className="float-right"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 500, damping: 15 }}
                        >
                          {userAnswers[currentQuestion] === generatedQuiz[currentQuestion].correctAnswer ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-500" />
                          )}
                        </motion.span>
                      )}
                    </motion.button>
                  ))}
                </AnimatePresence>
              </div>
              
              {userAnswers[currentQuestion] !== undefined && (
                <motion.div 
                  className="mt-4 p-4 rounded-lg bg-gray-50"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <h5 className="font-medium text-gray-700 mb-1">Explanation:</h5>
                  <p className="text-gray-600">
                    {generatedQuiz[currentQuestion].explanation || 
                     `The correct answer is ${String.fromCharCode(65 + generatedQuiz[currentQuestion].correctAnswer)}.`}
                  </p>
                  
                  {currentQuestion < generatedQuiz.length - 1 && (
                    <motion.button
                      onClick={() => setCurrentQuestion(currentQuestion + 1)}
                      className="mt-3 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 flex items-center float-right"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Next Question
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </motion.button>
                  )}
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}