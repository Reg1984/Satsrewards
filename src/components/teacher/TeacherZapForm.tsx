import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Zap, X, Search, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { toast } from 'sonner';
import { Avatar } from '../Avatar';

interface Student {
  id: string;
  name: string;
  image_url?: string;
  class_id: string;
}

interface TeacherZapFormProps {
  isOpen: boolean;
  onClose: () => void;
  classId?: string;
  preselectedStudentId?: string;
}

export function TeacherZapForm({ isOpen, onClose, classId, preselectedStudentId }: TeacherZapFormProps) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [amount, setAmount] = useState<number>(100);
  const [reason, setReason] = useState('');
  const [showZapEffect, setShowZapEffect] = useState(false);

  // Fetch students in the class
  const { data: students } = useQuery({
    queryKey: ['class-students', classId || user?.classId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, image_url, class_id')
        .eq('role', 'student')
        .eq('class_id', classId || user?.classId);

      if (error) throw error;
      return data as Student[];
    },
    enabled: isOpen && !!(classId || user?.classId)
  });

  // If a preselected student ID is provided, set it as the selected student
  useEffect(() => {
    if (preselectedStudentId && students) {
      const student = students.find(s => s.id === preselectedStudentId);
      if (student) {
        setSelectedStudent(student);
      }
    }
  }, [preselectedStudentId, students]);

  // Send zap mutation
  const sendZapMutation = useMutation({
    mutationFn: async (data: {
      receiver_id: string;
      amount_sats: number;
      reason: string;
    }) => {
      const { error } = await supabase
        .from('student_zaps')
        .insert({
          sender_id: user?.id,
          receiver_id: data.receiver_id,
          amount_sats: data.amount_sats,
          reason: data.reason,
          needs_approval: false, // Teacher zaps don't need approval
          approved: true, // Auto-approve teacher zaps
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
          is_teacher_initiated: true // Mark as teacher-initiated
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-balance'] });
      queryClient.invalidateQueries({ queryKey: ['awards'] });
      setShowZapEffect(true);
      setTimeout(() => setShowZapEffect(false), 1500);
      toast.success('Zap sent successfully!');
      setTimeout(() => {
        onClose();
        setSelectedStudent(null);
        setAmount(100);
        setReason('');
      }, 1000);
    },
    onError: (error) => {
      console.error('Error sending zap:', error);
      toast.error('Failed to send zap');
    }
  });

  const filteredStudents = students?.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSendZap = async () => {
    if (!selectedStudent) return;

    try {
      await sendZapMutation.mutateAsync({
        receiver_id: selectedStudent.id,
        amount_sats: amount,
        reason
      });
    } catch (error) {
      console.error('Error sending zap:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
    >
      <motion.div 
        className="bg-white rounded-xl shadow-lg w-full max-w-md p-6 relative"
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Award SATs to Student</h3>
          <motion.button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-500 rounded-full"
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
          >
            <X className="h-5 w-5" />
          </motion.button>
        </div>

        {showZapEffect && (
          <motion.div 
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1.5 }}
            exit={{ opacity: 0, scale: 2 }}
            transition={{ duration: 0.5 }}
          >
            <Zap className="text-yellow-500 h-16 w-16" />
          </motion.div>
        )}

        {!selectedStudent ? (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search students..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2">
              <AnimatePresence>
                {filteredStudents?.map((student) => (
                  <motion.button
                    key={student.id}
                    onClick={() => setSelectedStudent(student)}
                    className="w-full flex items-center p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    whileHover={{ scale: 1.02, backgroundColor: "#f7f7f7" }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  >
                    <Avatar
                      name={student.name}
                      imageUrl={student.image_url}
                      size="sm"
                    />
                    <span className="ml-3">{student.name}</span>
                  </motion.button>
                ))}
              </AnimatePresence>

              {filteredStudents?.length === 0 && (
                <p className="text-center text-gray-500 py-4">
                  No students found
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Awarding to
              </label>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <Avatar
                    name={selectedStudent.name}
                    imageUrl={selectedStudent.image_url}
                    size="sm"
                  />
                  <span className="ml-3">{selectedStudent.name}</span>
                </div>
                <motion.button
                  onClick={() => setSelectedStudent(null)}
                  className="p-1 text-gray-400 hover:text-gray-500 rounded-full"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X className="h-4 w-4" />
                </motion.button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount (sats)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(parseInt(e.target.value) || 0)}
                min={1}
                max={10000}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why are you awarding these SATs?"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                rows={3}
              />
            </div>

            <motion.button
              onClick={handleSendZap}
              disabled={!reason.trim() || amount < 1 || sendZapMutation.isPending}
              className="w-full flex items-center justify-center px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              {sendZapMutation.isPending ? (
                <span>Sending...</span>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Award SATs
                </>
              )}
            </motion.button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}