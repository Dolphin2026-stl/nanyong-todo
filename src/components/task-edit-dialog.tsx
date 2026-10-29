'use client';

import { useState, type FormEvent } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { taskTypeLabels, taskPriorityLabels, taskImportanceLabels, type Task, type Tag, type TaskType, type TaskPriority, type TaskImportance } from '@/lib/app-context';
import { dateForInput, timeForInput, toIsoDateTime, parseDateInput } from '@/lib/task-dates';

interface Props { task: Task; tags: Tag[]; onClose: () => void; onSave: (updates: Partial<Task>) => Promise<void> }

export default function TaskEditDialog({ task, tags, onClose, onSave }: Props) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [type, setType] = useState<TaskType>(task.task_type);
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [importance, setImportance] = useState<TaskImportance>(task.importance);
  const [startDate, setStartDate] = useState(dateForInput(task.start_time));
  const [startTime, setStartTime] = useState(timeForInput(task.start_time));
  const [endDate, setEndDate] = useState(dateForInput(task.end_time));
  const [endTime, setEndTime] = useState(timeForInput(task.end_time) || '23:59');
  const [selectedTags, setSelectedTags] = useState<string[]>(task.tags || []);
  const [longTerm, setLongTerm] = useState(task.is_long_term || false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    try {
      if (!title.trim()) throw new Error('请填写任务标题');
      const start_time = toIsoDateTime(startDate, startTime, '00:00');
      const end_time = toIsoDateTime(endDate, endTime, '23:59');
      if (longTerm && !end_time) throw new Error('长远目标需要截止日期（DDL）');
      if (start_time && end_time && new Date(start_time) > new Date(end_time)) throw new Error('开始时间不能晚于截止时间');
      setSaving(true);
      await onSave({ title: title.trim(), description: description.trim(), task_type: type, priority, importance, start_time, end_time, tags: selectedTags, is_long_term: longTerm });
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '保存失败');
    } finally { setSaving(false); }
  }

  const inputClass = 'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm';
  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
      <DialogHeader><DialogTitle>编辑任务</DialogTitle><DialogDescription>修改内容、时间与标签；开始和截止时间可以只填一个。</DialogDescription></DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-sm">任务标题<input required className={inputClass} value={title} onChange={e => setTitle(e.target.value)} /></label>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="block text-sm">类型<select className={inputClass} value={type} onChange={e => setType(e.target.value as TaskType)}>{(Object.keys(taskTypeLabels) as TaskType[]).map(key => <option key={key} value={key}>{taskTypeLabels[key]}</option>)}</select></label>
          <label className="block text-sm">优先级<select className={inputClass} value={priority} onChange={e => setPriority(e.target.value as TaskPriority)}>{(Object.keys(taskPriorityLabels) as TaskPriority[]).map(key => <option key={key} value={key}>{taskPriorityLabels[key]}</option>)}</select></label>
        </div>
        <label className="block text-sm">重要程度<select className={inputClass} value={importance} onChange={e => setImportance(e.target.value as TaskImportance)}>{(Object.keys(taskImportanceLabels) as TaskImportance[]).map(key => <option key={key} value={key}>{taskImportanceLabels[key]}</option>)}</select></label>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="block text-sm">开始时间<div className="flex gap-2"><input className={inputClass} inputMode="numeric" placeholder="YYYY/MM/DD" value={startDate} onChange={e => setStartDate(e.target.value)} onBlur={() => { const date = parseDateInput(startDate); if (date) setStartDate(date); }} /><input className="w-28 rounded-lg border border-input bg-background px-2" type="time" value={startTime} onChange={e => setStartTime(e.target.value)} /></div></label>
          <label className="block text-sm">截止时间<div className="flex gap-2"><input className={inputClass} inputMode="numeric" placeholder="YYYY/MM/DD" value={endDate} onChange={e => setEndDate(e.target.value)} onBlur={() => { const date = parseDateInput(endDate); if (date) setEndDate(date); }} /><input className="w-28 rounded-lg border border-input bg-background px-2" type="time" value={endTime} onChange={e => setEndTime(e.target.value)} /></div></label>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={longTerm} onChange={e => setLongTerm(e.target.checked)} />作为长远目标（按 DDL 倒计时）</label>
        {tags.length > 0 && <fieldset><legend className="text-sm mb-2">标签</legend><div className="flex flex-wrap gap-2">{tags.map(tag => <label key={tag.id} className="rounded-full border px-3 py-1 text-xs"><input type="checkbox" checked={selectedTags.includes(tag.id)} onChange={e => setSelectedTags(current => e.target.checked ? [...current, tag.id] : current.filter(id => id !== tag.id))} /> #{tag.name}</label>)}</div></fieldset>}
        <label className="block text-sm">备注<textarea className={inputClass} rows={3} value={description} onChange={e => setDescription(e.target.value)} /></label>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-lg border px-4 py-2">取消</button><button type="submit" disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50">{saving ? '保存中…' : '保存修改'}</button></div>
      </form>
    </DialogContent>
  </Dialog>;
}
