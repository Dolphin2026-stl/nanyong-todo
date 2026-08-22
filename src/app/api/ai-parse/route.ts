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
  location?: string;
  tags?: string[];
}

<<<<<<< HEAD
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
=======
const systemPrompt = `你是一个专业的大学课程表与待办事项解析专家。你的任务是从用户输入的文本中精准提取结构化的待办任务信息。

## 核心原则（极其重要，必须严格遵守）
1. **标题永远是任务/课程的名称**，绝对不能把时间、地点或其他信息作为标题！
   - ❌ 错误：title: "8:00-9:40"
   - ✅ 正确：title: "高等数学"
2. **课程表中的每一行/每一条目都是一个独立的课程任务**，需要逐条解析
3. **时间信息放在 start_time 和 end_time 字段**，不要混入标题
4. **地点信息放在 location 字段**（可选），不要混入标题

## 字段定义
- **title**: 任务标题（必填）。必须是课程名/作业名/活动名等实质性名称，简洁明了，不包含时间、地点
- **description**: 任务描述（可选）。补充细节，如章节、地点、老师、周次等
- **task_type**: 任务类型，枚举值：course（课程/上课/讲座）、homework（作业/习题/论文/报告）、exam（考试/测验/期中/期末）、activity（活动/比赛/会议/聚会/讲座）、personal（个人/其他）
- **priority**: 优先级，枚举值：low（低）、medium（中）、high（高）、urgent（紧急）
- **importance**: 重要程度，枚举值：normal（普通）、important（重要）、very_important（非常重要）
- **start_time**: 开始时间（ISO 8601 格式，带时区）
- **end_time**: 结束时间（ISO 8601 格式，带时区）
- **location**: 地点/教室（可选）
- **tags**: 标签数组（可选）

## 类型判断规则
- 课程/上课/第X节/课表中的条目 → course，优先级 medium，重要程度 important
- 作业/习题/论文/报告/提交 → homework，优先级 high，重要程度 important
- 考试/测验/期中/期末/补考 → exam，优先级 urgent，重要程度 very_important
- 活动/比赛/会议/聚会/讲座/报告 → activity，优先级 medium，重要程度 normal
- 个人事务/其他 → personal

## 时间解析规则（极其重要）
1. **当前时间**：用户会提供当前时间作为参考
2. **课程表规则**：
   - 提到"周X"或"星期X"：表示本周对应的那一天
   - 提到"第X节"：需要根据常见大学课时推算（第1节=8:00-9:40，第2节=10:00-11:40，第3节=14:00-15:40，第4节=16:00-17:40，第5节=19:00-20:40）
   - 提到"8:00-9:40"这样的时间段：直接使用
   - 只提到日期没提到具体时间：默认为全天课程（start_time 为当天 8:00，end_time 为当天 17:30）
3. **相对时间**：
   - 今天/今日 → 今天
   - 明天/明日 → 明天
   - 后天 → 后天
   - 下周一/下星期X → 下一周对应的那一天
   - 本周X → 本周对应的那一天
4. **日期格式**：
   - 支持"3月15日"、"2024-03-15"、"3/15"等格式
   - 只有月份和日期没有年份时，默认为今年
5. **时间默认值**：
   - 作业截止时间：如果只说了日期没说具体时间，默认为当天 23:59
   - 考试/活动：如果只说了日期没说时间，默认 start_time 和 end_time 相同（全天标记）
6. **时区**：统一使用 +08:00（北京时间）

## 课程表解析特殊规则
当文本看起来是课程表（包含多门课程、星期、节次等信息）时：
1. 按每门课逐条解析，不要合并
2. 标题 = 课程名称（如"高等数学"、"大学英语"）
3. description 中包含：老师姓名、周次、地点、学分等补充信息
4. location 字段放教室/地点
5. 时间根据"周X 第X节"或"周X HH:MM-HH:MM"推算
6. 如果是周期性课程（如每周一都有），只生成最近一次（本周）的任务

## 输出要求
- 只返回一个 JSON 数组，不要任何额外的解释文字、Markdown、代码块标记
- 如果能提取出多个任务就返回多个，只能提取出一个就返回单个元素的数组
- 严格按照字段定义返回，不要添加额外字段
- 确保 JSON 格式合法，字符串使用双引号

## 示例

### 示例1：课程表文本
输入：
"周一第1-2节 高等数学 张教授 教1-201
周一第3-4节 大学英语 李老师 教2-305
周三第5-6节 计算机基础 王老师 实验楼A301"

输出：
[
  {"title":"高等数学","description":"张教授，教1-201","task_type":"course","priority":"medium","importance":"important","start_time":"2024-03-11T08:00:00+08:00","end_time":"2024-03-11T09:40:00+08:00","location":"教1-201"},
  {"title":"大学英语","description":"李老师，教2-305","task_type":"course","priority":"medium","importance":"important","start_time":"2024-03-11T10:00:00+08:00","end_time":"2024-03-11T11:40:00+08:00","location":"教2-305"},
  {"title":"计算机基础","description":"王老师，实验楼A301","task_type":"course","priority":"medium","importance":"important","start_time":"2024-03-13T14:00:00+08:00","end_time":"2024-03-13T15:40:00+08:00","location":"实验楼A301"}
]

### 示例2：混合内容
输入：
"各位同学请注意：
1. 高等数学第三章作业周五之前提交
2. 下周一上午10点期中考试，地点教1-101
3. 本周六下午2点学生会招新活动"

输出：
[
  {"title":"高等数学第三章作业","description":"第三章课后习题","task_type":"homework","priority":"high","importance":"important","end_time":"2024-03-15T23:59:00+08:00"},
  {"title":"高等数学期中考试","description":"教1-101","task_type":"exam","priority":"urgent","importance":"very_important","start_time":"2024-03-18T10:00:00+08:00","end_time":"2024-03-18T11:40:00+08:00","location":"教1-101"},
  {"title":"学生会招新活动","task_type":"activity","priority":"medium","importance":"normal","start_time":"2024-03-16T14:00:00+08:00","end_time":"2024-03-16T17:00:00+08:00"}
]

### 示例3：单条通知
输入："明天下午2点-4点 图书馆报告厅 创新创业讲座"

输出：
[{"title":"创新创业讲座","description":"图书馆报告厅","task_type":"activity","priority":"medium","importance":"normal","start_time":"2024-03-13T14:00:00+08:00","end_time":"2024-03-13T16:00:00+08:00","location":"图书馆报告厅"}]`;

