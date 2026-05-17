import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Zap, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Search, 
  Filter, 
  ArrowLeft,
  ArrowRight
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Avatar } from '../Avatar';

export function TeacherZapApprovals() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  // Fetch zaps that need approval
  const { data: zaps = [], isLoading } = useQuery({
    queryKey: ['teacher-zap-approvals', user?.id, user?.classId],
    queryFn: async () => {
      try {
        // Get students in the teacher's class
        const { data: students, error: studentsError } = await supabase
          .from('profiles')
          .select('id')
          .eq('class_id', user?.classId)
          .eq('role', 'student');

        if (studentsError) throw studentsError;

        if (!students?.length) return [];

        // Get zaps for these students
        const { data: zaps, error: zapsError } = await supabase
          .from('student_zaps')
          .select(`
            *,
            sender:sender_id (id, name, image_url, class_id),
            receiver:receiver_id (id, name, image_url, class_id)
          `)
          .in('sender_id', students.map(s => s.id))
          .order('created_at', { ascending: false });

        if (zapsError) throw zapsError;

        return zaps || [];
      } catch (error) {
        console.error('Error fetching zap approvals:', error);
        throw error;
      }
    },
    enabled: !!user?.id && !!user?.classId && user?.role === 'teacher'
  });

  // Approve/reject zap mutation
  const zapMutation = useMutation({
    mutationFn: async ({ zapId, approved }: { zapId: string; approved: boolean }) => {
      const { error } = await supabase
        .from('student_zaps')
        .update({
          approved,
          approved_at: new Date().toISOString(),
          approved_by: user?.id,
          needs_approval: false
        })
        .eq('id', zapId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-zap-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['student-balance'] });
      toast.success('Zap request processed successfully');
    },
    onError: (error) => {
      console.error('Error processing zap:', error);
      toast.error('Failed to process zap request');
    }
  });

  // Filter zaps based on search term and status filter
  const filteredZaps = zaps.filter(zap => {
    // Filter by search term
    const searchMatch = 
      zap.sender?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      zap.receiver?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      zap.reason?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filter by status
    let statusMatch = true;
    if (statusFilter === 'pending') {
      statusMatch = zap.needs_approval && zap.approved === null;
    } else if (statusFilter === 'approved') {
      statusMatch = zap.approved === true;
    } else if (statusFilter === 'rejected') {
      statusMatch = zap.approved === false;
    }
    
    return searchMatch && statusMatch;
  });

  // Count pending zaps
  const pendingCount = zaps.filter(zap => zap.needs_approval && zap.approved === null).length;

  const handleApprove = (zapId: string) => {
    zapMutation.mutate({ zapId, approved: true });
  };

  const handleReject = (zapId: string) => {
    zapMutation.mutate({ zapId, approved: false });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading zap requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Link to="/teacher" className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h2 className="text-xl font-semibold text-gray-900">Student Zap Approvals</h2>
          {pendingCount > 0 && (
            <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
              {pendingCount} pending
            </span>
          )}
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-lg shadow-sm p-4 flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name or reason..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <div className="min-w-[150px]">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Zaps List */}
      {filteredZaps.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <Zap className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No zap requests found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredZaps.map((zap) => (
            <div
              key={zap.id}
              className={`bg-white rounded-lg shadow-sm p-4 ${
                zap.needs_approval && zap.approved === null
                  ? 'border-l-4 border-yellow-500'
                  : zap.approved
                  ? 'border-l-4 border-green-500'
                  : 'border-l-4 border-red-500'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <Avatar
                    name={zap.sender?.name || ''}
                    imageUrl={zap.sender?.image_url}
                    size="md"
                  />
                  <div>
                    <div className="flex items-center">
                      <span className="font-medium text-gray-900">{zap.sender?.name}</span>
                      <ArrowRight className="h-4 w-4 mx-2 text-gray-500" />
                      <span className="font-medium text-gray-900">{zap.receiver?.name}</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {format(new Date(zap.created_at), 'MMM d, yyyy HH:mm')}
                    </p>
                    <p className="text-sm text-gray-700 mt-2">
                      <span className="font-medium">Reason:</span> {zap.reason}
                    </p>
                    <p className="text-sm font-medium text-orange-600 mt-1">
                      Amount: {zap.amount_sats} SATs
                    </p>
                    <div className="mt-2">
                      {zap.needs_approval && zap.approved === null ? (
                        <div className="flex items-center text-yellow-600 text-sm">
                          <Clock className="h-4 w-4 mr-1" />
                          Pending approval
                        </div>
                      ) : zap.approved ? (
                        <div className="flex items-center text-green-600 text-sm">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approved {zap.approved_at && `on ${format(new Date(zap.approved_at), 'MMM d, yyyy')}`}
                        </div>
                      ) : (
                        <div className="flex items-center text-red-600 text-sm">
                          <XCircle className="h-4 w-4 mr-1" />
                          Rejected {zap.approved_at && `on ${format(new Date(zap.approved_at), 'MMM d, yyyy')}`}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {zap.needs_approval && zap.approved === null && (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleApprove(zap.id)}
                      disabled={zapMutation.isPending}
                      className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
                    >
                      <CheckCircle className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleReject(zap.id)}
                      disabled={zapMutation.isPending}
                      className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                    >
                      <XCircle className="h-5 w-5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}