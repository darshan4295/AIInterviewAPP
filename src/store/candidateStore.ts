import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type Candidate = Database['public']['Tables']['candidates']['Row'];
type NewCandidate = Database['public']['Tables']['candidates']['Insert'];

interface CandidateStore {
  candidates: Candidate[];
  isLoading: boolean;
  error: string | null;
  selectedCandidate: Candidate | null;
  fetchCandidates: () => Promise<void>;
  addCandidate: (candidate: NewCandidate) => Promise<void>;
  updateCandidate: (id: string, updates: Partial<Candidate>) => Promise<void>;
  setSelectedCandidate: (candidate: Candidate | null) => void;
}

export const useCandidateStore = create<CandidateStore>((set, get) => ({
  candidates: [],
  isLoading: false,
  error: null,
  selectedCandidate: null,

  fetchCandidates: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('candidates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ candidates: data || [] });
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },

  addCandidate: async (candidate) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('candidates')
        .insert(candidate)
        .select()
        .single();

      if (error) throw error;
      set((state) => ({
        candidates: [data, ...state.candidates]
      }));
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },

  updateCandidate: async (id, updates) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('candidates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      set((state) => ({
        candidates: state.candidates.map((c) => (c.id === id ? data : c))
      }));
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },

  setSelectedCandidate: (candidate) => set({ selectedCandidate: candidate }),
}));