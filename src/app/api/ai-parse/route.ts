import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface RawCourse {
  title: string;
  description?: string;
  task_type?: string;
  priority?: string;
  importance?: string;
  // 课程结构化字段（AI 只返回这些，周次由后端展开）
  weekday?: number | string;
  start_section?: number;
  end_section?: number;
  weeks?: string;
  location?: string;
  // 一次性任务字段
  start_time?: string;
  end_time?: string;
}

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

请仔细分析文本内容，为每一条日程输出以下字段：
1. title: 任务标题（必须提取具体的课程/任务名称，如"数据结构与算法"、"概率论与数理统计"等，禁止用"课程"、"8:00-9:40 课程"这类笼统描述作为标题）
2. description: 任务描述（补充细节，如教师姓名、课程QQ、考核方式等）
3. task_type: 任务类型，可选值：course（课程）、homework（作业）、exam（考试）、activity（活动）、personal（个人）
4. priority: 优先级，可选值：low（低）、medium（中）、high（高）、urgent（紧急）
5. importance: 重要程度，可选值：normal（普通）、important（重要）、very_important（非常重要）

判断规则：
- 作业/习题/论文/提交 → homework
- 课程/上课/讲座/实验课 → course
- 考试/测验/期中/期末/考核 → exam
- 活动/比赛/会议/聚会/讲座 → activity
- 个人/其他 → personal

【课程表解析规则 - 极其重要】
当文本是课程表时（包含"周X"、"第X-Y节"、"X周"等信息），每条上课时间输出为一个对象，并使用以下结构化字段，**不要展开周次**：
- weekday: 星期几，**用中文输出**："周一"、"周二"、"周三"、"周四"、"周五"、"周六"、"周日"（不要用数字！）
- start_section: 开始节次（数字，如第7-8节则 start_section=7）
- end_section: 结束节次（数字，如第7-8节则 end_section=8）
- weeks: 周次表达式，原样保留，如 "1-18"、"2,6,10,14"、"1-17(单)"、"1-17(双)"
- location: 上课地点（如"苏教B201"、"南雍-西209"）
- 课程的时间描述放在 title 和 location/weekday 等字段中，不要写进 description（description 只放教师、QQ、考核方式等额外信息）

课程表常见格式示例：
1. "周一 7-8节 2周,6周,10周,14周 苏教B201 形势与政策" → weekday="周一", start_section=7, end_section=8, weeks="2,6,10,14", location="苏教B201", title="形势与政策"
2. "周二 5-7节 1-18周 苏教B203 习近平新时代中国特色社会主义思想概论" → weekday="周二", start_section=5, end_section=7, weeks="1-18", location="苏教B203"
3. "周四 3-4节 1-18周 苏教A207"（同一门课有多个时间段，逗号分隔）→ 每个时间段单独输出一个对象
4. "自由时间 2-18周 自由地点" → 跳过，不输出
5. "周五 3-4节 1-17周(单) 苏教B201" → weekday="周五", weeks="1-17(单)"

【一次性任务规则】
考试、作业、活动等一次性任务直接输出：
- start_time: 开始时间（ISO格式，带+08:00时区）
- end_time: 截止时间（ISO格式）
- 如果文本提到"今天"、"明天"或具体日期，换算成具体日期；提到"第N周"的考试，根据用户提供的开学日期（第1周周一）推算。

【输出要求】
- 只返回一个 JSON 对象数组，不要有任何额外的解释文字。
- 课程类任务按上述结构化字段输出（不展开周次，不填 start_time/end_time）。
- 一次性任务填 start_time/end_time。
- 同一门课有多个时间段的，输出多条记录。

