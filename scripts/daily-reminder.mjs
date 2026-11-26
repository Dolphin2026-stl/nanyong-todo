// 每日提醒：读取 Supabase 中的今日任务，推送到 ntfy（手机装 ntfy App 订阅即可收到）。
// 由 GitHub Actions 每天北京时间 08:30 触发，也可手动 workflow_dispatch 触发。
// 所需仓库 Secrets：
//   SUPABASE_ANON_KEY  — Supabase publishable(anon) key
//   TODO_EMAIL         — 南雍待办登录邮箱
//   TODO_PASSWORD      — 南雍待办登录密码
//   NTFY_TOPIC         — ntfy 主题名（随机字符串即可，手机 App 订阅同一主题）

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://axwaaxojosmujcdkcrhc.supabase.co';
const ANON_KEY = process.env.SUPABASE_ANON_KEY;
const EMAIL = process.env.TODO_EMAIL;
const PASSWORD = process.env.TODO_PASSWORD;
const TOPIC = process.env.NTFY_TOPIC;
const SCT = process.env.SCT_SENDKEY;

// 北京时间的今天（UTC+8）
const now = new Date(Date.now() + 8 * 3600 * 1000);
const day = (t) => new Date(new Date(t).getTime() + 8 * 3600 * 1000).toISOString().slice(0, 10);
const today = now.toISOString().slice(0, 10);
const weekday = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][now.getUTCDay()];
const hm = (iso) => new Date(iso).toLocaleTimeString('zh-CN', { timeZone: 'Asia/Shanghai', hour: '2-digit', minute: '2-digit' });

async function main() {
  for (const [k, v] of [['SUPABASE_ANON_KEY', ANON_KEY], ['TODO_EMAIL', EMAIL], ['TODO_PASSWORD', PASSWORD]]) {
    if (!v) {
      console.error(`缺少 Secret：${k}。请到仓库 Settings → Secrets and variables → Actions 添加。`);
      process.exit(1);
    }
  }
  if (!SCT && !TOPIC) {
    console.error('缺少推送配置：请设置 SCT_SENDKEY（Server酱/微信）或 NTFY_TOPIC（ntfy）。');
    process.exit(1);
  }

  // 1. 登录（密码授权，走用户自己的 RLS 权限）
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const auth = await res.json();
  if (!res.ok || !auth.access_token) {
    console.error('登录失败：', JSON.stringify(auth));
    process.exit(1);
  }

  // 2. 拉取未完成任务
  const q = await fetch(`${SUPABASE_URL}/rest/v1/tasks?is_completed=eq.false&select=title,task_type,priority,importance,start_time,end_time,metadata&order=end_time.asc.nullslast`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${auth.access_token}` },
  });
  if (!q.ok) {
    console.error('读取任务失败：', q.status, await q.text());
    process.exit(1);
  }
  const tasks = await q.json();

  const todayDeadline = [];
  const overdue = [];
  const longTerm = [];
  for (const t of tasks) {
    if (t.metadata && t.metadata.longTerm === true) { longTerm.push(t); continue; }
    if (!t.end_time) { longTerm.push(t); continue; }
    const eDay = day(t.end_time);
    if (eDay === today) todayDeadline.push(t);
    else if (new Date(t.end_time) < new Date()) overdue.push(t);
  }

  // 组织成结构化数据，微信（Server酱）渲染 Markdown，ntfy 用纯文本
  const data = {
    today,
    weekday,
    cacc: longTerm.some(t => t.title.includes('CACC')) ? 'CACC 每日主块（硬截止日只保底 30min）' : 'CACC 每日主块 2.5–3h',
    picks: todayDeadline.slice(0, 2).map(t => t.title),
    hasDeadline: todayDeadline.length > 0,
    todayDeadline,
    overdue,
    rotation: weekdayRotation(weekday),
  };
  const body = SCT ? mdBody(data) : plainBody(data);
  console.log('---- 提醒内容 ----');
  console.log(body);

  // 3. 推送：优先 Server酱（微信），否则 ntfy
  const sctKey = SCT;
  if (sctKey) {
    const p = await fetch(`https://sctapi.ftqq.com/${sctKey}.send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        title: `今日提醒 ${today}（${weekday}）` + (todayDeadline.some(t => t.priority === 'urgent') ? ' ⏰有硬截止' : ''),
        desp: body,
      }),
    });
    if (!p.ok) {
      console.error('Server酱推送失败：', p.status, await p.text());
      process.exit(1);
    }
    console.log('已通过 Server酱 推送到微信');
    return;
  }

  const TOPIC = process.env.NTFY_TOPIC;
  if (!TOPIC) {
    console.error('未配置 SCT_SENDKEY 或 NTFY_TOPIC，无法推送');
    process.exit(1);
  }
  // HTTP 头不支持中文，标题用 ntfy 的 b64: 前缀编码
  const b64 = (s) => `b64:${Buffer.from(s, 'utf8').toString('base64')}`;
  const p2 = await fetch(`https://ntfy.sh/${TOPIC}`, {
    method: 'POST',
    headers: {
      Title: b64(`今日提醒 ${today}（${weekday}）`),
      Priority: todayDeadline.some(t => t.priority === 'urgent') ? 'high' : 'default',
      Tags: 'alarm_clock',
    },
    body,
  });
  if (!p2.ok) {
    console.error('ntfy 推送失败：', p2.status, await p2.text());
    process.exit(1);
  }
  console.log('已推送到 ntfy 主题：', TOPIC);
}

