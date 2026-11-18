// 南雍待办 · 全量执行版任务导入脚本
// 用法：
//   SUPABASE_ANON_KEY=xxx TODO_EMAIL=xxx TODO_PASSWORD=xxx node scripts/import-tasks.mjs
// ANON KEY 在 Supabase 控制台 → Settings → API Keys → publishable(anon) key。
// 重复运行会重复插入，请只跑一次。

const SUPABASE_URL = 'https://axwaaxojosmujcdkcrhc.supabase.co';
const ANON_KEY = process.env.SUPABASE_ANON_KEY;
const EMAIL = process.env.TODO_EMAIL;
const PASSWORD = process.env.TODO_PASSWORD;

if (!ANON_KEY || !EMAIL || !PASSWORD) {
  console.error('请设置 SUPABASE_ANON_KEY / TODO_EMAIL / TODO_PASSWORD 三个环境变量');
  process.exit(1);
}

// 北京时间辅助：d('2026-11-18','17:00') => ISO 带时区
const d = (date, time) => `${date}T${time}:00+08:00`;

// task_type: course|homework|exam|activity|personal
// priority:  low|medium|high|urgent
// importance: optional|suggested|normal|important|very_important
const TASKS = [
  // ========= A. 本周硬截止与大事件（2026.11.16 周一 – 11.22 周日）=========
  {
    title: '确认预立项签字和提交路径',
    description: '找到签字人确认流程；确认 11.18 17:00 前的提交路径（系统/邮箱/纸质）。这是 11.18 硬截止的前置条件。',
    task_type: 'personal', priority: 'medium', importance: 'important',
    start_time: d('2026-11-16', '08:00'), end_time: d('2026-11-16', '21:00'),
  },
  {
    title: 'AI工作坊PPT初稿',
    description: '完成初稿框架。节奏：11.17 修改 → 11.18 定稿+排练1 → 11.19 排练2+答辩稿压到20min → 11.21 鼓楼分享。',
    task_type: 'homework', priority: 'high', importance: 'important',
    start_time: d('2026-11-16', '14:00'), end_time: d('2026-11-16', '22:00'),
  },
  {
    title: '室内体测',
    description: '前一晚正常作息；当天轻量热身，避免受伤影响 11.28 室外体测和后续训练。',
    task_type: 'activity', priority: 'high', importance: 'very_important',
    start_time: d('2026-11-17', '08:00'), end_time: d('2026-11-17', '18:00'),
  },
  {
    title: 'PPT修改 + 确认11.18预立项材料',
    description: '按反馈修改 PPT；同时把 11.18 要交的预立项材料备齐（第二天 17:00 截止）。',
    task_type: 'homework', priority: 'high', importance: 'important',
    start_time: d('2026-11-17', '19:00'), end_time: d('2026-11-17', '22:00'),
  },
  {
    title: '【硬截止】提交预立项材料（17:00前）',
    description: '硬截止 > CACC。当天 CACC 只保底 30 分钟（模板/错题），不归零；交完再恢复 3 小时。',
    task_type: 'homework', priority: 'urgent', importance: 'very_important',
    start_time: d('2026-11-18', '09:00'), end_time: d('2026-11-18', '17:00'),
  },
  {
    title: 'PPT定稿 + 答辩排练1',
    description: 'AI工作坊分享用。11.19 还有排练2。',
    task_type: 'homework', priority: 'high', importance: 'important',
    start_time: d('2026-11-18', '19:00'), end_time: d('2026-11-18', '22:30'),
  },
  {
    title: '【硬截止】EDA完成',
    description: '11.20 提交。当天 CACC 保底 30 分钟不归零，交完恢复 3 小时。',
    task_type: 'homework', priority: 'urgent', importance: 'very_important',
    start_time: d('2026-11-19', '08:00'), end_time: d('2026-11-19', '22:00'),
  },
  {
    title: '答辩排练2 + 答辩稿压缩到20min',
    description: 'AI工作坊分享前的最后一次完整排练。',
    task_type: 'homework', priority: 'high', importance: 'important',
    start_time: d('2026-11-19', '19:00'), end_time: d('2026-11-19', '22:00'),
  },
  {
    title: 'RM OpenCV 进度检查点1',
    description: '三个检查点（11.19 / 11.22 / 11.24）之一，每次 30 分钟内评估进度。判断标准：赶不上就只保留"已提交/已沟通"，不占 CACC 整块——这是控制风险，不是砍目标。',
    task_type: 'activity', priority: 'medium', importance: 'normal',
    start_time: d('2026-11-19', '12:30'), end_time: d('2026-11-19', '13:00'),
  },
  {
    title: '献血（中午）',
    description: '献血后 24–48 小时不剧烈运动、不熬夜。当天只做单词、作文背诵、轻复盘；不排练、不剧烈运动。这是恢复，不是减量。',
    task_type: 'activity', priority: 'urgent', importance: 'very_important',
    start_time: d('2026-11-20', '11:00'), end_time: d('2026-11-20', '14:00'),
  },
  {
    title: '【硬截止】EDA提交',
    description: '确认提交成功并留档。献血当天，除本项外只做轻任务。',
    task_type: 'homework', priority: 'urgent', importance: 'very_important',
    start_time: d('2026-11-20', '08:00'), end_time: d('2026-11-20', '18:00'),
  },
  {
    title: '关注南星动态',
    description: '轻任务，顺手完成即可。',
    task_type: 'personal', priority: 'low', importance: 'optional',
    start_time: d('2026-11-20', '20:00'), end_time: d('2026-11-20', '21:00'),
  },
  {
    title: '鼓楼 AI 工作坊分享',
    description: '路上背单词/作文框架。晚上轻复盘，CACC 1h 以内，不熬夜。',
    task_type: 'activity', priority: 'urgent', importance: 'very_important',
    start_time: d('2026-11-21', '08:00'), end_time: d('2026-11-21', '18:00'),
  },
  {
    title: '预立项答辩准备',
    description: '答辩节奏：11.23 答辩稿+模拟1 → 11.25 模拟2。',
    task_type: 'homework', priority: 'high', importance: 'important',
    start_time: d('2026-11-22', '14:00'), end_time: d('2026-11-22', '18:00'),
  },
  {
    title: 'RM OpenCV 进度检查点2',
    description: '对照 11.19 检查点1 的结论复核进度；赶不上则启动降级预案（只保留已提交/已沟通）。',
    task_type: 'activity', priority: 'medium', importance: 'normal',
    start_time: d('2026-11-22', '12:30'), end_time: d('2026-11-22', '13:00'),
  },
  {
    title: '周日固定：周复盘 + nova文档 + 列下周计划',
    description: '固定 30 分钟周复盘 + nova 文档/活动提醒。每周只调下一周的弹性项，不动 CACC 和硬截止。',
    task_type: 'personal', priority: 'medium', importance: 'normal',
    start_time: d('2026-11-22', '20:00'), end_time: d('2026-11-22', '21:00'),
  },

  // ========= B. 后续硬截止与里程碑（11.23 – 2027.1.4）=========
  {
    title: '答辩稿定稿 + 预立项答辩模拟1',
    description: '答辩稿完成并跑第一遍完整模拟。',
    task_type: 'homework', priority: 'high', importance: 'important',
    start_time: d('2026-11-23', '19:00'), end_time: d('2026-11-23', '22:00'),
  },
  {
    title: '【决策点】RM OpenCV：参加 或 降级为只沟通',
    description: '检查点3、最终决策点。赶不上就不占 CACC 整块，只保留"已提交/已沟通"状态，之后不再投入。',
    task_type: 'activity', priority: 'high', importance: 'important',
    start_time: d('2026-11-24', '12:30'), end_time: d('2026-11-24', '13:00'),
  },
  {
    title: '预立项答辩模拟2',
    description: '答辩前最后一次模拟，重点练时间控制和提问应对。',
    task_type: 'homework', priority: 'high', importance: 'important',
    start_time: d('2026-11-25', '19:00'), end_time: d('2026-11-25', '22:00'),
  },
  {
    title: '确认11.27学代会/RM时间 + 早睡',
    description: '11.28 室外体测前 11.26–27 不熬夜（睡眠和恢复是执行的一部分）。当天 CACC 减量。',
    task_type: 'personal', priority: 'medium', importance: 'normal',
    start_time: d('2026-11-26', '20:00'), end_time: d('2026-11-26', '22:00'),
  },
  {
    title: '学代会',
    description: '当天不安排重刷题。',
    task_type: 'activity', priority: 'urgent', importance: 'very_important',
    start_time: d('2026-11-27', '08:00'), end_time: d('2026-11-27', '18:00'),
  },
  {
    title: 'RM 考核（如参加）',
    description: '视 11.24 决策点结果决定是否参加；不安排重刷题。',
    task_type: 'activity', priority: 'medium', importance: 'suggested',
    start_time: d('2026-11-27', '14:00'), end_time: d('2026-11-27', '18:00'),
  },
  {
    title: '【体测】室外 50m + 1000m',
    description: '当天只做轻任务，测后充分恢复。别在 11.26–27 熬夜。',
    task_type: 'exam', priority: 'urgent', importance: 'very_important',
    start_time: d('2026-11-28', '08:00'), end_time: d('2026-11-28', '12:00'),
  },
  {
    title: '写简历（openeuler + 大厂短期）',
    description: '一版简历覆盖两个投向，写完给 11.30 投递用。',
    task_type: 'homework', priority: 'high', importance: 'important',
    start_time: d('2026-11-29', '14:00'), end_time: d('2026-11-29', '20:00'),
  },
  {
    title: 'openlet 定方案',
    description: '确定选题/方案，12 月每周推进 2 次，12.31 截止。',
    task_type: 'homework', priority: 'medium', importance: 'important',
    start_time: d('2026-11-29', '20:00'), end_time: d('2026-11-29', '22:00'),
  },
  {
    title: '【截止】投递 openeuler + 大厂短期简历',
    description: '硬截止。当天 CACC 只保底 30 分钟。',
    task_type: 'homework', priority: 'urgent', importance: 'important',
    start_time: d('2026-11-30', '08:00'), end_time: d('2026-11-30', '22:00'),
  },
  {
    title: '思想汇报写完',
    description: '12.1–12.3 与 CACC 冲刺并行完成。',
    task_type: 'homework', priority: 'high', importance: 'important',
    start_time: d('2026-12-01', '08:00'), end_time: d('2026-12-03', '22:00'),
  },
  {
    title: '【比赛】CACC/CCAC',
    description: '12.4–12.5 只复盘模板和错题，不刷新题。比赛策略固定：开赛 5 分钟通读标 A/B/C；先清 A；每题 2 分钟判难度；25 分钟没突破换题；能暴力先拿部分分。',
    task_type: 'exam', priority: 'urgent', importance: 'very_important',
    start_time: d('2026-12-06', '08:00'), end_time: d('2026-12-06', '18:00'),
  },
  {
    title: '【考试】CET6 六级',
    description: '12.7 起转六级冲刺 + 概统每天 1h 诊断；作文框架背到考前。12.8–12.11 冲刺期每天保作文+听力。',
    task_type: 'exam', priority: 'urgent', importance: 'very_important',
    start_time: d('2026-12-12', '08:00'), end_time: d('2026-12-12', '12:00'),
  },
  {
    title: '概统考试',
    description: '12.13–12.28 概统主攻期，每天至少 1h；12.29 考试。',
    task_type: 'exam', priority: 'urgent', importance: 'very_important',
    start_time: d('2026-12-29', '08:00'), end_time: d('2026-12-29', '12:00'),
  },
  {
    title: '【截止】openlet 提交',
    description: '12.13–12.28 每周推进 2 次（周五弹性块 + 周末一次），最后一周收尾。',
    task_type: 'homework', priority: 'high', importance: 'important',
    start_time: d('2026-12-30', '08:00'), end_time: d('2026-12-31', '22:00'),
  },
  {
    title: '深度学习课程收尾',
    description: '12.13–12.28 与概统主攻并行，每周二/周五的 30–45min 块推进，最后收尾。',
    task_type: 'homework', priority: 'high', importance: 'important',
    start_time: d('2026-12-30', '08:00'), end_time: d('2026-12-31', '22:00'),
  },
  {
    title: '数据结构考前复习（理论细节 + 考前对照表）',
    description: '1.1–1.2 过理论细节；1.3 做考前对照表（一页纸）。',
    task_type: 'homework', priority: 'high', importance: 'important',
    start_time: d('2027-01-01', '08:00'), end_time: d('2027-01-03', '22:00'),
  },
  {
    title: '习概开卷检索表',
    description: '做开卷用的索引/检索表，考前一天完成。',
    task_type: 'homework', priority: 'medium', importance: 'important',
    start_time: d('2027-01-04', '08:00'), end_time: d('2027-01-04', '22:00'),
  },

  // ========= C. 每日雷打不动（长期任务）=========
  {
    title: '考研单词 15–20min（每天）',
    description: '早上或路上，雷打不动。献血日、体测日照做。',
    task_type: 'personal', priority: 'medium', importance: 'important',
    start_time: d('2026-11-16', '07:30'), end_time: null, longTerm: true,
  },
  {
    title: '六级作文：背框架+功能句，隔天写1篇（至12.12）',
    description: '每天 20–30min 背框架和功能句；隔天完整写 1 篇。持续到 12.12 考试。',
    task_type: 'personal', priority: 'medium', importance: 'important',
    start_time: d('2026-11-16', '07:50'), end_time: d('2026-12-12', '08:00'), longTerm: true,
  },
  {
    title: 'CACC 每日主块 2.5–3h（硬截止日保底30min）',
    description: '按周轮转计时刷：周一洛谷专题 / 周二CF补题 / 周三力扣专项 / 周四洛谷专题 / 周五CF虚拟赛·补题 / 周六全真套题 / 周日错题复盘+CF补2题。当天有硬截止 → 只保底 30min 模板/错题，不归零；清完硬截止再恢复 3 小时。',
    task_type: 'personal', priority: 'high', importance: 'important',
    start_time: d('2026-11-16', '19:00'), end_time: null, longTerm: true,
  },
  {
    title: '睡前写明天3件硬事（10min）',
    description: '每天睡前写明天必须完成的 3 件事，其余都是"推进项"。三件硬事里必须有一件是 CACC 或硬截止。',
    task_type: 'personal', priority: 'medium', importance: 'normal',
    start_time: d('2026-11-16', '22:30'), end_time: null, longTerm: true,
  },

  // ========= D. 每周轮转：课程超前 + 弹性挑战（长期任务，按星期执行）=========
  {
    title: '周一轮转：概统超前/复习 + 经典论文30min',
    description: '课程块 30–45min：概率统计超前/复习。弹性块 30–60min：经典论文（只读摘要+方法+结论，记3行）。活动多的当天弹性让位。',
    task_type: 'personal', priority: 'low', importance: 'suggested',
    start_time: d('2026-11-16', '12:30'), end_time: null, longTerm: true,
  },
  {
    title: '周二轮转：深度学习 + 天池主赛推进',
    description: '课程块 30–45min：深度学习。弹性块：天池主赛（只选一个主赛）。',
    task_type: 'personal', priority: 'low', importance: 'suggested',
    start_time: d('2026-11-17', '12:30'), end_time: null, longTerm: true,
  },
  {
    title: '周三轮转：数据结构 + 师兄研究/大创30min',
    description: '课程块 30–45min：数据结构。弹性块 30min：协助师兄研究或大创推进（预立项之外的那项；答辩通知来了再临时加时）。',
    task_type: 'personal', priority: 'low', importance: 'suggested',
    start_time: d('2026-11-18', '12:30'), end_time: null, longTerm: true,
  },
  {
    title: '周四轮转：概统 + 科研方法学习/论文',
    description: '课程块 30–45min：概统。弹性块：科研方法学习或论文。',
    task_type: 'personal', priority: 'low', importance: 'suggested',
    start_time: d('2026-11-19', '12:30'), end_time: null, longTerm: true,
  },
  {
    title: '周五轮转：深度学习 + openlet仿真赛/大创',
    description: '课程块 30–45min：深度学习。弹性块：openlet 仿真赛或大创。',
    task_type: 'personal', priority: 'low', importance: 'suggested',
    start_time: d('2026-11-20', '12:30'), end_time: null, longTerm: true,
  },
  {
    title: '周六轮转：数据结构 + kaggle基线/论文精读',
    description: '课程块 30–45min：数据结构。弹性块：kaggle 数据/基线，或精读 1 篇论文（周末精读的那篇）。',
    task_type: 'personal', priority: 'low', importance: 'suggested',
    start_time: d('2026-11-21', '12:30'), end_time: null, longTerm: true,
  },
  {
    title: '周日轮转：习概索引 + 读书15–30min + 周复盘',
    description: '课程块 30–45min：习概索引。弹性块：多读书 15–30min + 周复盘（配合"周日固定"任务）。',
    task_type: 'personal', priority: 'low', importance: 'suggested',
    start_time: d('2026-11-22', '12:30'), end_time: null, longTerm: true,
  },
];

async function main() {
  // 1. 登录拿 JWT
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
  console.log('登录成功，用户 id =', auth.user.id);

  // 2. 批量插入任务
  const rows = TASKS.map(({ longTerm, ...t }) => ({
    ...t,
    metadata: { longTerm: longTerm === true, tagIds: [] },
  }));
  const ins = await fetch(`${SUPABASE_URL}/rest/v1/tasks`, {
    method: 'POST',
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${auth.access_token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(rows),
  });
  if (!ins.ok) {
    console.error('插入失败：', ins.status, await ins.text());
    process.exit(1);
  }
  const longTermCount = rows.filter(r => r.metadata.longTerm).length;
  console.log(`完成：已插入 ${rows.length} 条任务，其中长期任务 ${longTermCount} 条`);
}

main();
