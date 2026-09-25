// Step 2：Vue 接管 Menu 里 5 类「纯展示」结构，其余仍是 legacy 静态 HTML。
//
// 为什么是多个独立 app、直接挂到现成容器上：
//   1. Vue 的 mount(el) **保留 el 本身**，只替换 el 里的内容。
//      所以 legacy 那些挂在容器上的 id/style/class（#todoEmpty 的 display 手控、
//      .mood-row 的 grid、.listen-hero 的 flex）全都原地生效，不会被 Vue 抹掉。
//   2. 这些容器的 CSS 大多是「父容器 > 直接子元素」或后代选择器，
//      组件必须多根直出（不额外包一层 div），否则布局就散了。
//   3. legacy 的事件绑定绑在容器上做委托，Vue 换掉里面的按钮后委托照旧生效。
//
// 时序（很关键）：本文件是 <script type="module">，属于 defer，
// 会在文档解析完成后、DOMContentLoaded 之前执行 ——
// 也就是晚于页面里那些「解析到就立刻跑」的内联脚本。
// 所以 legacy 里凡是 querySelectorAll(...).forEach(绑事件) 的写法都会抓空，
// 必须先在 legacy 侧改成事件委托（已在 index.html 改好），否则点击全失效。
//
// ⚠️ 本步刻意**没有**接管 listen / us / music 三个 tab：
//    它们在 IIFE 里把 DOM 元素缓存成了常量（如 listenNowLabel、annivList），
//    Vue 一换 DOM 那些缓存就指向已脱离文档的旧节点，功能会静默失效。
//    这几个留到 Step 4 逐 tab 搬的时候连同缓存一起改。

import { createApp, h } from "vue";
import { menu } from "./state.js";
// QuickGrid 不再在这里 import：首页整块交给 HomePanel（Step 4）后由它内部引入。
import TabBar from "./components/TabBar.vue";
// MoodPicker / EmptyState / UsCard 都不再在这里 import：打卡页（CheckinPanel）、
// 日记页（DiaryPanel）、时光轴（TimelinePanel）整块接管后都由各自组件内部引入。
// 在 main.js 里为「已被整块接管」的容器单独挂子组件，会在整块挂载时连 DOM 一起被换掉。
import LetterHero from "./components/LetterHero.vue";
import TodoPanel from "./components/TodoPanel.vue";
import MemoryPanel from "./components/MemoryPanel.vue";
import DiaryPanel from "./components/DiaryPanel.vue";
import MorePanel from "./components/MorePanel.vue";
import WherePanel from "./components/WherePanel.vue";
import MusicPanel from "./components/MusicPanel.vue";
import CheckinPanel from "./components/CheckinPanel.vue";
import ListenPanel from "./components/ListenPanel.vue";
import HomePanel from "./components/HomePanel.vue";
import UsPanel from "./components/UsPanel.vue";
import TimelinePanel from "./components/TimelinePanel.vue";
// Step 6 的第一刀：聊天空状态。它不属于 Menu 的 12 个 tab，
// 而是聊天主页面（#scroll 内）的东西 —— 这是 Vue 第一次进入 Menu 之外的区域。
import ChatEmpty from "./components/ChatEmpty.vue";
import Composer from "./components/Composer.vue";
import MsgMenu from "./components/MsgMenu.vue";
import StickerPanel from "./components/StickerPanel.vue";

function mount(selector, comp, props = {}, slots = null) {
  const el = document.querySelector(selector);
  if (!el) {
    console.warn("[vue] 挂载点不存在，跳过:", selector);
    return null;
  }
  try {
    // 统一走 h()：需要传 slot 的场景（UsCard 的卡体）也能用同一套逻辑
    const app = createApp({ render: () => h(comp, props, slots || undefined) });
    app.mount(el);
    return app;
  } catch (e) {
    // 挂载失败要留痕但不能拖垮 legacy 页面 —— 容器里原本的内容已被 Vue 清空，
    // 这种情况只会出现在开发期，线上必须是可运行的。
    console.error("[vue] 挂载失败 " + selector, e);
    return null;
  }
}

