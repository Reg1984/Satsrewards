import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { format } from 'date-fns';
import { Zap, ArrowRight, ArrowLeft, CheckCircle, Clock, XCircle } from 'lucide-react';
import { Avatar } from './Avatar';
import { motion, AnimatePresence } from 'framer-motion';

export function StudentZapHistory() {
  const { user } = useAuthStore();
  const [filter, setFilter] = useState<'all' | 'sent' | 'received'>('all');

  // Fetch zaps data
  const { data: zaps = [], isLoading } = useQuery({
    queryKey: ['student-zaps-history', user?.id],
    queryFn: async () => {
      // Fetch sent zaps
      const { data: sentZaps, error: sentError } = await supabase
        .from('student_zaps')
        .select(`
          *,
          receiver:receiver_id (name, image_url)
        `)
        .eq('sender_id', user?.id)
        .order('created_at', { ascending: false });

      if (sentError) {
        console.error('Error fetching sent zaps:', sentError);
        return [];
      }

      // Fetch received zaps
      const { data: receivedZaps, error: receivedError } = await supabase
        .from('student_zaps')
        .select(`
          *,
          sender:sender_id (name, image_url)
        `)
        .eq('receiver_id', user?.id)
        .order('created_at', { ascending: false });

      if (receivedError) {
        console.error('Error fetching received zaps:', receivedError);
        return [];
      }
      
      // Combine and sort
      return [
        ...(sentZaps || []).map(zap => ({ ...zap, direction: 'sent' })),
        ...(receivedZaps || []).map(zap => ({ ...zap, direction: 'received' }))
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    },
    enabled: !!user?.id
  });

  // Filter zaps based on selected filter
  const filteredZaps = zaps.filter(zap => {
    if (filter === 'all') return true;
    return zap.direction === filter;
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter buttons */}
      <div className="flex space-x-2 mb-4">
        <motion.button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 text-sm rounded-lg ${
            filter === 'all'
              ? 'bg-orange-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          All Zaps
        </motion.button>
        <motion.button
          onClick={() => setFilter('sent')}
          className={`px-3 py-1.5 text-sm rounded-lg ${
            filter === 'sent'
              ? 'bg-orange-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Sent
        </motion.button>
        <motion.button
          onClick={() => setFilter('received')}
          className={`px-3 py-1.5 text-sm rounded-lg ${
            filter === 'received'
              ? 'bg-orange-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Received
        </motion.button>
      </div>

      {/* Zaps list */}
      {filteredZaps.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No zaps found
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {filteredZaps.map((zap, index) => (
              <motion.div
                key={zap.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center justify-between p-4 bg-white rounded-lg shadow hover:shadow-neu-sm transition-all duration-300"
                whileHover={{ scale: 1.02 }}
              >
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <Avatar
                      name={zap.direction === 'sent' ? zap.receiver?.name || 'Unknown' : zap.sender?.name || 'Unknown'}
                      imageUrl={zap.direction === 'sent' ? zap.receiver?.image_url : zap.sender?.image_url}
                      size="sm"
                    />
                  </div>
                  <div>
                    <div className="flex items-center">
                      {zap.direction === 'sent' ? (
                        <>
                          <span className="font-medium text-gray-800">You</span>
                          <ArrowRight className="h-3 w-3 mx-1 text-gray-500" />
                          <span className="font-medium text-gray-800">{zap.receiver?.name || 'Unknown'}</span>
                        </>
                      ) : (
                        <>
                          <span className="font-medium text-gray-800">{zap.sender?.name || 'Unknown'}</span>
                          <ArrowRight className="h-3 w-3 mx-1 text-gray-500" />
                          <span className="font-medium text-gray-800">You</span>
                        </>
                      )}
                      {zap.is_teacher_initiated && (
                        <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">
                          Teacher Award
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">
                      {format(new Date(zap.created_at), 'MMM d, yyyy HH:mm')}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {zap.reason}
                    </p>
                    {zap.direction === 'sent' && !zap.approved && !zap.is_teacher_initiated && (
                      <div className="flex items-center mt-1 text-xs text-yellow-600">
                        <Clock className="h-3 w-3 mr-1" />
                        Pending teacher approval
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <motion.span 
                    className={`text-lg font-semibold ${
                      zap.direction === 'received' ? 'text-green-500' : 'text-orange-500'
                    }`}
                    whileHover={{ scale: 1.1 }}
                  >
                    {zap.direction === 'received' ? '+' : '-'}{zap.amount_sats} SATs
                  </motion.span>
                  {zap.direction === 'sent' && (
                    <div className="mt-1">
                      {zap.approved ? (
                        <div className="flex items-center text-xs text-green-600">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Approved
                        </div>
                      ) : zap.approved === false && !zap.needs_approval ? (
                        <div className="flex items-center text-xs text-red-600">
                          <XCircle className="h-3 w-3 mr-1" />
                          Rejected
                        </div>
                      ) : (
                        <div className="flex items-center text-xs text-yellow-600">
                          <Clock className="h-3 w-3 mr-1" />
                          Pending
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}