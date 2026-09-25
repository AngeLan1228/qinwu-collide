<!--
  Step 6.3：长按/右键气泡弹出的操作菜单 #msgMenu。

  同样只搬结构、不搬行为：
    · 遮罩和动作条的点击仍由 legacy 的 bindMsgMenu() 挂（vue:mounted 会重跑一次）
    · 动作条的定位（style.top/left/visibility）也还是 legacy 写的 —— Vue 不绑 style，
      否则 re-patch 会把 legacy 算好的落位抹掉
    · 「抬起的气泡克隆」是 legacy 用 menu.insertBefore(cloneEl, actions) 插进来的，
      它是一个纯 DOM 节点，Vue 不认识也不管 —— 所以组件里**不能**把它写成模板的一部分
  容器 #msgMenu 自己不在组件里（mount 保留容器），legacy 缓存的 menu 常量照旧有效。

  多根直出：scrim 和 actions 是 #msgMenu 的两个直接子节点，
  中间还要留给 JS 插入克隆气泡，包一层壳会把布局搞乱。
-->
<template>
  <div class="msg-menu-scrim" id="msgMenuScrim"></div>

  <div class="msg-menu-actions" id="msgMenuActions" role="menu" aria-label="消息操作">
    <button class="msg-act" type="button" data-act="reply" role="menuitem">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 17l-5-5 5-5"/><path d="M4 12h11a5 5 0 0 1 5 5v2"/></svg>
      <span>回复</span>
    </button>
    <button class="msg-act" type="button" data-act="copy" role="menuitem">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>
      <span>Copy</span>
    </button>
    <button class="msg-act danger" type="button" data-act="delete" role="menuitem">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16"/><path d="M10 11v6M14 11v6"/><path d="M5 7l1 13a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1l1-13"/><path d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3"/></svg>
      <span>Delete</span>
    </button>
  </div>
</template>