// ── Step 3：把「当前是哪个 tab」从 legacy 同步进 Vue ──
// 用 MutationObserver 监听 .tab-content 的 class，而不是去包装 window.switchTab：
// switchTab 已被 legacy 的 IIFE 包装过好几层（记忆库那块就重写过一次），再包一层容易乱。
// 监听 DOM 更稳 —— 不管从哪条路径切 tab（底栏、九宫格、代码里直接调）都能同步到。
function watchActiveTab() {
  const sync = () => {
    const cur = document.querySelector(".tab-content.active")?.dataset.tab;
    if (cur && cur !== menu.activeTab) menu.activeTab = cur;
  };
  sync(); // 初始值：bootPage 会直接进 us，底栏高亮得跟着它走
  const root = document.querySelector(".menu-scroll");
  if (root) {
    new MutationObserver(sync).observe(root, {
      subtree: true,
      attributes: true,
      attributeFilter: ["class"],
    });
  }
}

// 调试用：把共享状态挂到 window，方便在控制台 / CDP 脚本里直接看当前 tab（不参与任何逻辑）
window.__menu = menu;

// ── Step 1 已落地 ──
// 顺序有讲究：先同步出当前 tab，再挂 TabBar，否则首帧会先亮 home 再跳走
watchActiveTab();
// .home-quick 交给 HomePanel 内部渲染（Step 4 ⑩ 首页整块接管）：
// 九宫格在 #tab-home 里面，整块挂载会把单独挂到 .home-quick 的实例连 DOM 一起换掉。
mount(".tab-bar", TabBar);

// ── Step 2：空状态 4 处 ──
// 只换内容，显隐仍由 legacy 的 style.display / .hidden 控制（容器保留）
// #todoEmpty 不在这里挂了：代办页整块已交给 TodoPanel（Step 4），
// 空状态由它内部渲染，再单独 mount 会在整块挂载时连 DOM 一起被换掉。
// #checkinEmpty 同理：打卡页整块交给 CheckinPanel（Step 4），移到这里下面。
// #memoryEmpty 同样交给 MemoryPanel 内部渲染（Step 4），理由同上
// #timelineEmpty 同理：时光轴整块交给 TimelinePanel（Step 4 收尾），
// 空状态连同卡片一起由它内部渲染（UsCard + EmptyState）。

// ── Step 2：心情 5 连 2 处 ──
// #moodRow 交给 CheckinPanel 内部渲染（Step 4 ⑧ 打卡页整块接管）
// #diaryMoods 交给 DiaryPanel 内部渲染（Step 4），理由同上

// ── Step 2：筛选 chip 2 处 ──
// 两处都下放给页面组件了：.todo-filters → TodoPanel，#memoryFilters → MemoryPanel

// ── Step 2 曾在这里单独挂 where 页的 hero（PageHero 的首个落地点）──
// Step 4 整块接管 where 后改由 WherePanel 内部渲染（见下），
// 这里再挂会因为整块挂载时 DOM 被换掉而留下指向孤儿节点的实例。

// ── Step 4：时光轴 ──
// Step 4 的收尾。此前这里只把白卡片挂在 #tab-timeline .us-section 上（Step 2 的做法），
// 现在整块 tab 交给 TimelinePanel —— 和别的 tab 一样，挂容器 #tab-timeline 本身。
// 内容仍是 legacy 的 loadTimeline() 用 innerHTML 塞进 #timelineList，只写壳不写内容。
mount("#tab-timeline", TimelinePanel);

// ── Step 4：信封页 ──
// 这是第一个「整块 tab 交给 Vue」的页面。和前几步最大的不同：
// 它的列表 #letterList 是 legacy 用 innerHTML 塞内容的，而 legacy 在脚本末尾
// 就调了 loadLetters() —— 早于 Vue 挂载，内容会写进被丢弃的旧 DOM。
// 解决办法是下面这个 vue:mounted 广播：legacy 监听后重跑一次加载。
mount("#tab-letter", LetterHero, {
  icon: "mail",
  title: "秦梧的信",
  sub: "他偶尔想说、又不好意思当面说的话，都写在信里",
  titleId: "letterH1",
  btnId: "letterGenBtn",
  btnText: "收一封信",
  listId: "letterList",
});

// ── Step 4：代办页 ──
// 待办列表 #todoList 同样是 legacy innerHTML 塞的，且脚本末尾就 renderTodos() 了，
// 靠下面的 vue:mounted 重跑。todo 的 JS 缓存了 input/btn/list 三个引用，
// 已在 legacy 侧改成现取 + 委托（绑 #tab-todo），否则挂载后全部失效。
mount("#tab-todo", TodoPanel);

