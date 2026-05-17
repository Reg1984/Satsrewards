import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { School, Users, Bell, Shield, Settings, Plus, Edit2, Trash2, CheckCircle, AlertTriangle, Copy, Check, Download, UserPlus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface SchoolInvite {
  id: string;
  email: string;
  role: 'teacher' | 'admin';
  expires_at: string;
  used_at?: string;
}

interface SchoolAnnouncement {
  id: string;
  title: string;
  content: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  starts_at: string;
  ends_at?: string;
  active: boolean;
}

interface StudentInviteCode {
  id: string;
  code: string;
  class_id?: string;
  email?: string;
  expires_at: string;
  used_at?: string;
}

export function SchoolAdmin() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'invites' | 'announcements' | 'compliance'>('invites');
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);
  const [isCreatingAnnouncement, setIsCreatingAnnouncement] = useState(false);
  const [isCreatingStudentInvite, setIsCreatingStudentInvite] = useState(false);
  const [studentInviteCount, setStudentInviteCount] = useState(10);
  const [studentInviteClass, setStudentInviteClass] = useState('');
  const [generatedStudentCodes, setGeneratedStudentCodes] = useState<string[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Parse the tab from URL query parameters
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab === 'announcements') {
      setActiveTab('announcements');
    } else if (tab === 'compliance') {
      setActiveTab('compliance');
    } else {
      setActiveTab('invites');
    }
  }, [location.search]);

  // Update URL when tab changes
  const handleTabChange = (tab: 'invites' | 'announcements' | 'compliance') => {
    setActiveTab(tab);
    navigate(`/school-admin?tab=${tab}`, { replace: true });
  };

  // Fetch school data
  const { data: school } = useQuery({
    queryKey: ['school', user?.school_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('schools')
        .select('*')
        .eq('id', user?.school_id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.school_id,
  });

  // Fetch invites
  const { data: invites } = useQuery({
    queryKey: ['school-invites', user?.school_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('school_invites')
        .select('*')
        .eq('school_id', user?.school_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as SchoolInvite[];
    },
    enabled: !!user?.school_id,
  });

  // Fetch student invitation codes
  const { data: studentInvites } = useQuery({
    queryKey: ['student-invitation-codes', user?.school_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_invitation_codes')
        .select('*')
        .eq('school_id', user?.school_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as StudentInviteCode[];
    },
    enabled: !!user?.school_id,
  });

  // Fetch announcements
  const { data: announcements } = useQuery({
    queryKey: ['school-announcements', user?.school_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('school_announcements')
        .select('*')
        .eq('school_id', user?.school_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as SchoolAnnouncement[];
    },
    enabled: !!user?.school_id,
  });

  // Create invite mutation
  const createInviteMutation = useMutation({
    mutationFn: async (data: { email: string; role: 'teacher' | 'admin' }) => {
      const { error } = await supabase
        .from('school_invites')
        .insert({
          school_id: user?.school_id,
          email: data.email,
          role: data.role,
          token: crypto.randomUUID(),
          created_by: user?.id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-invites'] });
      setIsCreatingInvite(false);
      toast.success('Invite sent successfully');
    },
    onError: (error) => {
      console.error('Error creating invite:', error);
      toast.error('Failed to send invite');
    }
  });

  // Create student invitation codes mutation
  const createStudentInvitesMutation = useMutation({
    mutationFn: async (data: { count: number; class_id?: string }) => {
      const { data: codes, error } = await supabase.rpc('create_student_invitations', {
        p_school_id: user?.school_id,
        p_count: data.count,
        p_class_id: data.class_id || null
      });

      if (error) throw error;
      return codes;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['student-invitation-codes'] });
      setGeneratedStudentCodes(data || []);
      setIsCreatingStudentInvite(false);
      toast.success(`${data.length} student invitation codes generated successfully`);
    },
    onError: (error) => {
      console.error('Error generating student invitation codes:', error);
      toast.error('Failed to generate student invitation codes');
    }
  });

  // Create announcement mutation
  const createAnnouncementMutation = useMutation({
    mutationFn: async (data: {
      title: string;
      content: string;
      priority: 'low' | 'medium' | 'high' | 'urgent';
      ends_at?: string;
    }) => {
      const { error } = await supabase
        .from('school_announcements')
        .insert({
          school_id: user?.school_id,
          ...data,
          created_by: user?.id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-announcements'] });
      setIsCreatingAnnouncement(false);
      toast.success('Announcement created successfully');
    },
    onError: (error) => {
      console.error('Error creating announcement:', error);
      toast.error('Failed to create announcement');
    }
  });

  // Delete invite mutation
  const deleteInviteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('school_invites')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-invites'] });
      toast.success('Invite deleted successfully');
    },
    onError: (error) => {
      console.error('Error deleting invite:', error);
      toast.error('Failed to delete invite');
    }
  });

  // Delete student invitation code mutation
  const deleteStudentInviteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('student_invitation_codes')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-invitation-codes'] });
      toast.success('Student invitation code deleted successfully');
    },
    onError: (error) => {
      console.error('Error deleting student invitation code:', error);
      toast.error('Failed to delete student invitation code');
    }
  });

  // Delete announcement mutation
  const deleteAnnouncementMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('school_announcements')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-announcements'] });
      toast.success('Announcement deleted successfully');
    },
    onError: (error) => {
      console.error('Error deleting announcement:', error);
      toast.error('Failed to delete announcement');
    }
  });

  // Update announcement mutation
  const updateAnnouncementMutation = useMutation({
    mutationFn: async (data: {
      id: string;
      active: boolean;
    }) => {
      const { error } = await supabase
        .from('school_announcements')
        .update({ active: data.active })
        .eq('id', data.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-announcements'] });
      toast.success('Announcement updated successfully');
    },
    onError: (error) => {
      console.error('Error updating announcement:', error);
      toast.error('Failed to update announcement');
    }
  });

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
      .then(() => {
        setCopiedCode(code);
        toast.success('Code copied to clipboard');
        setTimeout(() => setCopiedCode(null), 2000);
      })
      .catch(() => {
        toast.error('Failed to copy code');
      });
  };

  const handleExportCodes = () => {
    if (!generatedStudentCodes.length) return;
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Invitation Code,Class\n"
      + generatedStudentCodes.map(code => `${code},${studentInviteClass || 'All Classes'}`).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `student-invitation-codes-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderInvites = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Teacher & Admin Invites</h3>
        <button
          onClick={() => setIsCreatingInvite(true)}
          className="flex items-center px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-md hover:bg-orange-600"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Invite
        </button>
      </div>

      {isCreatingInvite && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            createInviteMutation.mutate({
              email: formData.get('email') as string,
              role: formData.get('role') as 'teacher' | 'admin',
            });
          }}
          className="bg-white p-6 rounded-lg shadow-sm space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              name="email"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Role</label>
            <select
              name="role"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
            >
              <option value="teacher">Teacher</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => setIsCreatingInvite(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createInviteMutation.isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-md hover:bg-orange-600 disabled:opacity-50"
            >
              {createInviteMutation.isPending ? 'Sending...' : 'Send Invite'}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white shadow-sm rounded-lg divide-y divide-gray-200">
        {invites?.length === 0 && (
          <div className="p-6 text-center text-gray-500">
            No invites found. Create your first invite to add teachers or admins to your school.
          </div>
        )}
        
        {invites?.map((invite) => (
          <div key={invite.id} className="p-6 flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">{invite.email}</p>
              <div className="mt-1 flex items-center space-x-3">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  {invite.role}
                </span>
                <span className="text-sm text-gray-500">
                  Expires: {new Date(invite.expires_at).toLocaleDateString()}
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {invite.used_at ? (
                <span className="inline-flex items-center text-green-500">
                  <CheckCircle className="h-5 w-5 mr-1" />
                  Accepted
                </span>
              ) : (
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to delete this invite?')) {
                      deleteInviteMutation.mutate(invite.id);
                    }
                  }}
                  disabled={deleteInviteMutation.isPending}
                  className="text-gray-400 hover:text-red-500 disabled:opacity-50"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Student Invitation Codes Section */}
      <div className="mt-10">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Student Invitation Codes</h3>
          <div className="flex space-x-2">
            <button
              onClick={() => setIsCreatingStudentInvite(true)}
              className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Generate Codes
            </button>
            {generatedStudentCodes.length > 0 && (
              <button
                onClick={handleExportCodes}
                className="flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100"
              >
                <Download className="h-4 w-4 mr-2" />
                Export Codes
              </button>
            )}
          </div>
        </div>

        {isCreatingStudentInvite && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createStudentInvitesMutation.mutate({
                count: studentInviteCount,
                class_id: studentInviteClass || undefined
              });
            }}
            className="bg-white p-6 rounded-lg shadow-sm space-y-4 mt-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700">Number of Codes</label>
              <input
                type="number"
                value={studentInviteCount}
                onChange={(e) => setStudentInviteCount(parseInt(e.target.value) || 1)}
                min="1"
                max="100"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Generate up to 100 invitation codes at once
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Class ID (Optional)</label>
              <input
                type="text"
                value={studentInviteClass}
                onChange={(e) => setStudentInviteClass(e.target.value)}
                placeholder="e.g. 10A (leave empty for all classes)"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                If specified, students will be automatically assigned to this class
              </p>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setIsCreatingStudentInvite(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createStudentInvitesMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600 disabled:opacity-50"
              >
                {createStudentInvitesMutation.isPending ? 'Generating...' : 'Generate Codes'}
              </button>
            </div>
          </form>
        )}

        {generatedStudentCodes.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow-sm mt-4">
            <h4 className="font-medium text-gray-900 mb-4">Generated Invitation Codes</h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {generatedStudentCodes.map((code, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="font-mono text-sm">{code}</div>
                  <button
                    onClick={() => handleCopyCode(code)}
                    className="p-1 text-blue-600 hover:text-blue-800"
                  >
                    {copiedCode === code ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-between items-center">
              <p className="text-sm text-gray-500">
                Class: {studentInviteClass || 'All Classes'}
              </p>
              <button
                onClick={handleExportCodes}
                className="flex items-center px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-800"
              >
                <Download className="h-4 w-4 mr-1" />
                Export as CSV
              </button>
            </div>
          </div>
        )}

        <div className="bg-white shadow-sm rounded-lg divide-y divide-gray-200 mt-4">
          <div className="p-4 bg-gray-50">
            <div className="flex justify-between items-center">
              <h4 className="font-medium text-gray-900">Active Invitation Codes</h4>
              <span className="text-sm text-gray-500">
                {studentInvites?.filter(invite => !invite.used_at).length || 0} active codes
              </span>
            </div>
          </div>
          
          {studentInvites?.length === 0 && (
            <div className="p-6 text-center text-gray-500">
              No student invitation codes found. Generate codes to invite students to your school.
            </div>
          )}
          
          {studentInvites?.filter(invite => !invite.used_at).map((invite) => (
            <div key={invite.id} className="p-4 flex items-center justify-between">
              <div>
                <div className="flex items-center">
                  <span className="font-mono text-sm font-medium">{invite.code}</span>
                  <button
                    onClick={() => handleCopyCode(invite.code)}
                    className="ml-2 p-1 text-gray-400 hover:text-gray-600"
                  >
                    {copiedCode === invite.code ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
                <div className="mt-1 flex items-center space-x-3 text-xs text-gray-500">
                  {invite.class_id && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                      Class: {invite.class_id}
                    </span>
                  )}
                  <span>
                    Expires: {new Date(invite.expires_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to delete this invitation code?')) {
                    deleteStudentInviteMutation.mutate(invite.id);
                  }
                }}
                className="text-gray-400 hover:text-red-500"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          ))}
          
          {studentInvites && studentInvites.length > 0 && !studentInvites.some(invite => !invite.used_at) && (
            <div className="p-6 text-center text-gray-500">
              All invitation codes have been used. Generate new codes to invite more students.
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderAnnouncements = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">School Announcements</h3>
        <button
          onClick={() => setIsCreatingAnnouncement(true)}
          className="flex items-center px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-md hover:bg-orange-600"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Announcement
        </button>
      </div>

      {isCreatingAnnouncement && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            createAnnouncementMutation.mutate({
              title: formData.get('title') as string,
              content: formData.get('content') as string,
              priority: formData.get('priority') as 'low' | 'medium' | 'high' | 'urgent',
              ends_at: formData.get('ends_at') as string,
            });
          }}
          className="bg-white p-6 rounded-lg shadow-sm space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700">Title</label>
            <input
              type="text"
              name="title"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Content</label>
            <textarea
              name="content"
              required
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Priority</label>
            <select
              name="priority"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">End Date (Optional)</label>
            <input
              type="datetime-local"
              name="ends_at"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => setIsCreatingAnnouncement(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createAnnouncementMutation.isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-md hover:bg-orange-600 disabled:opacity-50"
            >
              {createAnnouncementMutation.isPending ? 'Creating...' : 'Create Announcement'}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white shadow-sm rounded-lg divide-y divide-gray-200">
        {announcements?.length === 0 && (
          <div className="p-6 text-center text-gray-500">
            No announcements found. Create your first announcement to inform your school community.
          </div>
        )}
        
        {announcements?.map((announcement) => (
          <div key={announcement.id} className="p-6">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-medium text-gray-900">{announcement.title}</h4>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  announcement.priority === 'urgent'
                    ? 'bg-red-100 text-red-800'
                    : announcement.priority === 'high'
                    ? 'bg-yellow-100 text-yellow-800'
                    : announcement.priority === 'medium'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-green-100 text-green-800'
                }`}
              >
                {announcement.priority}
              </span>
            </div>
            <p className="mt-2 text-gray-600">{announcement.content}</p>
            <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
              <div>
                Posted: {new Date(announcement.starts_at).toLocaleDateString()}
                {announcement.ends_at && (
                  <> • Ends: {new Date(announcement.ends_at).toLocaleDateString()}</>
                )}
              </div>
              <div className="flex items-center space-x-3">
                <button 
                  onClick={() => updateAnnouncementMutation.mutate({
                    id: announcement.id,
                    active: !announcement.active
                  })}
                  className={`text-sm font-medium ${announcement.active ? 'text-green-600' : 'text-gray-500'}`}
                >
                  {announcement.active ? 'Active' : 'Inactive'}
                </button>
                <button 
                  onClick={() => {
                    if (confirm('Are you sure you want to delete this announcement?')) {
                      deleteAnnouncementMutation.mutate(announcement.id);
                    }
                  }}
                  className="text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderCompliance = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">Compliance & Safety</h3>

      <div className="bg-white shadow-sm rounded-lg p-6">
        <div className="space-y-6">
          <div>
            <h4 className="text-sm font-medium text-gray-700">Compliance Status</h4>
            <div className="mt-2 flex items-center space-x-2">
              {school?.compliance_status === 'approved' ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-green-700">Approved</span>
                </>
              ) : school?.compliance_status === 'restricted' ? (
                <>
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  <span className="text-yellow-700">Restricted</span>
                </>
              ) : school?.compliance_status === 'suspended' ? (
                <>
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  <span className="text-red-700">Suspended</span>
                </>
              ) : (
                <>
                  <Clock className="h-5 w-5 text-gray-500" />
                  <span className="text-gray-700">Pending Review</span>
                </>
              )}
            </div>
          </div>

          <div className="border-t pt-6">
            <h4 className="text-sm font-medium text-gray-700 mb-4">Compliance Checks</h4>
            <div className="space-y-4">
              {Object.entries(school?.compliance_checks || {}).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-gray-600">
                    {key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                  </span>
                  {typeof value === 'boolean' ? (
                    value ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <X className="h-5 w-5 text-red-500" />
                    )
                  ) : (
                    <span className="text-gray-500">Not Available</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {school?.compliance_checks?.compliance_issues?.length > 0 && (
            <div className="border-t pt-6">
              <h4 className="text-sm font-medium text-gray-700 mb-4">Compliance Issues</h4>
              <div className="space-y-2">
                {school.compliance_checks.compliance_issues.map((issue: string, index: number) => (
                  <div key={index} className="flex items-start space-x-2 text-red-600">
                    <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                    <span>{issue}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <School className="h-6 w-6 text-orange-500" />
          <h2 className="text-xl font-semibold text-gray-900">School Administration</h2>
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => handleTabChange('invites')}
              className={`px-6 py-3 text-sm font-medium ${
                activeTab === 'invites'
                  ? 'border-b-2 border-orange-500 text-orange-600'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Users className="h-5 w-5 inline mr-2" />
              Invites
            </button>
            <button
              onClick={() => handleTabChange('announcements')}
              className={`px-6 py-3 text-sm font-medium ${
                activeTab === 'announcements'
                  ? 'border-b-2 border-orange-500 text-orange-600'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Bell className="h-5 w-5 inline mr-2" />
              Announcements
            </button>
            <button
              onClick={() => handleTabChange('compliance')}
              className={`px-6 py-3 text-sm font-medium ${
                activeTab === 'compliance'
                  ? 'border-b-2 border-orange-500 text-orange-600'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Shield className="h-5 w-5 inline mr-2" />
              Compliance
            </button>
          </nav>
        </div>

        <div className="p-6">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'invites' && renderInvites()}
            {activeTab === 'announcements' && renderAnnouncements()}
            {activeTab === 'compliance' && renderCompliance()}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

// X component for the X icon since it's not directly available in lucide-react
function X({ className = "h-5 w-5" }) {
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
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  );
}