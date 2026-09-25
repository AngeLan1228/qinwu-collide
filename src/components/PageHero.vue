<script setup>
import Icon from "./Icon.vue";

// 页面大标题：陪伴 / 他在干嘛 / 一起听 三处的 .listen-hero 都是「图标 + 主标题 + 副标题」。
// 来源：legacy index.html 3893–3899（listen）/ 3965–3968（where）/ 3984–3995（music）
//
// 三处的差别：
//   listen → 有 .listen-icon 图标
//   where  → 没有图标（只有标题和副标题）
//   music  → 图标位置换成 .vinyl-wrap 黑胶（用 <slot name="visual"> 塞进来）
// 所以图标和黑胶都做成可选，标题/副标题固定。
//
// ⚠️ 挂载点是 .listen-hero 本身（Vue 保留容器、只换内容），
//    所以本组件是**多根**，不能再包一层 div，否则会破坏 flex column + gap 的布局。

defineProps({
  icon: { type: String, default: "" }, // 为空就不渲染图标（where 页）
  sw: { type: [Number, String], default: 1.5 },
  title: { type: String, default: "" },
  sub: { type: String, default: "" },
  // legacy 靠这两个 id 改文案（applyNames 等），必须能透传
  titleId: { type: String, default: "" },
  subId: { type: String, default: "" },
});
</script>

<template>
  <div v-if="icon" class="listen-icon"><Icon :name="icon" :sw="sw" /></div>
  <slot name="visual" />
  <div class="listen-title" :id="titleId || null">{{ title }}</div>
  <div class="listen-sub" :id="subId || null">{{ sub }}</div>
</template>