// 大学标准课时表（用于后处理兜底）
const classPeriods: Record<number, { start: string; end: string }> = {
  1: { start: '08:00', end: '09:40' },
  2: { start: '10:00', end: '11:40' },
  3: { start: '14:00', end: '15:40' },
  4: { start: '16:00', end: '17:40' },
  5: { start: '19:00', end: '20:40' },
};
>>>>>>> a2940af (fix: AI 课程表解析质量全面优化)

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
    
    const now = new Date();
    const nowStr = now.toISOString();
    const weekday = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][now.getDay()];
    const userPrompt = `当前时间：${nowStr}（北京时间，${weekday}）

请仔细解析以下文本，提取所有待办任务：

"""
${text}
"""

请严格按照系统提示中的规则解析。特别注意：
1. 标题必须是课程/任务的名称，绝对不能把时间（如 8:00-9:40）当标题
2. 如果是课程表，每门课单独成一条
3. 时间字段必须是合法的 ISO 8601 格式

直接返回 JSON 数组，不要任何额外文字。`;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: userPrompt },
    ];

    // 使用 stream 方式收集完整响应
    const stream = client.stream(messages, {
      model: model || 'doubao-seed-2-0-mini-260215',
      temperature: 0.2,
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
    
    // 多层清理：移除 markdown 代码块、多余文本
    content = content.replace(/```json\s*/gi, '').replace(/```\s*$/g, '').trim();
    content = content.replace(/^[\s\S]*?\[/, '[').replace(/\][\s\S]*?$/, ']');
    
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

    // 后处理：校验和修正数据
    const validTasks = parsedTasks
      .filter(task => {
        if (!task || typeof task.title !== 'string' || task.title.trim().length === 0) {
          return false;
        }
        // 过滤掉明显是时间格式的标题（兜底修复）
        const title = task.title.trim();
        if (/^\d{1,2}[:：]\d{2}\s*[-~～]\s*\d{1,2}[:：]\d{2}$/.test(title)) {
          return false; // 纯时间段不作为标题
        }
        if (/^第\d+[-~～]\d+节$/.test(title)) {
          return false; // 纯节次不作为标题
        }
        return true;
      })
      .map(task => {
        // 标准化字段
        const result: ParsedTask = {
          title: task.title.trim(),
          description: task.description || '',
          task_type: (['course', 'homework', 'exam', 'activity', 'personal'].includes(task.task_type) 
            ? task.task_type 
            : 'personal') as ParsedTask['task_type'],
          priority: (['low', 'medium', 'high', 'urgent'].includes(task.priority) 
            ? task.priority 
            : 'medium') as ParsedTask['priority'],
          importance: (['normal', 'important', 'very_important'].includes(task.importance) 
            ? task.importance 
            : 'normal') as ParsedTask['importance'],
        };
        
        // 验证并修正时间格式
        if (task.start_time && isValidISO(task.start_time)) {
          result.start_time = task.start_time;
        }
        if (task.end_time && isValidISO(task.end_time)) {
          result.end_time = task.end_time;
        }
        
        // 如果有 location 就带上
        if (task.location && typeof task.location === 'string') {
          result.location = task.location;
        }
        
        return result;
      });

    if (validTasks.length === 0) {
      return NextResponse.json(
        { error: '未能从文本中解析出有效任务，请检查文本内容或尝试手动添加' }, 
        { status: 422 }
      );
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
    console.error('AI 解析错误:', err);
    const errorMessage = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json(
      { error: `AI 解析失败：${errorMessage}` },
      { status: 500 }
    );
  }
}

function isValidISO(str: string): boolean {
  if (typeof str !== 'string') return false;
  const date = new Date(str);
  return !isNaN(date.getTime()) && str.length >= 10;
}
