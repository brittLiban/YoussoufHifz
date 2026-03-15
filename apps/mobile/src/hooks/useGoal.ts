import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Goal, MemUnit } from '../types/api';

export function useActiveGoal() {
  return useQuery<Goal | null>({
    queryKey: ['goal', 'active'],
    queryFn: async () => {
      const { data } = await api.get('/goals/active');
      return data.goal;
    },
  });
}

interface CreateGoalInput {
  unit: MemUnit;
  totalUnits: number;
  dailyTarget: number;
}

export function useCreateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateGoalInput) => {
      const { data } = await api.post('/goals', {
        unit: input.unit,
        totalUnits: input.totalUnits,
        dailyTarget: input.dailyTarget,
        startReference: { unit: 1 },
        targetReference: { unit: input.totalUnits },
      });
      return data.goal as Goal;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goal'] });
      qc.invalidateQueries({ queryKey: ['progress'] });
    },
  });
}

export function useUpdateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Goal> & { id: string }) => {
      const { data } = await api.put(`/goals/${id}`, updates);
      return data.goal as Goal;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goal'] });
    },
  });
}
