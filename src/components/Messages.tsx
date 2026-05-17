import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, Send } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { Avatar } from './Avatar';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

export function Messages() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');

  // Fetch messages
  const { data: messages } = useQuery({
    queryKey: ['messages', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('parent_messages')
        .select(`
          *,
          sender:sender_id (name, image_url, role),
          recipient:recipient_id (name, image_url, role)
        `)
        .or(`sender_id.eq.${user?.id},recipient_id.eq.${user?.id}`)
        .order('created_at', { ascending: false });
      return data;
    },
    enabled: !!user?.id
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const { data, error } = await supabase
        .from('parent_messages')
        .insert({
          sender_id: user?.id,
          recipient_id: user?.role === 'student' ? 
            (await supabase.from('profiles').select('id').eq('role', 'teacher').single()).data?.id :
            user?.id,
          student_id: user?.id,
          content
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      setMessage('');
    }
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center space-x-3">
        <MessageSquare className="h-6 w-6 text-orange-500" />
        <h2 className="text-xl font-semibold text-gray-900">Messages</h2>
      </div>

      {/* Message Composer */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex space-x-4">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Write your message..."
            className="flex-1 p-3 border rounded-lg focus:ring-2 focus:ring-orange-500"
            rows={3}
          />
          <button
            onClick={() => message.trim() && sendMessageMutation.mutate(message)}
            disabled={!message.trim() || sendMessageMutation.isPending}
            className="px-4 py-2 h-fit bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Message List */}
      <div className="space-y-4">
        {messages?.map((msg: any) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[80%] flex items-start space-x-3 ${
              msg.sender_id === user?.id ? 'flex-row-reverse space-x-reverse' : ''
            }`}>
              <Avatar
                name={msg.sender_id === user?.id ? msg.sender.name : msg.recipient.name}
                imageUrl={msg.sender_id === user?.id ? msg.sender.image_url : msg.recipient.image_url}
                size="sm"
              />
              <div className={`rounded-lg p-4 ${
                msg.sender_id === user?.id 
                  ? 'bg-orange-500 text-white' 
                  : 'bg-gray-100 text-gray-900'
              }`}>
                <p>{msg.content}</p>
                <p className={`text-xs mt-1 ${
                  msg.sender_id === user?.id ? 'text-orange-100' : 'text-gray-500'
                }`}>
                  {format(new Date(msg.created_at), 'MMM d, h:mm a')}
                </p>
              </div>
            </div>
          </motion.div>
        ))}

        {!messages?.length && (
          <div className="text-center py-8 text-gray-500">
            No messages yet. Start a conversation!
          </div>
        )}
      </div>
    </div>
  );
}