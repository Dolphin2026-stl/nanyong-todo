import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface ParsedTask {
  title: string;
  description?: string;
  task_type: 'course' | 'homework' | 'exam' | 'activity' | 'personal';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  importance: 'normal' | 'important' | 'very_important';
  start_time?: string;
  end_time?: string;
}

const systemPrompt = `你是一个专业的待办事项与课程表解析助手。你的任务是从用户输入的文本（可能是课程表、活动通知、作业布置等）中提取结构化的待办任务信息。

请仔细分析文本内容，为每一条日程提取以下字段：
1. title: 任务标题（必须提取具体的名称，如"高等数学"、"大学英语"、"数据结构作业"、"线性代数考试"等，禁止用"课程"、"8:00-9:40 课程"这类笼统描述作为标题）
2. description: 任务描述（可选，如教室地点、章节范围、补充细节等）
3. task_type: 任务类型，可选值：course（课程）、homework（作业）、exam（考试）、activity（活动）、personal（个人）
4. priority: 优先级，可选值：low（低）、medium（中）、high（高）、urgent（紧急）
5. importance: 重要程度，可选值：normal（普通）、important（重要）、very_important（非常重要）
6. start_time: 开始时间（ISO格式，如未明确提到则不填）
7. end_time: 截止时间（ISO格式，如未明确提到则不填）

判断规则：
- 作业/习题/论文/提交 → homework
- 课程/上课/讲座/实验课 → course
- 考试/测验/期中/期末/考核 → exam
- 活动/比赛/会议/聚会/讲座 → activity
- 个人/其他 → personal

【时间换算规则 - 非常重要】
- 用户输入中"周一、周二、星期三、周五"等星期词，必须根据用户提供的"当前时间"换算成最近一个未来的对应日期（如果今天是周四，提到"周五"就是明天，提到"周一"就是下周一；如果今天恰好是该星期，则取今天）。
- 用户输入中"今天"→当前日期，"明天"→当前日期+1天，"后天"→当前日期+2天，"下周X"→下一周的对应星期。
- 时间格式：如果文本是"8:00-9:40"或"8:00~9:40"或"第1-2节"，则 start_time 为该日 08:00（如果给了具体时间则用具体时间），end_time 为该日结束时间。
- 如果只给了开始时间没给结束时间，课程默认时长 1 小时 40 分钟（100分钟）作为 end_time；其他类型默认 1 小时。
- 所有时间必须输出带 +08:00 时区的 ISO 格式，例如 "2026-08-24T08:00:00+08:00"。
- 禁止把不同的星期几全部解析成同一天。

请只返回一个 JSON 对象数组，不要有任何额外的解释文字。如果能提取出多个任务就返回多个，只能提取出一个就返回单个元素的数组。任务按时间先后排序。

JSON 格式示例：
[{
  "title": "高等数学",
  "description": "三教301",
  "task_type": "course",
  "priority": "medium",
  "importance": "normal",
  "start_time": "2026-08-24T08:00:00+08:00",
  "end_time": "2026-08-24T09:40:00+08:00"
}, {
  "title": "线性代数考试",
  "description": "一教101",
  "task_type": "exam",
  "priority": "high",
  "importance": "very_important",
  "start_time": "2026-08-28T09:00:00+08:00",
  "end_time": "2026-08-28T11:00:00+08:00"
}]`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const text = body?.text;
    
    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: '请输入要解析的文本' }, { status: 400 });
    }

    // 提取转发头
    let customHeaders: Record<string, string> = {};
    try {
      const extracted = HeaderUtils.extractForwardHeaders(request.headers);
      if (extracted && typeof extracted === 'object') {
        customHeaders = extracted as Record<string, string>;
      }
    } catch {
      customHeaders = {};
    }
    
    // 构建配置
    const apiKey = body?.apiKey;
    const baseUrl = body?.baseUrl;
    const model = body?.model;
    
    let config: Config;
    if (apiKey && baseUrl) {
      config = new Config({
        apiKey: String(apiKey),
        baseUrl: String(baseUrl),
        timeout: 60000,
      });
    } else {
      config = new Config({
        timeout: 60000,
      });
    }

    const client = new LLMClient(config, customHeaders);
    
    const now = new Date().toISOString();
    const userPrompt = `当前时间：${now}

请解析以下文本，提取待办任务：

"${text}"

请直接返回 JSON 数组，不要包含任何额外文字。`;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: userPrompt },
    ];

    // 使用 stream 方式收集完整响应（invoke 在 Next.js 环境有兼容性问题）
    const stream = client.stream(messages, {
      model: model || 'doubao-seed-2-0-mini-260215',
      temperature: 0.3,
    });
    
    let rawContent = '';
    for await (const chunk of stream) {
      if (chunk && typeof chunk.content !== 'undefined' && chunk.content !== null) {
        rawContent += chunk.content.toString();
      }
    }

    if (!rawContent || typeof rawContent !== 'string') {
      return NextResponse.json({ error: 'AI 返回内容无效' }, { status: 500 });
    }
    
    let content = rawContent.trim();
    
    // 移除可能的 markdown 代码块标记
    content = content.replace(/```json\s*/g, '').replace(/```\s*$/g, '').trim();
    
    // 尝试提取 JSON 数组
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      content = jsonMatch[0];
    }
    
    let parsedTasks: ParsedTask[];
    try {
      parsedTasks = JSON.parse(content);
    } catch {
      // 如果解析失败，尝试包装成数组
      try {
        parsedTasks = [JSON.parse(content)];
      } catch {
        return NextResponse.json({ error: 'AI 返回格式解析失败，请重试' }, { status: 500 });
      }
    }

    if (!Array.isArray(parsedTasks)) {
      return NextResponse.json({ error: 'AI 返回格式解析失败' }, { status: 500 });
    }

    // 验证数据结构
    const validTasks = parsedTasks.filter(task => 
      task && typeof task.title === 'string' && task.title.length > 0
    ).map(task => ({
      title: task.title,
      description: task.description || '',
      task_type: ['course', 'homework', 'exam', 'activity', 'personal'].includes(task.task_type) ? task.task_type : 'personal',
      priority: ['low', 'medium', 'high', 'urgent'].includes(task.priority) ? task.priority : 'medium',
      importance: ['normal', 'important', 'very_important'].includes(task.importance) ? task.importance : 'normal',
      start_time: task.start_time || undefined,
      end_time: task.end_time || undefined,
    }));

    if (validTasks.length === 0) {
      return NextResponse.json({ error: '未能从文本中提取出有效任务，请尝试更详细的描述' }, { status: 400 });
    }

    // 后端兜底校正：清理标题中的笼统描述（如"8:00-9:40 课程"→"课程"），并校正时间
    const cleanedTasks = validTasks.map(task => {
      const cleaned = { ...task };
      // 标题清理：去掉时间前缀和"课程"占位
      cleaned.title = cleaned.title
        .replace(/^\d{1,2}[:：]\d{2}\s*[-~至]\s*\d{1,2}[:：]\d{2}\s*/g, '')
        .replace(/^\d{1,2}[:：]\d{2}\s*/g, '')
        .trim();
      if (!cleaned.title || cleaned.title === '课程' || /^[课]?程$/.test(cleaned.title)) {
        cleaned.title = task.description && task.description.length > 2 ? task.description.split(/[\s,，、]/)[0] : '待办事项';
      }
      // 时间校正：确保 start < end，且时间有效
      if (cleaned.start_time) {
        const s = new Date(cleaned.start_time);
        if (isNaN(s.getTime())) cleaned.start_time = undefined;
      }
      if (cleaned.end_time) {
        const e = new Date(cleaned.end_time);
        if (isNaN(e.getTime())) cleaned.end_time = undefined;
      }
      if (cleaned.start_time && cleaned.end_time) {
        const s = new Date(cleaned.start_time).getTime();
        const e = new Date(cleaned.end_time).getTime();
        if (e <= s) {
          // 结束时间不晚于开始时间：如果是课程默认加100分钟，否则加60分钟
          const defaultMin = cleaned.task_type === 'course' ? 100 : 60;
          cleaned.end_time = new Date(s + defaultMin * 60 * 1000).toISOString();
        }
      }
      return cleaned;
    });

    return NextResponse.json({ tasks: cleanedTasks });
  } catch (err: unknown) {
    console.error('AI Parse error:', err);
    let message = '解析失败，请重试';
    if (err && typeof err === 'object' && 'message' in err) {
      const m = (err as { message?: unknown }).message;
      if (typeof m === 'string') {
        message = m;
      }
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
