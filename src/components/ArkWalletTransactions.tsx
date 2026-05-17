import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

export function ArkWalletTransactions() {
  const { user } = useAuthStore();

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['transactions', user?.id],
    queryFn: async () => {
      // Fetch awards
      const { data: awards } = await supabase
        .from('awards')
        .select('*')
        .eq('student_id', user?.id)
        .order('created_at', { ascending: false });

      // Fetch lightning transactions
      const { data: lightning } = await supabase
        .from('lightning_transactions')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      // Fetch student zaps - both sent and received
      const { data: sentZaps } = await supabase
        .from('student_zaps')
        .select(`
          *,
          receiver:receiver_id (name, image_url)
        `)
        .eq('sender_id', user?.id)
        .order('created_at', { ascending: false });

      const { data: receivedZaps } = await supabase
        .from('student_zaps')
        .select(`
          *,
          sender:sender_id (name, image_url)
        `)
        .eq('receiver_id', user?.id)
        .eq('approved', true)
        .order('created_at', { ascending: false });

      // Combine and sort all transactions
      const allTransactions = [
        ...(awards || []).map(award => ({
          ...award,
          type: 'award',
          amount: award.sats,
          date: award.created_at
        })),
        ...(lightning || []).map(tx => ({
          ...tx,
          type: 'lightning',
          amount: tx.amount_sats,
          date: tx.created_at
        })),
        ...(sentZaps || []).map(zap => ({
          ...zap,
          type: 'zap_sent',
          amount: zap.amount_sats,
          date: zap.created_at,
          counterparty: zap.receiver?.name || 'Unknown',
          counterpartyImage: zap.receiver?.image_url
        })),
        ...(receivedZaps || []).map(zap => ({
          ...zap,
          type: 'zap_received',
          amount: zap.amount_sats,
          date: zap.created_at,
          counterparty: zap.sender?.name || 'Unknown',
          counterpartyImage: zap.sender?.image_url
        }))
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return allTransactions;
    },
    enabled: !!user?.id
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
      <AnimatePresence>
        {transactions?.map((transaction, index) => (
          <motion.div
            key={transaction.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ delay: index * 0.05 }}
            className="flex items-center justify-between p-4 bg-white rounded-lg shadow hover:shadow-neu-sm transition-all duration-300"
            whileHover={{ scale: 1.02 }}
          >
            <div>
              {transaction.type === 'award' && (
                <p className="font-medium text-gray-800">
                  {transaction.reason}
                </p>
              )}
              {transaction.type === 'lightning' && (
                <p className="font-medium text-gray-800">
                  Lightning Transaction
                </p>
              )}
              {transaction.type === 'zap_sent' && (
                <p className="font-medium text-gray-800">
                  Zap to {transaction.counterparty}
                  <span className="text-xs ml-2 text-gray-500 capitalize">
                    {transaction.approved ? 'Approved' : 'Pending approval'}
                  </span>
                </p>
              )}
              {transaction.type === 'zap_received' && (
                <p className="font-medium text-gray-800">
                  Zap from {transaction.counterparty}
                </p>
              )}
              <p className="text-sm text-gray-500">
                {format(new Date(transaction.date), 'MMM d, yyyy HH:mm')}
              </p>
              {transaction.type === 'lightning' && (
                <p className="text-xs text-gray-500 capitalize">
                  Status: {transaction.status}
                </p>
              )}
              {(transaction.type === 'zap_sent' || transaction.type === 'zap_received') && (
                <p className="text-xs text-gray-500">
                  Reason: {transaction.reason}
                </p>
              )}
            </div>
            <motion.p 
              className={`text-lg font-semibold ${
                transaction.type === 'award' || transaction.type === 'zap_received' ? 'text-green-500' : 
                transaction.type === 'zap_sent' ? 'text-orange-500' : 'text-red-500'
              }`}
              whileHover={{ scale: 1.1 }}
            >
              {transaction.type === 'award' || transaction.type === 'zap_received' ? '+' : 
               transaction.type === 'zap_sent' ? '-' : '-'}{transaction.amount} SATs
            </motion.p>
          </motion.div>
        ))}
      </AnimatePresence>

      {!transactions?.length && (
        <p className="text-center text-gray-500 py-8">
          No transactions found
        </p>
      )}
    </div>
  );
}