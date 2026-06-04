import { create } from 'zustand';
import type { User } from '../types/auth';
import { supabase } from '../lib/supabase';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<{ user: User | null; error?: string }>;
  signUp: (email: string, password: string, name: string) => Promise<{ user: User | null; error?: string }>;
  signOut: () => Promise<void>;
  setUser: (user: User | null) => void;
  initializeAuth: () => Promise<void>;
  clearError: () => void;
}

async function fetchUserProfile(id: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, role, name, class_id, school_id, image_url')
    .eq('id', id)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    email: data.email ?? '',
    role: (data.role as User['role']) ?? 'student',
    name: data.name ?? '',
    classId: data.class_id ?? undefined,
    school_id: data.school_id ?? undefined,
    image_url: data.image_url ?? undefined,
    lastActive: new Date(),
  };
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  error: null,

  signIn: async (email, password) => {
    set({ loading: true, error: null });
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      set({ loading: false, error: error?.message ?? 'Sign in failed' });
      return { user: null, error: error?.message };
    }
    const profile = await fetchUserProfile(data.user.id);
    set({ user: profile, loading: false, error: null });
    return { user: profile };
  },

  signUp: async (email, password, name) => {
    set({ loading: true, error: null });
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, role: 'admin' } },
    });
    if (error) {
      set({ loading: false, error: error.message });
      return { user: null, error: error.message };
    }
    if (data.session) {
      const profile = await fetchUserProfile(data.user!.id);
      set({ user: profile, loading: false, error: null });
      return { user: profile };
    }
    // Email confirmation required
    set({ loading: false, error: null });
    return { user: null, error: 'confirm_email' };
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, error: null });
  },

  setUser: (user) => {
    set({ user, loading: false, error: null });
  },

  clearError: () => set({ error: null }),

  initializeAuth: async () => {
    set({ loading: true });
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      set({ user: null, loading: false });
      return;
    }
    const profile = await fetchUserProfile(session.user.id);
    set({ user: profile, loading: false });

    supabase.auth.onAuthStateChange((_event, newSession) => {
      (async () => {
        if (!newSession?.user) {
          set({ user: null });
          return;
        }
        const updated = await fetchUserProfile(newSession.user.id);
        set({ user: updated });
      })();
    });
  },
}));