// ── Step 4：记忆库 ──
// 列表同样是 legacy innerHTML 塞的、脚本末尾就 loadMemories()，靠 vue:mounted 重跑。
// 新增风险点：legacy 此前把委托绑在 #memoryFilters **容器本身**上，
// 整块接管后容器会被 Vue 重建 → 委托必须上移到 #tab-memory（已在 legacy 侧改）。
mount("#tab-memory", MemoryPanel);

// ── Step 4：日记 ──
// 这个 tab 是 legacy 里缓存引用最多的一处（9 个元素全在 IIFE 顶层取），
// 已全部改成现取 + 委托到 #tab-diary。额外一条：日期默认值 diaryDate.value
// 是初始化时赋的，DOM 重建后要重设，所以 vue:mounted 里除了 loadDiary 还带了 setDiaryDate。
// hero 复用 LetterHero（操作区走默认 slot，编辑表单走新的 after slot）。
mount("#tab-diary", DiaryPanel);

// ── Step 4：更多页 ──
// 全 Menu 唯一没有动态内容、也没有初始化副作用的 tab —— 搬它的风险集中在别处：
// 5 个入口**都绑了点击**，legacy 原本是遍历 [data-gotab] + 按 id 逐个 addEventListener，
// 换 DOM 后必然全失效，已在 legacy 侧统一改成委托到 #tab-more。
// 另外这页的图标名此前写错过一轮（设置用了对勾），这次按原 SVG 逐个核对改回。
mount("#tab-more", MorePanel);

// ── Step 4：他在干嘛 ──
// 内容是 legacy 用 innerHTML/textContent 填的五个空壳，靠 switchTab 里的
// window.renderWhere() 渲染 —— 切过去才填，所以不存在「启动就写进旧 DOM」的问题。
// 唯一要改的是「戳他一下」按钮：legacy 缓存了引用再绑事件，已改委托到 #tab-where。
mount("#tab-where", WherePanel);

// ── Step 4：一起听 ──
// 第一个「按钮事件跟 DOM 一起换掉」的 tab。此前几个 tab 要补的多半是列表内容，
// 这页多了两个按钮（＋上传 / 随机-顺序）和一个 file input —— 它们原本在 IIFE 里
// 缓存成 const 再 addEventListener，换 DOM 后点击会静默失效（不报错、就是没反应）。
// legacy 侧已改成现取 + dataset 幂等绑定，Vue 挂载后由 initMusic() 重绑。
// hero 的黑胶走 PageHero 的 visual slot，是它的第二个落地点。
mount("#tab-music", MusicPanel);

// ── Step 4：打卡 ──
// 这页的风险不在内容，在**六个点击**。legacy 原本把它们分别绑在
// #moodRow / #checkinSubmit / #checkinGrid / #calPrev / #calNext / #checkinList 上，
// 六个全是 #tab-checkin 的内部节点，整块接管后每个都会被重建 → 全失效。
// 已全部上移到容器 #tab-checkin 做委托：Vue 的 mount 保留容器，委托挂一次就一直有效。
// 本组件内部渲染 MoodPicker 和 EmptyState —— main.js 里那两个独立 mount 已删，
// 否则先挂后清会留下指向孤儿节点的实例。
mount("#tab-checkin", CheckinPanel);

// ── Step 4：陪伴（番茄钟 + 轻音乐）──
// 全项目**缓存引用最多**的一页：IIFE 顶层一次性缓存了 12 个元素，
// 番茄钟本身用的是 setInterval + 闭包状态，界面 DOM 被 Vue 换掉后
// 计时照跑、界面纹丝不动，而且控制台没有任何报错 —— 典型的静默失效。
// legacy 侧已把这 12 个改成现取函数，六个按钮改成委托到 #tab-listen。
// 唯一保留缓存的是 statusBar / lsSong / lsPeer：它们在 body 顶层的浮动条上，
// 不在 #tab-listen 里面，Vue 不会碰。
mount("#tab-listen", ListenPanel);

// ── Step 4：首页 ──
// 两个特殊点：
//   1. 迷你栏原本挂着内联 onclick —— Vue 模板里属性是**表达式**，那串 JS 会被求值并报错，
//      改成 @click 传函数，行为不变（还是去点九宫格里那个「他在干嘛」）。
//   2. 九宫格在 home 里面，Step 1 那个独立的 mount(".home-quick") 已删，
//      改由 HomePanel 渲染 —— 否则整块挂载会把那个实例连 DOM 一起换掉。
// 天数/since/两个名字是 legacy 的 refreshHome() 写的，四处缓存引用已改现取。
mount("#tab-home", HomePanel);

