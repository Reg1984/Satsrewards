import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Trophy, Zap, Medal, Star, TrendingUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar } from './Avatar';
import { toast } from 'sonner';
import { useAuthStore } from '../store/authStore';
import { useLanguage } from '../contexts/LanguageContext';
import { translations } from '../lib/translations';

interface LeaderboardEntry {
  id: string;
  name: string;
  image_url?: string;
  educational_credits: number;
  class_id?: string;
  behavior_score?: number;
  rank?: number;
}

export function Leaderboard() {
  const { user } = useAuthStore();
  const { language } = useLanguage();
  const t = translations[language];

  const { data: leaderboard } = useQuery({
    queryKey: ['leaderboard', user?.class_id],
    queryFn: async () => {
      // First get all students in the class
      const { data: students, error: studentsError } = await supabase
        .from('profiles')
        .select(`
          id, 
          name, 
          image_url, 
          educational_credits, 
          class_id,
          behavior_records (
            id,
            type,
            points
          )
        `)
        .eq('role', 'student')
        .eq('class_id', user?.class_id)
        .order('educational_credits', { ascending: false });

      if (studentsError) throw studentsError;

      // Calculate behavior score and rank for each student
      const enrichedData = students?.map((student, index) => ({
        ...student,
        behavior_score: student.behavior_records?.reduce((sum, record) => 
          sum + (record.type === 'positive' ? record.points : -record.points), 0) || 0,
        rank: index + 1
      }));

      return enrichedData as LeaderboardEntry[];
    },
    enabled: !!user?.class_id
  });

  const handleZap = async (recipientId: string) => {
    if (!user) {
      toast.error('Please sign in to send zaps');
      return;
    }

    const amount = prompt('How many sats would you like to send?');
    if (!amount) return;

    const sats = parseInt(amount);
    if (isNaN(sats) || sats <= 0 || sats > 1000) {
      toast.error('Please enter a valid amount (1-1000 sats)');
      return;
    }

    const reason = prompt('Why are you sending this zap?');
    if (!reason) return;

    try {
      const { error } = await supabase
        .from('student_zaps')
        .insert({
          sender_id: user.id,
          receiver_id: recipientId,
          amount_sats: sats,
          reason,
          needs_approval: true
        });

      if (error) throw error;
      toast.success('Zap sent! Waiting for teacher approval.');
    } catch (error) {
      console.error('Error sending zap:', error);
      toast.error('Failed to send zap');
    }
  };

  const getMedalColor = (index: number) => {
    switch (index) {
      case 0:
        return 'text-yellow-500';
      case 1:
        return 'text-gray-400';
      case 2:
        return 'text-amber-600';
      default:
        return 'text-gray-500';
    }
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 24
      }
    }
  };

  return (
    <motion.div 
      className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 mb-6 hover:shadow-neu transition-all duration-300"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <Trophy className="h-6 w-6 text-orange-500" />
          <h2 className="text-xl font-semibold text-gray-900">Class Leaderboard</h2>
        </div>
        <div className="text-sm text-gray-500">
          {user?.class_id && `Class ${user.class_id}`}
        </div>
      </div>

      <div className="space-y-4">
        <AnimatePresence>
          {leaderboard?.map((student, index) => (
            <motion.div
              key={student.id}
              variants={itemVariants}
              className="bg-white shadow-sm hover:shadow-neu-sm transition-all duration-300 rounded-lg border border-gray-100"
              whileHover={{ scale: 1.02 }}
            >
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0 relative">
                      <Avatar 
                        name={student.name} 
                        imageUrl={student.image_url}
                        size="md"
                      />
                      {index < 3 && (
                        <motion.div 
                          className={`absolute -top-1 -right-1 ${getMedalColor(index)}`}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.5 + index * 0.1, type: "spring" }}
                        >
                          <Medal className="h-5 w-5" />
                        </motion.div>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{student.name}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <motion.div 
                          className="flex items-center"
                          whileHover={{ scale: 1.1 }}
                        >
                          <Star className="h-4 w-4 mr-1 text-yellow-500" />
                          {student.educational_credits} SATs
                        </motion.div>
                        <motion.div 
                          className="flex items-center"
                          whileHover={{ scale: 1.1 }}
                        >
                          <TrendingUp className="h-4 w-4 mr-1 text-blue-500" />
                          Score: {student.behavior_score}
                        </motion.div>
                      </div>
                    </div>
                  </div>

                  {user?.id !== student.id && (
                    <motion.button
                      onClick={() => handleZap(student.id)}
                      className="px-3 py-1.5 bg-white text-orange-600 rounded-lg border border-orange-200 hover:bg-orange-50 flex items-center"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Zap className="h-4 w-4 mr-1" />
                      Zap
                    </motion.button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {!leaderboard?.length && (
          <div className="text-center py-8 text-gray-500">
            No students found in this class
          </div>
        )}
      </div>
    </motion.div>
  );
}