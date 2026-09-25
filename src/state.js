import { reactive } from "vue";

// Menu 的共享状态：当前激活的是 12 个 tab 里的哪一个。
//
// 为什么用独立模块而不是 props：main.js 里挂了多个互不相关的 app（九宫格、底导航…），
// 用 props 传不进响应式，直接 import 这个 reactive 对象最简单，组件里访问 `menu.activeTab` 就能自动追踪。
//
// ⚠️ 这个值是**被 legacy 驱动**的（main.js 用 MutationObserver 监听 .tab-content 的 class 变化同步过来），
//    Vue 不主动去改 DOM —— 切 tab 仍然是 legacy 的 switchTab 在做，Vue 只负责把高亮画对。

export const menu = reactive({
  activeTab: "home",
});
