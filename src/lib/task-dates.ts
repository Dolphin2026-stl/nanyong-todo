import type { Task } from '@/lib/app-context';

export function parseDateInput(value: string): string | null {
  const match = /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return `${match[1]}/${match[2].padStart(2, '0')}/${match[3].padStart(2, '0')}`;
}

export function toIsoDateTime(dateInput: string, timeInput: string, defaultTime: string): string | undefined {
  if (!dateInput.trim()) return undefined;
  const date = parseDateInput(dateInput);
  if (!date) throw new Error('日期请填写为 YYYY/MM/DD，并确认是真实日期');
  const time = timeInput || defaultTime;
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error('时间请填写为 HH:MM');
  return new Date(`${date.replaceAll('/', '-')}T${time}:00`).toISOString();
}

export function taskScheduleTime(task: Pick<Task, 'start_time' | 'end_time' | 'is_long_term'>): string | undefined {
  return task.is_long_term ? task.end_time : (task.end_time || task.start_time);
}

export function taskScheduleLabel(task: Pick<Task, 'start_time' | 'end_time' | 'is_long_term'>): 'DDL' | '开始' {
  return task.end_time || task.is_long_term ? 'DDL' : '开始';
}

export function dateForInput(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

export function timeForInput(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
