// 底部导航 5 项
// 来源：legacy index.html 4290–4309
//
// ⚠️ 交互仍归 legacy：switchTab() 会在切换时用 classList 给 .tab-btn 加/去 active。
//    组件只在首次渲染时输出初始 active（home），之后不再重渲染，
//    这样 legacy 对 DOM 的改动不会被 Vue 覆盖 —— 这是 Step 1「零行为变化」的关键。
//
// 已知坑（Step 3 处理）：12 个 tab 里只有这 5 个在底栏，
// 从九宫格点进 us/music/letter/diary/memory/timeline/where 时底栏一个都不亮。

export const TAB_BAR = [
  { key: "home",    label: "首页", icon: "home"     },
  { key: "listen",  label: "陪伴", icon: "clock"    },
  { key: "todo",    label: "代办", icon: "check"    },
  { key: "checkin", label: "打卡", icon: "calendar" },
  { key: "more",    label: "更多", icon: "dots"     },
];

// 底栏 stroke-width 是 1.7（九宫格是 1.6），别混用
export const TAB_BAR_SW = 1.7;

// 12 个 tab 各自「归到」哪个底栏项 —— 用来修那个已知坑：
// 从九宫格点进 us / music / letter / diary / memory / timeline / where 时，
// 因为这 7 个不在底栏里，legacy 只能一个都不亮，用户看不出自己在哪。
//
// 归属依据（要改的话改这里就行，别动组件）：
//   music / where → listen：都是「陪伴」类（一起听、他在干嘛）
//   diary        → checkin：日记和打卡同属「记录」
//   us           → more：更多页的分组列表里本来就有「我们」这一项（见 moreGroups.js）
//   letter / memory / timeline → home：都是首页九宫格直达的内容页
export const TAB_OWNER = {
  home: "home",
  listen: "listen",
  music: "listen",
  where: "listen",
  todo: "todo",
  checkin: "checkin",
  diary: "checkin",
  letter: "home",
  memory: "home",
  timeline: "home",
  us: "more",
  more: "more",
};
