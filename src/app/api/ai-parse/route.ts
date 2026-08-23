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

const systemPrompt = `你是一个专业的待办事项与大学课程表解析助手。你的任务是从用户输入的文本（可能是教务系统课程表、活动通知、作业布置等）中提取结构化的待办任务信息。

请仔细分析文本内容，为每一条日程提取以下字段：
1. title: 任务标题（必须提取具体的课程/任务名称，如"高等数学"、"数据结构与算法"、"概率论与数理统计"等，禁止用"课程"、"8:00-9:40 课程"这类笼统描述作为标题）
2. description: 任务描述（补充细节，如教室地点、教师姓名、课程QQ、考核方式等，格式如"教师：王浩宇；地点：苏教B201"）
3. task_type: 任务类型，可选值：course（课程）、homework（作业）、exam（考试）、activity（活动）、personal（个人）
4. priority: 优先级，可选值：low（低）、medium（中）、high（高）、urgent（紧急）
5. importance: 重要程度，可选值：normal（普通）、important（重要）、very_important（非常重要）
6. start_time: 开始时间（ISO格式）
7. end_time: 截止时间（ISO格式）

判断规则：
- 作业/习题/论文/提交 → homework
- 课程/上课/讲座/实验课 → course
- 考试/测验/期中/期末/考核 → exam
- 活动/比赛/会议/聚会/讲座 → activity
- 个人/其他 → personal

【大学标准课时表（节次 → 时间）】
第1-2节: 08:00-09:40
第3-4节: 10:00-11:40
第5-6节: 14:00-15:40
第7-8节: 16:00-17:40
第9-10节: 19:00-20:40
第11-12节: 20:50-22:30
如果时间段跨多个节次（如"5-7节"），start_time 取第一节开始时间（14:00），end_time 取最后一节结束时间（17:40）。

【教务系统课程表格式解析 - 非常重要】
课程表常见的三种格式：
1. "周一 7-8节 2周,6周,10周,14周 苏教B201" —— 周一，第7-8节，第2/6/10/14周上课，地点苏教B201
2. "周二 5-7节 1-18周 苏教B203" —— 周二，第5-7节，第1到18周每周上课，地点苏教B203
3. "周四 3-4节 1-18周 苏教A207,周四 3-4节 1-18周 苏教A207" —— 同一门课可能有多条时间（逗号分隔），每条都要生成一个任务
4. "自由时间 2-18周 自由地点" —— 表示自由学习时间，跳过不生成任务
5. "周五 3-4节 1-17周(单) 苏教B201" —— "(单)"表示单周上课（1,3,5...17），"(双)"表示双周上课（2,4,6...）

【周次换算规则 - 极其重要】
- 用户会提供"开学日期"（第1周的周一日期）和学期总周数。
- "第N周"换算：第N周的周X日期 = 开学日期的周一 + (N-1)*7天 + (X-1)天，其中周一=0、周二=1、周三=2、周四=3、周五=4、周六=5、周日=6。
- 例：开学日期 2026-08-24（周一），则：
  - 第1周周一 = 2026-08-24
  - 第1周周二 = 2026-08-25
  - 第2周周一 = 2026-08-31
  - 第2周周四 = 2026-09-03
- 对"1-18周"展开：生成第1周到第18周共18个任务（每周一条）。
- 对"2周,6周,10周,14周"：生成第2/6/10/14周共4个任务。
- 对"1-17周(单)"：生成第1,3,5,7,9,11,13,15,17周共9个任务。
- 对"1-17周(双)"：生成第2,4,6,8,10,12,14,16周共8个任务。
- 禁止把不同周次、不同星期的课程都解析成同一天！

【输出要求】
- 只返回一个 JSON 对象数组，不要有任何额外的解释文字。
- 任务按 start_time 先后排序。
- 同一门课有多个时间段的，生成多条记录。
- 所有时间必须输出带 +08:00 时区的 ISO 格式，例如 "2026-08-24T08:00:00+08:00"。

JSON 格式示例：
[{
  "title": "数据结构与算法",
  "description": "教师：单彩峰,王贝贝；地点：苏教A207",
  "task_type": "course",
  "priority": "medium",
  "importance": "important",
  "start_time": "2026-08-25T10:00:00+08:00",
  "end_time": "2026-08-25T11:40:00+08:00"
}, {
  "title": "数据结构与算法",
  "description": "教师：单彩峰,王贝贝；地点：苏教A207",
  "task_type": "course",
  "priority": "medium",
  "importance": "important",
  "start_time": "2026-08-27T10:00:00+08:00",
  "end_time": "2026-08-27T11:40:00+08:00"
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
    
    // 开学日期与学期周数（前端可选传入，默认 2026-08-24 第1周周一，18周）
    const semesterStart = body?.semesterStart || '2026-08-24';
    const semesterWeeks = body?.weeks || 18;
    const now = new Date().toISOString();
    const userPrompt = `当前时间：${now}

本学期开学日期（第1周的周一）：${semesterStart}
学期总周数：${semesterWeeks}

请解析以下文本，提取待办任务（课程表请按周次展开为每周一条）：

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
        .replace(/^第\d+-\d+节\s*/g, '')
        .trim();
      if (!cleaned.title || cleaned.title === '课程' || /^[课]?程$/.test(cleaned.title) || /^地点|^教室|^未知/.test(cleaned.title)) {
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

    // 去重：按 标题 + 开始时间 去重（课程表同一门课同一天同一时段只保留一条）
    const seen = new Set<string>();
    const dedupedTasks = cleanedTasks.filter(task => {
      const key = `${task.title}|${task.start_time || ''}|${task.end_time || ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return NextResponse.json({ tasks: dedupedTasks });
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
