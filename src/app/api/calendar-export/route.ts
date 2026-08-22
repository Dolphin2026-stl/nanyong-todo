import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export const dynamic = 'force-dynamic';

function formatICSDate(dateStr: string | undefined): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function escapeICS(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

const taskTypeLabels: Record<string, string> = {
  course: '课程',
  homework: '作业',
  exam: '考试',
  activity: '活动',
  personal: '个人',
};

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('x-session') ?? undefined;
    const supabase = getSupabaseClient(token);
    
    // 获取所有未完成任务
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('is_completed', false)
      .order('end_time', { ascending: true, nullsFirst: false });
    
    if (error) throw error;
    
    // 生成 ICS 内容
    const now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
    
    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//NanyongToDo//CN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:南雍待办',
      'X-WR-TIMEZONE:Asia/Shanghai',
      '',
    ].join('\r\n');
    
    for (const task of tasks) {
      const endTime = task.end_time || task.start_time;
      if (!endTime) continue; // 没有时间的任务不导出
      
      const startTime = task.start_time || task.end_time;
      const typeLabel = taskTypeLabels[task.task_type] || '待办';
      
      icsContent += [
        'BEGIN:VEVENT',
        `UID:${task.id}@nanyongtodo`,
        `DTSTAMP:${now}`,
        `DTSTART:${formatICSDate(startTime)}`,
        `DTEND:${formatICSDate(endTime)}`,
        `SUMMARY:【${typeLabel}】${escapeICS(task.title)}`,
        task.description ? `DESCRIPTION:${escapeICS(task.description)}` : '',
        `CATEGORIES:${typeLabel}`,
        'END:VEVENT',
        '',
      ].filter(Boolean).join('\r\n');
    }
    
    icsContent += 'END:VCALENDAR';
    
    return new NextResponse(icsContent, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'attachment; filename="nanyong-todo.ics"',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '导出失败' },
      { status: 500 }
    );
  }
}
