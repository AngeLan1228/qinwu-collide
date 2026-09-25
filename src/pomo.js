// 番茄钟状态机（Step 5）
//
// 来源：legacy index.html 5074–5209，逻辑一一对应搬过来，没做行为改动。
//
// 为什么单独放一个模块而不是塞进 ListenPanel：
// 陪伴页整块被 Vue 接管后，legacy 那份 updateUI() 写的是被 Vue 换掉的节点，
// 计时器照走、界面不动 —— 所以状态必须由 Vue 持有，DOM 由 Vue 渲染。
//
// 与 legacy 的让位约定：legacy 侧用 pomoOwnedByVue()（容器上有 __vue_app__）
// 判断，为真就不绑番茄钟委托、updateUI() 直接 return，避免两边各跑一个
// setInterval。纯 legacy 部署没有 Vue → 判断恒为假 → 那份照旧工作。
//
// 对外依赖（都走 window，取不到就降级）：
//   window.addRecord / window.showToast / window.taName —— 都是 legacy 全局函数
//   window.__listenMusicOn() —— 一起听是否在放（legacy IIFE 内的私有变量，只好暴露）
import { reactive } from "vue";

export const DUR = { 25: 25 * 60, 45: 45 * 60, 60: 60 * 60, 5: 5 * 60 };
const RING_C = 2 * Math.PI * 88;
const REC_KEY = "companion_records";

let timer = null;

export const pomo = reactive({
  kind: "countdown", // countdown | stopwatch
  mode: "focus", // focus | rest
  round: 1,
  focusMin: 45,
  total: DUR[45],
  remain: DUR[45],
  swSeconds: 0,
  running: false,
  task: "",
  activeDur: 45,
  // 以下都是派生展示值，由 refresh() 统一刷新
  time: "45:00",
  modeText: "",
  nowText: "",
  noteText: "",
  ringOffset: 0,
  skipTitle: "跳过",
  startLabel: "开始", // 中间大按钮上的字：运行时显示「暂停」
});

// 今天的学习统计 + AI 赞美（卡片用）
export const study = reactive({
  visible: false, // 今天有学习记录才显示（每次学完会重画）
  totalMin: 0,
  thisMin: 0,
  slices: [], // [{ cat, min, pct, color, d }]
  praise: "",
  loading: false,
});

// 科目提取：用户在「在学什么」里填的是「高数第三章」这种，只有按科目名分组
// 扇形图才有意义 —— 全落进「其他」就白画了。
// 顺序即优先级：越具体的越靠前（"高数"要在"数学"之前）。
const SUBJECTS = [
  ["高数", /高数|高等数学|微积分/],
  ["线代", /线代|线性代数/],
  ["概率", /概率|统计/],
  ["数学", /数学|刷题|习题|真题/],
  ["英语", /英语|单词|四级|六级|雅思|托福|外刊|听力|口语/],
  ["政治", /政治|马原|毛概|思修|史纲/],
  ["专业课", /专业课|必修|选修|专业课/],
  ["论文", /论文|毕设|开题|报告|综述/],
  ["编程", /代码|编程|开发|项目|软著|程序|前端|后端|算法|bug/],
  ["考证", /考证|面试|秋招|春招|实习|简历|资格证/],
  ["阅读", /看书|课外书|小说|杂志|阅读/],
  ["背记", /背书|背诵|复习|背单词/],
];
function subjectOf(task) {
  const t = String(task || "");
  for (const [name, re] of SUBJECTS) if (re.test(t)) return name;
  // 没认出科目就退回大类（legacy 那份口径），生僻输入最终落到「其他」
  if (typeof window !== "undefined" && typeof window.classifyFocus === "function") {
    try { return window.classifyFocus(task); } catch (e) {}
  }
  return /学习|看书|上课|自习/.test(t) ? "学习" : "其他";
}

function sliceColors() {
  if (typeof window !== "undefined" && typeof window.compaColors === "function") {
    try { return window.compaColors(); } catch (e) {}
  }
  return { 学习: "#F4A9BE", 编程: "#C9A7E8", 阅读: "#94D8C3", 工作: "#8BC8EA", 其他: "#E4D48F" };
}
// 科目可能任意多，靠名字哈希取色 —— 同一个科目每次渲染颜色都一致，不会跟着排序跳色
const EXTRA_COLORS = ["#F4A9BE", "#C9A7E8", "#94D8C3", "#8BC8EA", "#E4D48F", "#F2B6A0", "#A9D2F0", "#C6E2A6", "#E8C7E8", "#9FD8D8", "#EFB8C8", "#BFD0A8"];
function colorFor(cat, base) {
  if (base && base[cat]) return base[cat];
  let h = 0;
  for (let i = 0; i < cat.length; i++) h = (h * 31 + cat.charCodeAt(i)) >>> 0;
  return EXTRA_COLORS[h % EXTRA_COLORS.length];
}

