import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Award, CheckCircle, Lock, ArrowRight, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface EducationalContent {
  id: string;
  title: string;
  content: string;
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  reward_sats: number;
  quiz_questions: {
    question: string;
    options: string[];
    correct_answer: number;
  }[];
  published: boolean;
}

interface StudentProgress {
  content_id: string;
  completed: boolean;
  quiz_score?: number;
  rewards_claimed: boolean;
}

export function Learn() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [selectedContent, setSelectedContent] = useState<EducationalContent | null>(null);
  const [quizMode, setQuizMode] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);

  // Fetch educational content
  const { data: content } = useQuery({
    queryKey: ['educational-content'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('educational_content')
        .select('*')
        .eq('published', true)
        .order('difficulty_level', { ascending: true });

      if (error) throw error;
      return data as EducationalContent[];
    },
  });

  // Fetch student progress
  const { data: progress } = useQuery({
    queryKey: ['student-progress', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_progress')
        .select('*')
        .eq('student_id', user?.id);

      if (error) throw error;
      return data as StudentProgress[];
    },
    enabled: !!user?.id,
  });

  // Update progress mutation
  const progressMutation = useMutation({
    mutationFn: async (data: {
      content_id: string;
      quiz_score: number;
      completed: boolean;
    }) => {
      const { error } = await supabase
        .from('student_progress')
        .upsert({
          student_id: user?.id,
          content_id: data.content_id,
          quiz_score: data.quiz_score,
          completed: data.completed,
          completed_at: new Date().toISOString(),
        });

      if (error) throw error;

      // If quiz passed, create award
      if (data.quiz_score >= 0.7 && selectedContent) {
        await supabase.from('awards').insert({
          student_id: user?.id,
          sats: selectedContent.reward_sats,
          reason: `Completed ${selectedContent.title}`,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-progress'] });
      queryClient.invalidateQueries({ queryKey: ['student-balance'] });
    },
  });

  const handleQuizSubmit = async () => {
    if (!selectedContent) return;

    const correctAnswers = answers.reduce((sum, answer, index) => {
      return sum + (answer === selectedContent.quiz_questions[index].correct_answer ? 1 : 0);
    }, 0);

    const score = correctAnswers / selectedContent.quiz_questions.length;

    await progressMutation.mutateAsync({
      content_id: selectedContent.id,
      quiz_score: score,
      completed: true,
    });

    setQuizMode(false);
    setSelectedContent(null);
    setAnswers([]);
    setCurrentQuestion(0);
  };

  const getContentStatus = (contentId: string) => {
    const contentProgress = progress?.find(p => p.content_id === contentId);
    if (!contentProgress) return 'locked';
    if (contentProgress.completed) return 'completed';
    return 'in-progress';
  };

  const renderContent = () => {
    if (!selectedContent) {
      return (
        <div className="space-y-8">
          {/* Regular Educational Content */}
          <h3 className="text-lg font-medium text-gray-900 mt-8 mb-4">Educational Content</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {content?.map((item) => {
              const status = getContentStatus(item.id);
              const isLocked = status === 'locked' && progress?.every(p => !p.completed);

              return (
                <div
                  key={item.id}
                  className={`bg-white rounded-lg shadow-sm overflow-hidden ${
                    isLocked ? 'opacity-50' : 'cursor-pointer hover:shadow-md transition-shadow'
                  }`}
                  onClick={() => !isLocked && setSelectedContent(item)}
                >
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        item.difficulty_level === 'beginner' ? 'bg-green-100 text-green-800' :
                        item.difficulty_level === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {item.difficulty_level}
                      </span>
                      <span className="inline-flex items-center text-orange-500">
                        <Award className="h-4 w-4 mr-1" />
                        {item.reward_sats} sats
                      </span>
                    </div>

                    <h3 className="text-lg font-medium text-gray-900">{item.title}</h3>

                    <div className="mt-4 flex items-center justify-between">
                      {status === 'completed' ? (
                        <span className="inline-flex items-center text-green-500">
                          <CheckCircle className="h-5 w-5 mr-1" />
                          Completed
                        </span>
                      ) : isLocked ? (
                        <span className="inline-flex items-center text-gray-500">
                          <Lock className="h-5 w-5 mr-1" />
                          Locked
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-orange-500">
                          Start Learning
                          <ArrowRight className="h-5 w-5 ml-1" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    if (quizMode) {
      const question = selectedContent.quiz_questions[currentQuestion];
      return (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900">Quiz</h3>
            <p className="text-sm text-gray-500">
              Question {currentQuestion + 1} of {selectedContent.quiz_questions.length}
            </p>
          </div>

          <div className="space-y-4">
            <p className="text-gray-900 font-medium">{question.question}</p>
            <div className="space-y-2">
              {question.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => {
                    const newAnswers = [...answers];
                    newAnswers[currentQuestion] = index;
                    setAnswers(newAnswers);

                    if (currentQuestion < selectedContent.quiz_questions.length - 1) {
                      setCurrentQuestion(currentQuestion + 1);
                    }
                  }}
                  className={`w-full p-4 text-left rounded-lg border ${
                    answers[currentQuestion] === index
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 flex justify-between">
            <button
              onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
              disabled={currentQuestion === 0}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
            >
              Previous
            </button>
            {currentQuestion === selectedContent.quiz_questions.length - 1 ? (
              <button
                onClick={handleQuizSubmit}
                disabled={answers.length !== selectedContent.quiz_questions.length}
                className="px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-md hover:bg-orange-600 disabled:opacity-50"
              >
                Submit Quiz
              </button>
            ) : (
              <button
                onClick={() => setCurrentQuestion(currentQuestion + 1)}
                disabled={answers[currentQuestion] === undefined}
                className="px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-md hover:bg-orange-600 disabled:opacity-50"
              >
                Next
              </button>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <button
          onClick={() => setSelectedContent(null)}
          className="mb-4 text-sm text-gray-500 hover:text-gray-700"
        >
          ← Back to lessons
        </button>

        <div className="prose max-w-none">
          <h2>{selectedContent.title}</h2>
          <div dangerouslySetInnerHTML={{ __html: selectedContent.content }} />
        </div>

        <div className="mt-8">
          <button
            onClick={() => setQuizMode(true)}
            className="w-full px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-md hover:bg-orange-600"
          >
            Take Quiz to Earn {selectedContent.reward_sats} sats
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <BookOpen className="h-6 w-6 text-orange-500" />
          <h2 className="text-xl font-semibold text-gray-900">Learn & Earn</h2>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {renderContent()}
      </motion.div>
    </div>
  );
}