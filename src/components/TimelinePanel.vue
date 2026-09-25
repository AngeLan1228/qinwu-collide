<script setup>
// 时光轴整块。来源：legacy index.html 4265–4286
//
// 它是 Step 4 的收尾一个 tab，也是结构最简单的：一张白卡片，卡体里一个列表 + 一个空状态。
// 内容**完全由 legacy 的 loadTimeline() 用 innerHTML 填**（#timelineList），
// 所以这里只写壳、不写内容 —— 千万别自作聪明填默认条目，会把真实数据盖掉。
//
// 两个必须照搬的细节：
//   1. #timelineEmpty **不带 hidden class**。legacy 的空状态显隐是 style.display 控制的，
//      而 .hidden 是 display:none !important，带上它的话空状态永远显示不出来（legacy 自带的 bug）。
//   2. 空状态文案里的换行必须走 JS 常量 + :text 绑定。
//      Vue 模板属性里的 \n 是「反斜杠 + n」两个字面字符，写进属性不会换行，
//      EmptyState 也就切不出三行（症状：br 数从 2 变 0）。
//
// loadTimeline() 是 async 且用 getElementById 现取元素，晚于 Vue 挂载，天然安全；
// 切到这个 tab 时由 switchTab 触发。legacy 侧另外挂了 vue:mounted 监听，
// 万一启动时就停在这一页也能补一次。
import UsCard from "./UsCard.vue";
import EmptyState from "./EmptyState.vue";

const EMPTY_TEXT = "时光轴还是空的\n一起聊天、写日记、收信、听歌……\n每一步都会悄悄长在这里 ♡";
</script>

<template>
  <div class="us-section">
    <UsCard
      icon="timeline"
      title="时光轴"
      sub="你们走过的每一步，都值得被记住"
      subId="timelineSub"
      icStyle="background:rgba(var(--accent-rgb),0.14);"
    >
      <div class="timeline" id="timelineList"></div>
      <div class="timeline-empty" id="timelineEmpty">
        <EmptyState icon="timeline" :text="EMPTY_TEXT" />
      </div>
    </UsCard>
  </div>
</template>
