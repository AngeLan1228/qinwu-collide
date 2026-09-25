<script setup>
// 「他在干嘛」页：hero（无图标）+ 一块 pomo-panel。
// 来源：legacy index.html 3964–3980
//
// 这页的内容 100% 由 legacy 用 innerHTML / textContent 填：
// whereNow / whereMeta / whereMood / whereTimeline / whereFeed 五个空壳，
// 靠 switchTab 里的 `window.renderWhere()` 和「戳他一下」按钮填内容。
// 所以本组件只负责把壳和那个按钮渲染出来，一个字的内容都不写。
//
// 风险点只有一个：legacy 缓存了 `var pb = document.getElementById("pokeBtn")`
// 再 addEventListener，整块接管后节点被 Vue 换掉 → 已改委托到 #tab-where。
// 其余取元素都是现取（render / renderFeed / poke 内部），天然安全。

import PageHero from "./PageHero.vue";
</script>

<template>
  <div class="listen-hero">
    <PageHero
      title="他现在在干嘛"
      sub="看他此刻在做什么、心情如何"
      titleId="whereTitle"
      subId="whereSub"
    />
  </div>
  <div class="pomo-panel" style="padding: 22px">
    <div id="whereNow" style="font-size: 18px; font-weight: 600; margin-bottom: 6px"></div>
    <div
      id="whereMeta"
      style="font-size: 13px; color: var(--text-secondary); margin-bottom: 18px"
    ></div>
    <div id="whereMood" style="font-size: 14px; margin-bottom: 20px; line-height: 1.7"></div>
    <div style="font-size: 13px; opacity: 0.7; margin-bottom: 8px">他今天的行程</div>
    <div
      id="whereTimeline"
      style="font-size: 14px; line-height: 2; margin-bottom: 18px"
    ></div>
    <div style="font-size: 13px; opacity: 0.7; margin-bottom: 8px">他今天的小动态</div>
    <div
      id="whereFeed"
      style="font-size: 14px; line-height: 1.9; margin-bottom: 18px"
    ></div>
    <button
      id="pokeBtn"
      type="button"
      style="
        width: 100%;
        padding: 11px;
        border-radius: 12px;
        border: none;
        background: var(--accent, #e8a0b4);
        color: #fff;
        font-size: 14px;
        cursor: pointer;
      "
    >
      戳他一下 🫵
    </button>
    <div
      id="pokeReply"
      style="margin-top: 12px; font-size: 14px; line-height: 1.7; min-height: 20px"
    ></div>
  </div>
</template>
