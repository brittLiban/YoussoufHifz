import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { StudentDetail, StudentStats, TeacherNote, TeacherTarget } from '../types/api';

// Teacher: list of all students in a group with at-a-glance stats
export function useTeacherStudents(groupId: string) {
  return useQuery<StudentDetail[]>({
    queryKey: ['teacher', groupId, 'students'],
    queryFn: async () => {
      const { data } = await api.get(`/groups/${groupId}/teacher/students`);
      return data.students;
    },
    enabled: !!groupId,
  });
}

// Teacher: full detail for one student
export function useStudentDetail(groupId: string, studentId: string) {
  return useQuery<StudentDetail>({
    queryKey: ['teacher', groupId, 'student', studentId],
    queryFn: async () => {
      const { data } = await api.get(`/groups/${groupId}/teacher/students/${studentId}`);
      return data.student;
    },
    enabled: !!groupId && !!studentId,
  });
}

// Teacher: add a note for a student
export function useAddNote(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      studentId: string;
      content: string;
      isShareableWithParent?: boolean;
    }) => {
      const { data } = await api.post(`/groups/${groupId}/teacher/notes`, input);
      return data.note as TeacherNote;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['teacher', groupId, 'student', vars.studentId] });
    },
  });
}

// Teacher: assign a target for a student
export function useAssignTarget(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      studentId: string;
      targetType: 'memorization' | 'revision';
      description: string;
      dueDate?: string | null;
    }) => {
      const { data } = await api.post(`/groups/${groupId}/teacher/targets`, input);
      return data.target as TeacherTarget;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['teacher', groupId, 'student', vars.studentId] });
    },
  });
}

// Teacher: mark a target complete
export function useCompleteTarget(groupId: string, studentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (targetId: string) => {
      const { data } = await api.put(`/groups/${groupId}/teacher/targets/${targetId}/complete`, {});
      return data.target as TeacherTarget;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teacher', groupId, 'student', studentId] });
    },
  });
}

// Student: fetch my own notes + active targets from teachers in a group
export function useMyTeacherNotes(groupId: string) {
  return useQuery<{ notes: TeacherNote[]; targets: TeacherTarget[] }>({
    queryKey: ['my-notes', groupId],
    queryFn: async () => {
      const { data } = await api.get(`/groups/${groupId}/my-notes`);
      return { notes: data.notes, targets: data.targets };
    },
    enabled: !!groupId,
  });
}