// 微信（Server酱）版：desp 按 Markdown 渲染，单换行会被合并，所以每段之间必须空行、列表用 "- "
function mdBody(d) {
  const icon = { urgent: '🔴', high: '🟠', medium: '🟡', low: '⚪' };
  const item = (t) => `- ${icon[t.priority] || '⚪'} **${t.title}**${t.end_time ? `（截止 ${hm(t.end_time)}）` : ''}`;

  let s = `### ☀️ 早上好！今天是 ${d.today}（${d.weekday}）\n\n`;
  s += `### 📌 今日三件硬事候选\n\n`;
  s += `三选三，必须含 CACC 或硬截止：\n\n`;
  s += `- ${d.cacc}\n`;
  for (const p of d.picks) s += `- ${p}\n`;
  if (!d.hasDeadline) s += `- 今日无硬截止，正常跑每日模板\n`;

  if (d.hasDeadline) {
    s += `\n### ⏰ 今日硬截止（${d.todayDeadline.length} 条）\n\n`;
    s += d.todayDeadline.map(item).join('\n') + '\n';
  }
  if (d.overdue.length) {
    s += `\n### ⚠️ 已过期未完成（${d.overdue.length} 条，尽快处理）\n\n`;
    s += d.overdue.slice(0, 5).map(item).join('\n') + '\n';
    if (d.overdue.length > 5) s += `- ...等 ${d.overdue.length} 条\n`;
  }
  s += `\n### 🔁 今日轮转（${d.weekday}）\n\n${d.rotation}\n`;
  s += `\n---\n\n🛏 **睡前记得：写明天三件硬事（必须有 CACC 或硬截止）**\n`;
  return s;
}

// ntfy 版：纯文本，单换行能正常显示
function plainBody(d) {
  const icon = { urgent: '🔴', high: '🟠', medium: '🟡', low: '⚪' };
  const line = (t) => `${icon[t.priority] || '⚪'} ${t.title}${t.end_time ? `（截止 ${hm(t.end_time)}）` : ''}`;

  let s = `☀️ 早上好！今天是 ${d.today}（${d.weekday}）\n`;
  s += `\n📌 今日三件硬事候选（三选三，必须含 CACC 或硬截止）：\n`;
  s += `• ${d.cacc}\n`;
  for (const p of d.picks) s += `• ${p}\n`;
  if (!d.hasDeadline) s += `• 今日无硬截止，正常跑每日模板\n`;

  if (d.hasDeadline) {
    s += `\n⏰ 今日硬截止（${d.todayDeadline.length} 条）：\n`;
    s += d.todayDeadline.map(line).join('\n') + '\n';
  }
  if (d.overdue.length) {
    s += `\n⚠️ 已过期未完成（${d.overdue.length} 条，尽快处理）：\n`;
    s += d.overdue.slice(0, 5).map(line).join('\n') + (d.overdue.length > 5 ? `\n...等 ${d.overdue.length} 条` : '') + '\n';
  }
  s += `\n🔁 今日轮转：${d.weekday} → ${d.rotation}\n`;
  s += `\n🛏 睡前记得：写明天三件硬事（必须有 CACC 或硬截止）`;
  return s;
}

function weekdayRotation(w) {
  const m = {
    周一: '洛谷专题2–3题(DP/图论/二分) + 概统 + 经典论文30min',
    周二: 'CF补题3题+洛谷1题 + 深度学习 + 天池主赛',
    周三: '力扣专项30–40min+洛谷1题 + 数据结构 + 师兄研究/大创30min',
    周四: '洛谷专题(搜索/前缀和/滑窗) + 概统 + 科研方法/论文',
    周五: 'CF虚拟赛或补题3题 + 深度学习 + openlet/大创',
    周六: '全真套题计时 + 数据结构 + kaggle基线/论文精读',
    周日: '错题复盘+CF补2题+周计划 + 习概索引 + 读书+周复盘',
  };
  return m[w] || '';
}

main();
