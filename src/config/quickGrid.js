// 九宫格快捷入口（其实是 11 个，不是 9 个，3 列排布）
// 来源：legacy index.html 3844–3887
//
// ⚠️ 交互仍归 legacy：点击由 .home-quick 上的事件委托处理（switchTab / enterChat），
//    Vue 只负责把结构渲染出来。不要在组件里另绑 click，否则会触发两次。
//    data-quick 是 legacy 读取的唯一依据，不能改名。

export const QUICK_GRID = [
  { key: "chat",     label: "聊天",   icon: "chat"      },
  { key: "listen",   label: "陪伴",   icon: "clock"     },
  { key: "us",       label: "我们",   icon: "users"     },
  { key: "todo",     label: "代办",   icon: "check"     },
  { key: "memory",   label: "回忆",   icon: "sparkle",  sw: 1.5 }, // 原图 stroke-width 就是 1.5
  { key: "letter",   label: "信封",   icon: "mail"      },
  { key: "diary",    label: "日记",   icon: "book"      },
  { key: "music",    label: "一起听", icon: "headphone" },
  { key: "timeline", label: "时光轴", icon: "clock2"    },
  { key: "where",    label: "他在干嘛", icon: "pin"     },
  { key: "more",     label: "更多",   icon: "dots"      },
];