// ── Step 4：我们 ──
// Step 4 的最后一个 tab，也是「起步就默认进的那一页」（bootPage 里默认 openMenu("us")），
// 所以它的挂载时机最靠前，出问题会第一眼就被看见。
// 三处改动：annivList / addAnnivBtn 缓存改现取；四个换头像按钮改现取 + dataset 幂等绑定；
// 「添加纪念日」和中间那个交换箭头改委托到容器 #tab-us。
// 两个白卡片都复用 Step 2 的 UsCard（这是它的第四、第五个落地点）。
mount("#tab-us", UsPanel);

// ── Step 6 第一刀：聊天空状态 ──
// Vue 第一次进入 Menu 之外的区域（#empty 在聊天主页面的 #scroll 里，不是 tab）。
// 选它当第一步是因为它零耦合：legacy 对 emptyEl 只有 classList 和 replaceChildren
// 两种操作，从不写它的 innerHTML，容器本身也不会被换掉 —— 所以 Vue 挂上去
// 不需要动 legacy 任何一行。显隐（.hidden）依旧由 legacy 控制。
// 结构保持 <div class="orb"> + <p>：applyIdentity() 会往那个 p 里塞 AI_NAME。
mount("#empty", ChatEmpty);

// ── Step 6.2：输入区 composer ──
// 主页面上的第二块（第一块是上面的 #empty）。和 tab 那套最大的不同：
// 这里**不能**做响应式接管 —— #input 是非受控 textarea，value 归 legacy 的 doSend() 读，
// 发送/语音的 hidden 和引用条的显隐也都还是 legacy 在 classList。
// Vue 一旦绑了 :value 或 :class，两边同时写就会互相抹掉（输入框吞字、发送键不亮）。
// 所以这一版纯粹是「结构搬家」，行为靠 legacy 的 vue:mounted 重跑绑定挂回来：
//   bindComposer（输入框一串监听 + 发送键 click）/ bindClip / bindEmojiBtn / bindVVInput。
// 等 6.5 把消息列表搬完，这块才会真正变成受控组件。
mount(".composer", Composer);

// ── Step 6.3：消息操作菜单 #msgMenu ──
// 长按/右键气泡弹出的那一条（回复 / Copy / Delete）。和 composer 同样的思路：只搬结构。
// 三个细节：
//   1. 容器 #msgMenu **不在组件里**（mount 保留容器）—— legacy 缓存的 menu 常量照旧有效，
//      open()/close() 全靠它切 .open。
//   2. 遮罩和动作条是内部节点 → legacy 那两个缓存已改现取，点击绑定抽成 bindMsgMenu()，
//      由 vue:mounted 重跑一次。
//   3. 「抬起的气泡克隆」是 legacy 用 insertBefore 插进来的纯 DOM 节点，
//      Vue 不认识它 —— 组件里千万别把它当模板内容写，否则会被 diff 掉。
mount("#msgMenu", MsgMenu);

// ── Step 6.4：贴纸面板 #stickerPanel ──
// Step 6 里第一块「连行为一起搬」的：前面三块（#empty / .composer / #msgMenu）
// 内容都归 legacy 写，Vue 只出结构；这块的内容本来就是 legacy 用 innerHTML
// 一把梭生成的，Vue 接管后 legacy 只能停手（stickerOwnedByVue()，与番茄钟同款让位），
// 否则 fetch 回调回来的 appendChild 会把节点混进 Vue 的 DOM。
// 三件事刻意留给 legacy：面板显隐（#emojiBtn 的点击和空白处收起都在它那边）、
// sendSticker（牵扯乐观消息/轮询，等于提前做 6.5）、resolveSticker（blob: 转换带缓存）。
// 容器是 display:grid，所以组件多根直出，不能包壳。
mount("#stickerPanel", StickerPanel);

// ── 挂载完成：通知 legacy 重跑一次 ──
// 为什么用事件而不是直接调 legacy 的函数：让两边互不认识。
// Vue 不需要知道 legacy 有哪些加载函数；legacy 纯部署（没有 Vue）时这个事件
// 永远不会触发，原逻辑一行都不用改。以后每接管一个 tab，就在 legacy 对应
// IIFE 里加一行监听即可。
document.dispatchEvent(new Event("vue:mounted"));