function readRecords() {
  try {
    const getter = window.LS && window.LS.get ? window.LS.get.bind(window.LS) : null;
    if (!getter) return [];
    return JSON.parse(getter(REC_KEY) || "[]");
  } catch (e) {
    return [];
  }
}

// 楔形路径：从圆心出发的一段弧 + 中心留白 —— 和 legacy 的 drawCompaDonut 同一套几何，
// 保证两张饼图长得一模一样。单满圆时一段弧会退化成一个点，所以拆成两个半圆。
function arcPath(cx, cy, r, a0, a1) {
  const large = a1 - a0 > Math.PI ? 1 : 0;
  const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0);
  const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
  return `M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} Z`;
}

// 重画「今天的学习」那张饼：口径是**当天**（不是累计），每次学完都会再画一遍
export function renderTodayStudy() {
  const recs = readRecords().filter((r) => r.kind === "focus" && r.date === todayStr_());
  if (!recs.length) {
    study.visible = false;
    study.totalMin = 0;
    study.slices = [];
    return;
  }
  const COLORS = sliceColors();
  const groups = {};
  let total = 0;
  recs.forEach((r) => {
    const cat = subjectOf(r.task);
    const m = r.minutes || 0;
    groups[cat] = (groups[cat] || 0) + m;
    total += m;
  });
  study.totalMin = total;
  study.visible = true;
  let acc = 0;
  const entries = Object.entries(groups).sort((a, b) => b[1] - a[1]);
  study.slices = entries.map(([cat, min]) => {
    const frac = total ? min / total : 0;
    const start = acc * 2 * Math.PI - Math.PI / 2;
    const end = (acc + frac) * 2 * Math.PI - Math.PI / 2;
    acc += frac;
    const d = entries.length === 1
      ? `M 60 60 L 60 12 A 48 48 0 0 1 60 108 A 48 48 0 0 1 60 12 Z`
      : arcPath(60, 60, 48, start, end);
    return { cat, min, pct: Math.round(frac * 100), color: colorFor(cat, COLORS), d };
  });
}

// AI 赞美：没有 key / 接口不在都返回空串，调用方退回本地文案池
async function fetchPraise(task, minutes, todayMinutes) {
  try {
    const r = await fetch("/api/study/praise", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task: task || "", minutes, todayMinutes }),
    });
    const d = await r.json().catch(() => null);
    if (d && d.ok && d.text) return String(d.text).trim();
  } catch (e) {}
  return "";
}

// 一段学习结束后的收尾：记今天的总时长 -> 画饼 -> 要一句 AI 赞美 -> 卡片和聊天各来一条
async function celebrateStudy(mins, localPraiseList) {
  study.thisMin = mins;
  study.praise = "";
  study.loading = true;
  renderTodayStudy();
  const fallback = localPraiseList[Math.floor(Math.random() * localPraiseList.length)];
  const ai = await fetchPraise(pomo.task, mins, study.totalMin || mins);
  const line = ai || fallback;
  study.praise = line;
  study.loading = false;
  taSay(line);
}

const fmt = (t) => {
  const m = Math.floor(t / 60);
  const s = Math.max(0, t % 60);
  return m + ":" + String(s).padStart(2, "0");
};

// ⚠️ CONFIG 是 legacy 顶层的 `const CONFIG = {...}`（index.html 4453）。
// const 声明进的是全局**词法**环境，不是 window 的属性 —— 所以 window.CONFIG 是
// undefined，必须直接引用标识符（ES module 能解析到全局词法环境）。
function cfgTa() {
  try {
    return typeof CONFIG !== "undefined" && CONFIG && CONFIG.TA_NAME ? CONFIG.TA_NAME : "秦梧";
  } catch (e) {
    return "秦梧";
  }
}

function taName() {
  if (typeof window.taName === "function") return window.taName();
  return cfgTa();
}

function todayStr_() {
  const d = new Date();
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}

