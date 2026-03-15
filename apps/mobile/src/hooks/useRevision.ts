import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { RevisionPortion, RevisionLog, RevisionStrength } from '../types/api';

export function useRevisionPortions() {
  return useQuery<RevisionPortion[]>({
    queryKey: ['revision', 'portions'],
    queryFn: async () => {
      const { data } = await api.get('/revision/portions');
      return data.portions;
    },
  });
}

export function useRevisionHistory(portionId: string) {
  return useQuery<{ portion: RevisionPortion & { totalRevisions: number; revisionsLast30Days: number }; logs: RevisionLog[] }>({
    queryKey: ['revision', 'history', portionId],
    queryFn: async () => {
      const { data } = await api.get(`/revision/portions/${portionId}/history`);
      return data;
    },
  });
}

export interface AddPortionInput {
  label: string;
  portionType?: 'surah_range' | 'page_range' | 'custom';
  surahStart?: number | null;
  surahEnd?: number | null;
  pageStartRef?: number | null;
  pageEndRef?: number | null;
}

export function useAddPortion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: AddPortionInput) => {
      const { data } = await api.post('/revision/portions', input);
      return data.portion as RevisionPortion;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['revision'] }),
  });
}

export function useRenamePortion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, label }: { id: string; label: string }) => {
      const { data } = await api.put(`/revision/portions/${id}`, { label });
      return data.portion as RevisionPortion;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['revision'] }),
  });
}

export function useDeletePortion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/revision/portions/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['revision'] }),
  });
}

export function useLogRevision() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ portionId, note }: { portionId: string; note?: string }) => {
      const { data } = await api.post(`/revision/log/${portionId}`, { note });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['revision'] }),
  });
}

export function useUndoRevision() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (portionId: string) => {
      await api.delete(`/revision/log/${portionId}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['revision'] }),
  });
}

// ── Surah-based revision ──────────────────────────────────────────

export interface SurahRevisionEntry {
  surahId: number;
  revisionCount: number;
  lastRevised: string | null;
  daysSinceRevision: number | null;
  strength: RevisionStrength;
  revisedToday: boolean;
}

export interface SurahRevisionData {
  memorized: SurahRevisionEntry[];
  currentSurahId: number | null;
  totalMemorized: number;
}

export function useSurahRevisions() {
  return useQuery<SurahRevisionData>({
    queryKey: ['revision', 'surahs'],
    queryFn: async () => {
      const { data } = await api.get('/revision/surahs');
      return data;
    },
  });
}

export function useLogSurahRevisions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (surahIds: number[]) => {
      const { data } = await api.post('/revision/surahs/log', { surahIds });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['revision', 'surahs'] }),
  });
}

export function useUndoSurahRevision() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (surahId: number) => {
      await api.delete(`/revision/surahs/log/${surahId}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['revision', 'surahs'] }),
  });
}

