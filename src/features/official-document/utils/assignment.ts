import type { Assignment, DocPerson, DocRole } from '../types';

/** `PhanPhoiXuLy` rejects more than two chủ trì. */
export const MAX_CHU_TRI = 2;

export type RoleCounts = Record<DocRole, number>;

export function roleCounts(assignments: readonly Assignment[]): RoleCounts {
  const counts: RoleCounts = { chu_tri: 0, phoi_hop: 0, de_biet: 0 };
  assignments.forEach((a) => (counts[a.role] += 1));
  return counts;
}

export function roleOf(assignments: readonly Assignment[], personId: string): DocRole | undefined {
  return assignments.find((a) => a.person.id === personId)?.role;
}

export type ToggleResult = { assignments: Assignment[]; rejected?: 'max_chu_tri' };

/**
 * Taps a role button on a person's row: assigns that role (a person holds one role, so it replaces any
 * other), or clears it when it is already theirs. A third chủ trì is refused.
 */
export function toggleRole(assignments: readonly Assignment[], person: DocPerson, role: DocRole): ToggleResult {
  const current = roleOf(assignments, person.id);
  const others = assignments.filter((a) => a.person.id !== person.id);
  if (current === role) return { assignments: others };
  if (role === 'chu_tri' && roleCounts(others).chu_tri >= MAX_CHU_TRI) return { assignments: [...assignments], rejected: 'max_chu_tri' };
  return { assignments: [...others, { person, role }] };
}

/** "Không yêu cầu xử lý": nobody processes it, so chủ trì and phối hợp become để biết (they keep the document). */
export function withoutProcessing(assignments: readonly Assignment[]): Assignment[] {
  return assignments.map((a) => (a.role === 'de_biet' ? a : { ...a, role: 'de_biet' }));
}

export type AssignmentError = 'need_chu_tri' | 'need_anyone';

/** Why "Giao xử lý" stays disabled, or null when the form can be sent. */
export function assignmentError(assignments: readonly Assignment[], khongYeuCauXuLy: boolean): AssignmentError | null {
  if (khongYeuCauXuLy) return assignments.length ? null : 'need_anyone';
  return roleCounts(assignments).chu_tri > 0 ? null : 'need_chu_tri';
}

/** Members who lose the document when the chủ trì returns it: the whole processing team. */
export function teamNames(assignments: readonly Assignment[], meId: string) {
  return assignments.filter((a) => a.person.id !== meId).map((a) => a.person.name);
}