// 优先用 legacy 的全局 addRecord（它会顺带刷新打卡页的四个渲染函数）；
// 纯 Vue 环境下没有它时才自己写一份。
function addRecord(kind, task, minutes) {
  if (typeof window.addRecord === "function") {
    window.addRecord(kind, task, minutes);
    return;
  }
  try {
    // 统一走 window.LS（真源 IndexedDB，同步 API）：localStorage 里已经不存业务数据了，
    // 直接 localStorage.getItem 只会读到空，专注记录会「记了刷新就没」。
    const getter = (window.LS && window.LS.get) ? window.LS.get.bind(window.LS) : ((k) => localStorage.getItem(k));
    const recs = JSON.parse(getter(REC_KEY) || "[]");
    recs.push({
      date: todayStr_(),
      kind,
      task: task || "",
      minutes: minutes || 0,
      ts: Date.now(),
    });
    // 写入顺序：LS.set（IndexedDB）> lsSave（旧通道）> localStorage（兜底）
    const s = JSON.stringify(recs);
    if (window.LS && window.LS.set) window.LS.set(REC_KEY, s);
    else if (typeof window.lsSave === "function") window.lsSave(REC_KEY, s);
    else localStorage.setItem(REC_KEY, s);
  } catch (e) {}
}

// taSay 在 legacy 里是 listen IIFE 的私有函数，Vue 拿不到，这里重新实现一份。
function taSay(text) {
  if (!window.fetch) return;
  try {
    fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "ta", type: "text", content: text }),
    }).catch(() => {});
  } catch (e) {}
}

// 浮动状态条挂在 <body> 顶层（不在 #tab-listen 里），Vue 不渲染它，
// 只能像 legacy 那样直接改文本和 class。legacy 让位后不会再碰它。
function syncStatusBar() {
  const bar = document.getElementById("listenStatusBar");
  if (!bar) return;
  const song = document.getElementById("lsSongName");
  const peer = document.getElementById("lsPeer");
  const musicOn =
    typeof window.__listenMusicOn === "function" ? window.__listenMusicOn() : false;
  const ta = cfgTa();

  if (!musicOn && pomo.running && pomo.kind === "countdown" && pomo.mode === "focus") {
    if (song) song.textContent = "陪你专注 · 还剩 " + fmt(pomo.remain);
    if (peer) peer.textContent = ta;
    bar.classList.remove("hidden");
  } else if (!musicOn && pomo.running && pomo.kind === "stopwatch") {
    if (song) song.textContent = "陪你专注中 · 已 " + fmt(pomo.swSeconds);
    if (peer) peer.textContent = ta;
    bar.classList.remove("hidden");
  } else if (!musicOn) {
    bar.classList.add("hidden");
  }
}

function refresh() {
  pomo.time = pomo.kind === "stopwatch" ? fmt(pomo.swSeconds) : fmt(pomo.remain);

  if (pomo.kind === "stopwatch") {
    pomo.modeText = pomo.running
      ? "⏱️ 正计时中 · " + taName() + "陪着"
      : "⏱️ 正计时 · 点开始";
  } else {
    pomo.modeText =
      pomo.mode === "focus" ? "🌱 专注 · 第 " + pomo.round + " 轮" : "🌿 休息 · 喝口水";
  }

  pomo.skipTitle = pomo.kind === "stopwatch" ? "完成并记录" : "跳过";
  pomo.startLabel = pomo.running ? "暂停" : "开始";

  pomo.ringOffset =
    pomo.kind === "stopwatch" ? 0 : RING_C * (1 - (pomo.total ? pomo.remain / pomo.total : 0));

  if (!pomo.running) {
    pomo.nowText =
      pomo.kind === "stopwatch" ? "记录一段专注时光吧" : "点开始，" + taName() + "陪你一起";
    pomo.noteText =
      pomo.kind === "stopwatch"
        ? "做完停下来，自动记进打卡"
        : pomo.mode === "focus"
        ? "开始一轮，" + taName() + "陪你一起"
        : "休息模式，随时可开始";
  } else {
    pomo.nowText =
      pomo.kind === "stopwatch"
        ? "🍅 " + taName() + "陪你专注中"
        : pomo.mode === "focus"
        ? "🍅 " + taName() + "陪你专注中"
        : "休息一下，" + taName() + "也在";
    pomo.noteText =
      pomo.kind === "stopwatch"
        ? "停下时自动记录这段专注"
        : pomo.mode === "focus"
        ? taName() + "在旁边安静陪你"
        : "喝口水，放松一下～";
  }

  syncStatusBar();
}

export function startPause() {
  if (pomo.running) {
    clearInterval(timer);
    pomo.running = false;
    refresh();
    return;
  }
  pomo.running = true;
  if (pomo.kind === "countdown") {
    if (pomo.mode === "focus" && pomo.remain === pomo.total) {
      taSay("🍅 陪你开始专注！这一轮我都在，加油～");
    }
    timer = setInterval(() => {
      pomo.remain--;
      if (pomo.remain <= 0) {
        clearInterval(timer);
        pomo.running = false;
        finishRound();
        return;
      }
      refresh();
    }, 1000);
  } else {
    if (pomo.swSeconds === 0) taSay("⏱️ 好，开始记录啦！做完这阵记得停下来休息～");
    timer = setInterval(() => {
      pomo.swSeconds++;
      refresh();
    }, 1000);
  }
  refresh();
}

