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

const systemPrompt = `你是一个专业的待办事项解析助手。你的任务是从用户输入的文本中提取结构化的待办任务信息。

请仔细分析文本内容，提取以下字段：
1. title: 任务标题（简洁明了）
2. description: 任务描述（可选，补充细节）
3. task_type: 任务类型，可选值：course（课程）、homework（作业）、exam（考试）、activity（活动）、personal（个人）
4. priority: 优先级，可选值：low（低）、medium（中）、high（高）、urgent（紧急）
5. importance: 重要程度，可选值：normal（普通）、important（重要）、very_important（非常重要）
6. start_time: 开始时间（ISO格式，如未明确提到则不填）
7. end_time: 截止时间（ISO格式，如未明确提到则不填）

判断规则：
- 作业/习题/论文 → homework
- 课程/上课/讲座 → course
- 考试/测验/期中/期末 → exam
- 活动/比赛/会议/聚会 → activity
- 个人/其他 → personal

时间判断：
- 如果文本提到"今天"、"明天"等相对时间，请根据当前时间推算为具体日期
- 当前时间由用户提供
- 时间默认为当天 23:59，如果明确提到具体时间则使用具体时间

请只返回一个 JSON 对象数组，不要有任何额外的解释文字。如果能提取出多个任务就返回多个，只能提取出一个就返回单个元素的数组。

JSON 格式示例：
[{
  "title": "高等数学作业",
  "description": "第三章课后习题 1-10",
  "task_type": "homework",
  "priority": "high",
  "importance": "important",
  "end_time": "2024-01-15T23:59:00+08:00"
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

    return NextResponse.json({ tasks: validTasks });
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
