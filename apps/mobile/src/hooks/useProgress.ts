import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { ProgressLog, ProgressStats, Forecast } from '../types/api';

export function useProgressStats() {
  return useQuery<ProgressStats | null>({
    queryKey: ['progress', 'stats'],
    queryFn: async () => {
      const { data } = await api.get('/progress/stats');
      return data.stats;
    },
  });
}

export function useForecast() {
  return useQuery<Forecast | null>({
    queryKey: ['progress', 'forecast'],
    queryFn: async () => {
      const { data } = await api.get('/progress/forecast');
      return data.forecast;
    },
  });
}

export function useProgressLogs(from?: string, to?: string) {
  return useQuery<ProgressLog[]>({
    queryKey: ['progress', 'logs', from, to],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const { data } = await api.get(`/progress?${params}`);
      return data.logs;
    },
  });
}

interface LogProgressInput {
  goalId: string;
  unitsLogged: number;
  logDate: string; // YYYY-MM-DD
  note?: string;
}

export function useLogProgress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: LogProgressInput) => {
      const { data } = await api.post('/progress', input);
      return data.log as ProgressLog;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['progress'] });
    },
  });
}

export function useSetPosition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (total: number) => {
      await api.put('/progress/set-position', { total });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['progress'] });
    },
  });
}
