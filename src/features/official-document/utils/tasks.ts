import { addDays, diffDays, parseDateKey, parseServerDate, toDateKey, todayKey, weekdayOf, type DateKey } from '@/core/time/vn';

import type { DocRole, DocTask, IncomingDoc } from '../types';
import { DUE_SOON_DAYS } from './deadline';

/** Tabs of "Việc của tôi" (8b). `tat_ca` also holds finished tasks. */
export type TaskTab = 'tat_ca' | 'den_han' | 'qua_han' | 'dang_xu_ly' | 'da_huy';

export const TASK_TABS: readonly TaskTab[] = ['tat_ca', 'den_han', 'qua_han', 'dang_xu_ly', 'da_huy'];

export function isTaskTab(value: unknown): value is TaskTab {
  return typeof value === 'string' && (TASK_TABS as readonly string[]).includes(value);
}

/** Dot / stripe color of a task: its role while open, done once finished. */
export type TaskTone = DocRole | 'done';

/** The incoming documents I have a role in, as calendar tasks from distribution day to deadline. */
export function tasksOf(docs: readonly IncomingDoc[]): DocTask[] {
  return docs
    .filter((d) => !!d.vaiTro && d.trangThai !== 'cho_phan_phoi' && d.trangThai !== 'bi_tra_lai')
    .map((d) => {
      const assigned = parseServerDate(d.phanPhoiLuc ?? null);
      const from = assigned ? toDateKey(assigned) : d.ngayNhan;
      const to = d.han && d.han >= from ? d.han : from;
      return {
        id: d.id,
        docId: d.id,
        soDen: d.soDen,
        trichYeu: d.trichYeu,
        role: d.vaiTro as DocRole,
        from,
        to,
        hasDeadline: !!d.han,
        // As the web calendar (`mauLoai = hoanTat`): finished once processed or once the chủ trì filed a result.
        done: d.trangThai === 'da_xu_ly' || d.trangThai === 'khong_xu_ly' || !!d.ketQua?.trim(),
        cancelled: !!d.daHuy,
        chuTri: d.thanhPhan.filter((a) => a.role === 'chu_tri').map((a) => a.person.name).join(', ') || undefined,
        nguoiPhanPhoi: d.nguoiPhanPhoi?.name,
      };
    });
}

/** The tab an open task belongs to (finished tasks only show under `tat_ca`). */
export function taskStage(task: DocTask, today: DateKey = todayKey()): Exclude<TaskTab, 'tat_ca'> | 'hoan_thanh' {
  if (task.cancelled) return 'da_huy';
  if (task.done) return 'hoan_thanh';
  if (!task.hasDeadline) return 'dang_xu_ly';
  const left = diffDays(today, task.to);
  if (left < 0) return 'qua_han';
  if (left <= DUE_SOON_DAYS) return 'den_han';
  return 'dang_xu_ly';
}

export function inTaskTab(task: DocTask, tab: TaskTab, today: DateKey = todayKey()) {
  return tab === 'tat_ca' || taskStage(task, today) === tab;
}

export function taskCounts(tasks: readonly DocTask[], today: DateKey = todayKey()): Record<TaskTab, number> {
  const counts: Record<TaskTab, number> = { tat_ca: tasks.length, den_han: 0, qua_han: 0, dang_xu_ly: 0, da_huy: 0 };
  tasks.forEach((task) => {
    const stage = taskStage(task, today);
    if (stage !== 'hoan_thanh') counts[stage] += 1;
  });
  return counts;
}

export function taskTone(task: DocTask): TaskTone {
  return task.done ? 'done' : task.role;
}

/** Tasks whose bar covers `day`; an overdue open task stays on every day until it is closed. */
export function tasksOnDay(tasks: readonly DocTask[], day: DateKey, today: DateKey = todayKey()): DocTask[] {
  return tasks.filter((task) => {
    if (task.from <= day && day <= task.to) return true;
    const lingering = !task.done && !task.cancelled && task.to < today;
    return lingering && day > task.to && day <= today;
  });
}

const ROLE_RANK: Record<DocRole, number> = { chu_tri: 0, phoi_hop: 1, de_biet: 2 };

/** Most pressing first: earliest deadline (overdue on top), tasks without one last, then chủ trì before phối hợp before để biết. */
export function byUrgency(a: DocTask, b: DocTask) {
  const due = (task: DocTask) => (task.hasDeadline ? task.to : '9999-12-31');
  return due(a).localeCompare(due(b)) || ROLE_RANK[a.role] - ROLE_RANK[b.role];
}

/** Share of the time from distribution to deadline already used, 0..1 (1 once due or past). */
export function taskProgress(task: DocTask, today: DateKey = todayKey()): number {
  const total = diffDays(task.from, task.to);
  if (total <= 0) return today >= task.to ? 1 : 0;
  return Math.min(1, Math.max(0, diffDays(task.from, today) / total));
}

/** Monday to Sunday of the week holding `day`. */
export function weekOf(day: DateKey): DateKey[] {
  const monday = addDays(day, -((weekdayOf(day) + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

const pad = (n: number) => String(n).padStart(2, '0');

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** `day` moved to `year` / `month`, its day of month clamped to that month's length (31/10 → 30/11). */
export function inMonth(day: DateKey, year: number, month: number): DateKey {
  return `${year}-${pad(month)}-${pad(Math.min(parseDateKey(day).day, daysInMonth(year, month)))}`;
}

export function addMonths(day: DateKey, delta: number): DateKey {
  const { year, month } = parseDateKey(day);
  const index = year * 12 + (month - 1) + delta;
  return inMonth(day, Math.floor(index / 12), (index % 12) + 1);
}

/** Monday-to-Sunday weeks covering `year` / `month`, padded with the neighbouring months' days. */
export function monthWeeks(year: number, month: number): DateKey[][] {
  const last = `${year}-${pad(month)}-${pad(daysInMonth(year, month))}`;
  const weeks: DateKey[][] = [];
  for (let monday = weekOf(`${year}-${pad(month)}-01`)[0]; monday <= last; monday = addDays(monday, 7)) weeks.push(weekOf(monday));
  return weeks;
}

/** Distinct tones of the tasks on `day`, in legend order, for the dots under a week cell. */
export function dayTones(tasks: readonly DocTask[], day: DateKey, today: DateKey = todayKey()): TaskTone[] {
  const order: TaskTone[] = ['chu_tri', 'phoi_hop', 'de_biet', 'done'];
  const present = new Set(tasksOnDay(tasks, day, today).filter((t) => !t.cancelled).map(taskTone));
  return order.filter((tone) => present.has(tone));
}