JSON 格式示例：
[{
  "title": "数据结构与算法",
  "description": "教师：单彩峰,王贝贝",
  "task_type": "course",
  "priority": "medium",
  "importance": "important",
  "weekday": "周二",
  "start_section": 3,
  "end_section": 4,
  "weeks": "1-18",
  "location": "苏教A207"
}, {
  "title": "线性代数期中考试",
  "description": "一教101",
  "task_type": "exam",
  "priority": "urgent",
  "importance": "very_important",
  "start_time": "2026-10-15T09:00:00+08:00",
  "end_time": "2026-10-15T11:00:00+08:00"
}]`;

/** 大学课时表：节次段 → 起止时间 */
function sectionTime(section: number): { start: string; end: string } {
  if (section <= 2) return { start: '08:00', end: '09:40' };
  if (section <= 4) return { start: '10:00', end: '11:40' };
  if (section <= 6) return { start: '14:00', end: '15:40' };
  if (section <= 8) return { start: '16:00', end: '17:40' };
  if (section <= 10) return { start: '19:00', end: '20:40' };
  return { start: '20:50', end: '22:30' };
}

/** 解析周次表达式 → 周次数组 */
function expandWeeks(expr: string, totalWeeks: number): number[] {
  // 去"周"字（保留 单/双 标记），如 "1-18周" → "1-18"，"2周,6周,10周,14周" → "2,6,10,14"
  const e = (expr || '').trim().replace(/(\d)周/g, '$1');
  if (!e || e === '自由时间' || /自由/i.test(e)) return [];
  const oddMatch = e.match(/^(\d+)-(\d+)周?\(单\)$/);
  const evenMatch = e.match(/^(\d+)-(\d+)周?\(双\)$/);
  if (oddMatch || evenMatch) {
    const m = oddMatch || evenMatch!;
    const start = parseInt(m[1], 10);
    const end = Math.min(parseInt(m[2], 10), totalWeeks);
    const isOdd = !!oddMatch;
    const weeks: number[] = [];
    for (let w = start; w <= end; w++) {
      if ((isOdd && w % 2 === 1) || (!isOdd && w % 2 === 0)) weeks.push(w);
    }
    return weeks;
  }
  const range = e.match(/^(\d+)-(\d+)$/);
  if (range) {
    const start = parseInt(range[1], 10);
    const end = Math.min(parseInt(range[2], 10), totalWeeks);
    const weeks: number[] = [];
    for (let w = start; w <= end; w++) weeks.push(w);
    return weeks;
  }
  return e
    .split(/[,，、\s]+/)
    .map(x => parseInt(x, 10))
    .filter(n => !isNaN(n) && n >= 1 && n <= totalWeeks);
}

/** 解析 weekday 为数字 0-6 */
function parseWeekday(v: number | string | undefined): number | null {
  if (v === undefined || v === null || v === '') return null;
  const map: Record<string, number> = {
    '周一': 0, '星期二': 1, '周三': 2, '周四': 3, '周五': 4, '周六': 5, '周日': 6,
    '星期一': 0, '周二': 1, '星期三': 2, '星期四': 3, '星期五': 4, '星期六': 5, '星期日': 6,
    '一': 0, '二': 1, '三': 2, '四': 3, '五': 4, '六': 5, '日': 6, '天': 6,
  };
  if (typeof v === 'number') return v >= 0 && v <= 6 ? v : null;
  const s = String(v).trim();
  if (map[s] !== undefined) return map[s];
  const n = parseInt(s, 10);
  return !isNaN(n) && n >= 0 && n <= 6 ? n : null;
}

/** 计算第 weekNo 周 weekday 对应的日期字符串 YYYY-MM-DD（semesterStart 为第1周周一，纯 UTC 运算避免服务器时区偏移） */
function weekDateStr(semesterStart: string, weekNo: number, weekday: number): string {
  const [y, m, d] = semesterStart.split('-').map(Number);
  // 用 Date.UTC 做纯日期运算（不受服务器本地时区影响）
  const base = Date.UTC(y, m - 1, d);
  const target = new Date(base + ((weekNo - 1) * 7 + weekday) * 86400000);
  const yy = target.getUTCFullYear();
  const mm = String(target.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(target.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

/** 剥离 HTML 标签，提取可见文本（应对用户直接粘贴网页表格 HTML） */
function stripHtml(input: string): string {
  return input
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

/** 从 HTML 的 td 中提取文本（优先 title 属性，否则去标签） */
function tdText(td: string): string {
  const titleMatch = td.match(/title="([^"]*)"/);
  if (titleMatch) return titleMatch[1].trim();
  return td.replace(/<[^>]+>/g, '').replace(/&nbsp;/gi, ' ').trim();
}

/** 课程表 HTML 表格解析：<tr> 行 → td[2]课程名, td[4]教师, td[6]时间 */
function parseTimetableHtml(html: string, semesterStart: string, semesterWeeks: number): ParsedTask[] | null {
  const rows = html.match(/<tr[\s\S]*?<\/tr>/gi);
  if (!rows || rows.length === 0) return null;

  const tasks: ParsedTask[] = [];
  for (const row of rows) {
    const tds = row.match(/<td[\s\S]*?<\/td>/gi) || [];
    if (tds.length < 7) continue;

    const courseName = tdText(tds[2]);
    const teacher = tdText(tds[4]);
    const timeText = tdText(tds[6]);
    if (!courseName || !timeText) continue;

    // 全局匹配所有上课时间（同一门课可能多个时段，逗号分隔）
    // 周次列表（如 "2周,6周,10周,14周"）由 [0-9,，\-]+ 整体匹配，不会被误切
    const timeRe = /(周[一二三四五六日天])\s*(\d{1,2})-(\d{1,2})节\s*((?:[0-9,，\-]+周(?:\([单双]\))?)(?:[，,][0-9,，\-]+周(?:\([单双]\))?)*)\s+([^\s，,]+)/g;
    let tm;
    while ((tm = timeRe.exec(timeText)) !== null) {
      const weekday = parseWeekday(tm[1]);
      if (weekday === null) continue;
      const startSec = parseInt(tm[2], 10);
      const endSec = Math.max(parseInt(tm[3], 10), startSec);
      const weeks = expandWeeks(tm[4], semesterWeeks);
      if (weeks.length === 0) continue;
      const st = sectionTime(startSec);
      const et = sectionTime(endSec);
      const location = tm[5];
      const descParts: string[] = [];
      if (teacher) descParts.push(`教师：${teacher}`);
      if (location) descParts.push(`地点：${location}`);
      for (const w of weeks) {
        const dateStr = weekDateStr(semesterStart, w, weekday);
        tasks.push({
          title: courseName.replace(/（.*?）|\(.*?\)/g, '').replace(/\d+班$/g, '').trim(),
          description: descParts.join('；'),
          task_type: 'course',
          priority: 'medium',
          importance: 'important',
          start_time: `${dateStr}T${st.start}:00+08:00`,
          end_time: `${dateStr}T${et.end}:00+08:00`,
        });
      }
    }
  }
  return tasks.length > 0 ? tasks : null;
}

/** 纯文本课程表解析："周一 7-8节 2周,6周,10周,14周 苏教B201 课程名" */
function parseTimetableText(text: string, semesterStart: string, semesterWeeks: number): ParsedTask[] | null {
  let courseCount = 0;
  const tasks: ParsedTask[] = [];

  // 全局匹配所有课程时段；周次列表（2周,6周,10周,14周）由 [0-9,，\-]+ 整体匹配，不会被误切
  const re = /(周[一二三四五六日天])\s*(\d{1,2})-(\d{1,2})节\s*((?:[0-9,，\-]+周(?:\([单双]\))?)(?:[，,][0-9,，\-]+周(?:\([单双]\))?)*)\s+([^\s，,]+)\s*(.*)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    courseCount++;
    const weekday = parseWeekday(m[1]);
    if (weekday === null) continue;
    const startSec = parseInt(m[2], 10);
    const endSec = Math.max(parseInt(m[3], 10), startSec);
    const weeks = expandWeeks(m[4], semesterWeeks);
    if (weeks.length === 0) continue;
    const st = sectionTime(startSec);
    const et = sectionTime(endSec);
    const location = m[5];
    const rest = (m[6] || '').trim();
    // 课程名：优先用匹配点后的内容，否则用地点
    const title = rest.replace(/（.*?）|\(.*?\)/g, '').replace(/\d+班$/g, '').trim() || '课程';
    const descParts: string[] = [];
    if (location) descParts.push(`地点：${location}`);
    for (const w of weeks) {
      const dateStr = weekDateStr(semesterStart, w, weekday);
      tasks.push({
        title,
        description: descParts.join('；'),
        task_type: 'course',
        priority: 'medium',
        importance: 'important',
        start_time: `${dateStr}T${st.start}:00+08:00`,
        end_time: `${dateStr}T${et.end}:00+08:00`,
      });
    }
  }

  return courseCount > 0 ? tasks : null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rawText = body?.text;
    
    if (!rawText || typeof rawText !== 'string') {
      return NextResponse.json({ error: '请输入要解析的文本' }, { status: 400 });
    }

    // 剥离 HTML（如果是网页表格）并压缩空白
    const text = stripHtml(rawText);

    // 开学日期与学期周数（前端可选传入，默认 2026-08-24 第1周周一，18周）
    const semesterStart = body?.semesterStart || '2026-08-24';
    const semesterWeeks = body?.weeks || 18;

    // 优先使用确定性解析：课程表 HTML 表格 / 纯文本课程表（不依赖 AI，100% 稳定）
    const htmlTasks = parseTimetableHtml(rawText, semesterStart, semesterWeeks);
    if (htmlTasks && htmlTasks.length > 0) {
      const seen = new Set<string>();
      const deduped = htmlTasks.filter(t => {
        const key = `${t.title}|${t.start_time}|${t.end_time}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      deduped.sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));
      return NextResponse.json({ tasks: deduped, source: 'timetable-html' });
    }

    const textTasks = parseTimetableText(text, semesterStart, semesterWeeks);
    if (textTasks && textTasks.length > 0) {
      const seen = new Set<string>();
      const deduped = textTasks.filter(t => {
        const key = `${t.title}|${t.start_time}|${t.end_time}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      deduped.sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));
      return NextResponse.json({ tasks: deduped, source: 'timetable-text' });
    }

    // 构建 AI 配置（直接调用 OpenAI 兼容接口，不依赖 Coze SDK）
    const apiKey = body?.apiKey;
    const baseUrl = body?.baseUrl;
    const model = body?.model;
    
    const aiBaseUrl = (baseUrl as string) || process.env.AI_BASE_URL || 'https://api.openai.com/v1';
    const aiApiKey = (apiKey as string) || process.env.AI_API_KEY || '';
    const aiModel = (model as string) || process.env.AI_MODEL || 'gpt-4o-mini';
    
    if (!aiApiKey) {
      return NextResponse.json(
        { error: '未配置 AI API Key，请在设置中填写或使用课程表导入' },
        { status: 400 }
      );
    }
    
    const now = new Date().toISOString();
    const userPrompt = `当前时间：${now}

本学期开学日期（第1周的周一）：${semesterStart}
学期总周数：${semesterWeeks}

请解析以下文本，提取待办任务：

"${text}"

请直接返回 JSON 数组，不要包含任何额外文字。`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    // 直接调用 OpenAI 兼容接口（支持 OpenAI/智谱/文心/豆包等）
    const aiRes = await fetch(`${aiBaseUrl.replace(/\/+$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${aiApiKey}`,
      },
      body: JSON.stringify({
        model: aiModel,
        messages,
        temperature: 0.2,
        max_tokens: 4096,
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text().catch(() => '');
      console.error('AI 接口错误:', aiRes.status, errText.slice(0, 300));
      return NextResponse.json(
        { error: `AI 接口调用失败 (${aiRes.status})，请检查 API Key 和 Base URL 配置` },
        { status: 500 }
      );
    }

    const aiData = await aiRes.json();
    const rawContent = aiData?.choices?.[0]?.message?.content || '';

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
    
    let parsedTasks: RawCourse[];
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

    const validTypes = ['course', 'homework', 'exam', 'activity', 'personal'];
    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    const validImportances = ['normal', 'important', 'very_important'];

    const results: ParsedTask[] = [];

    for (const raw of parsedTasks) {
      if (!raw || typeof raw.title !== 'string' || !raw.title.trim()) continue;

      const base: ParsedTask = {
        title: raw.title.trim()
          .replace(/^\d{1,2}[:：]\d{2}\s*[-~至]\s*\d{1,2}[:：]\d{2}\s*/g, '')
          .replace(/^\d{1,2}[:：]\d{2}\s*/g, '')
          .replace(/^第\d+(-\d+)?节\s*/g, '')
          .trim(),
        description: raw.description || '',
        task_type: validTypes.includes(raw.task_type || '') ? (raw.task_type as ParsedTask['task_type']) : 'personal',
        priority: validPriorities.includes(raw.priority || '') ? (raw.priority as ParsedTask['priority']) : 'medium',
        importance: validImportances.includes(raw.importance || '') ? (raw.importance as ParsedTask['importance']) : 'normal',
      };

      if (!base.title || /^(课程|待办事项)$/.test(base.title)) {
        if (raw.location && raw.location.length > 2) base.title = '待办事项';
      }

      // 判断是否为课程（有结构化字段）
      const weekday = parseWeekday(raw.weekday);
      const hasCourseFields = weekday !== null && raw.weeks && raw.start_section;

      if (hasCourseFields && raw.start_section) {
        const weeks = expandWeeks(String(raw.weeks), semesterWeeks);
        if (weeks.length === 0) continue; // 自由时间等跳过
        const startSec = Number(raw.start_section);
        const endSec = Number(raw.end_section) >= startSec ? Number(raw.end_section) : startSec + 1;
        const st = sectionTime(startSec);
        const et = sectionTime(endSec);
        const loc = raw.location ? `地点：${raw.location}` : '';
        const desc = [raw.description, loc].filter(Boolean).join('；');
        for (const w of weeks) {
          const dateStr = weekDateStr(semesterStart, w, weekday);
          results.push({
            ...base,
            description: desc,
            start_time: `${dateStr}T${st.start}:00+08:00`,
            end_time: `${dateStr}T${et.end}:00+08:00`,
          });
        }
      } else {
        // 一次性任务
        let s = raw.start_time;
        let e = raw.end_time;
        // 时间校验
        if (s) { const d = new Date(s); if (isNaN(d.getTime())) s = undefined; }
        if (e) { const d = new Date(e); if (isNaN(d.getTime())) e = undefined; }
        if (s && e) {
          const stMs = new Date(s).getTime();
          const etMs = new Date(e).getTime();
          if (etMs <= stMs) {
            const defaultMin = base.task_type === 'course' ? 100 : 60;
            e = new Date(stMs + defaultMin * 60 * 1000).toISOString();
          }
        }
        if (raw.location && base.description) {
          base.description = `${base.description}；地点：${raw.location}`;
        } else if (raw.location) {
          base.description = `地点：${raw.location}`;
        }
        results.push({ ...base, start_time: s, end_time: e });
      }
    }

    if (results.length === 0) {
      return NextResponse.json({ error: '未能从文本中提取出有效任务，请尝试更详细的描述' }, { status: 400 });
    }

    // 去重：按 标题 + 开始时间 去重
    const seen = new Set<string>();
    const deduped = results.filter(t => {
      const key = `${t.title}|${t.start_time || ''}|${t.end_time || ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // 按开始时间排序
    deduped.sort((a, b) => {
      const ta = a.start_time ? new Date(a.start_time).getTime() : 0;
      const tb = b.start_time ? new Date(b.start_time).getTime() : 0;
      return ta - tb;
    });

    return NextResponse.json({ tasks: deduped });
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