export function resetPomo() {
  clearInterval(timer);
  pomo.running = false;
  pomo.remain = pomo.total;
  pomo.swSeconds = 0;
  refresh();
}

export function recordFocus() {
  const mins = Math.max(
    1,
    Math.round((pomo.kind === "stopwatch" ? pomo.swSeconds : pomo.total) / 60)
  );
  addRecord("focus", pomo.task.trim() || "专注时光", mins);
}

export function finishRound() {
  if (pomo.kind === "stopwatch") {
    if (pomo.swSeconds > 0) {
      recordFocus();
      const mins = Math.max(1, Math.round(pomo.swSeconds / 60));
      if (typeof window.showToast === "function") {
        window.showToast("完成 ♡ 专注了 " + mins + " 分钟");
      }
      const praise = [
        "哇，专心了 " + mins + " 分钟？比我预想的还厉害，我都在旁边看着呢，真棒",
        "嗯，这一段坐得住，进步很大。奖励你喝口水，我给你留着草莓",
        "专注 " + mins + " 分钟，没刷手机吧？真的有在认真做事，我偷偷骄傲了一下",
      ];
      celebrateStudy(mins, praise);
    }
    clearInterval(timer);
    pomo.running = false;
    pomo.swSeconds = 0;
    refresh();
    return;
  }

  if (pomo.mode === "focus") {
    recordFocus();
    pomo.mode = "rest";
    pomo.total = DUR[5];
    pomo.remain = DUR[5];
    pomo.activeDur = 5;
    if (typeof window.showToast === "function") {
      window.showToast("完成第 " + pomo.round + " 轮 ♡ 专注 " + pomo.focusMin + " 分钟");
    }
    const praise2 = [
      "第 " + pomo.round + " 轮拿下！一口水都没喝坚持下来了，真有你的，我给你鼓个掌",
      "这一轮 " + pomo.focusMin + " 分钟，比上一轮还稳。起来活动活动，接下来交给我陪你放松",
      "哇，你认真做事的时候我都不忍心打扰。好了好了，去喝口水，歇 5 分钟，我在呢",
    ];
    celebrateStudy(pomo.focusMin, praise2);
  } else {
    pomo.mode = "focus";
    pomo.round++;
    pomo.total = DUR[pomo.focusMin];
    pomo.remain = DUR[pomo.focusMin];
    pomo.activeDur = pomo.focusMin;
    taSay("休息好啦？新一轮开始，我继续陪着你 💪");
  }
  refresh();
}

export function pickDur(min) {
  if (pomo.kind !== "countdown") return;
  clearInterval(timer);
  pomo.running = false;
  if (min === 5) {
    pomo.mode = "rest";
  } else {
    pomo.mode = "focus";
    pomo.focusMin = min;
  }
  pomo.total = DUR[min];
  pomo.remain = DUR[min];
  pomo.activeDur = min;
  refresh();
}

export function switchKind(kind) {
  if (pomo.kind === kind) return;
  clearInterval(timer);
  pomo.running = false;
  pomo.kind = kind;
  if (kind === "stopwatch") {
    pomo.swSeconds = 0;
  } else {
    pomo.mode = "focus";
    pomo.focusMin = 45;
    pomo.total = DUR[45];
    pomo.remain = DUR[45];
    pomo.activeDur = 45;
  }
  refresh();
}

export function skipRound() {
  if (pomo.kind === "stopwatch") {
    if (pomo.swSeconds > 0) {
      clearInterval(timer);
      pomo.running = false;
      finishRound();
    }
    return;
  }
  if (!pomo.running) return;
  clearInterval(timer);
  pomo.running = false;
  finishRound();
}

// 组件挂载后跑一次，把初始文案/环/状态条/今天的学习统计填好
export function initPomo() {
  refresh();
  renderTodayStudy();
  // 挂载那一刻数据可能还没水合完（首屏必然读到空），水合好了再画一次，
  // 否则「今天明明学过」却显示不出来 —— 和其它界面 storeready 重放是同一个道理。
  try {
    if (window.LS && window.LS.isReady && window.LS.isReady()) setTimeout(renderTodayStudy, 0);
    else window.addEventListener("collide:storeready", () => setTimeout(renderTodayStudy, 0));
  } catch (e) {}
}
