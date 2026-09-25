<script setup>
import { MOODS } from "../config/moods.js";

// 心情 5 连：日记表单和打卡用同一组 emoji，但 DOM 结构不一样，用 variant 区分。
// 来源：legacy index.html 4108–4112（diary）/ 4186–4190（checkin）
//
// 两处差异必须 1:1 还原，否则 CSS 选择器对不上：
//   checkin → <button class="mood-btn" data-mood="😊"><span>😊</span></button>   （无初始 active）
//   diary   → <button data-mood="😊" class="active">😊</button>                  （第一个默认 active，无 span）
//
// ⚠️ active 不做成响应式：legacy 用 classList 直接改 DOM（index.html 6130 / 5975）。
//    这里只在首次渲染时输出初始状态，之后不重渲染，legacy 的改动才不会被 Vue 覆盖。

const props = defineProps({
  variant: { type: String, default: "checkin" }, // "checkin" | "diary"
});

const isCheckin = props.variant === "checkin";
</script>

<template>
  <button
    v-for="(m, i) in MOODS"
    :key="m"
    :class="isCheckin ? 'mood-btn' : i === 0 ? 'active' : null"
    type="button"
    :data-mood="m"
  >
    <span v-if="isCheckin">{{ m }}</span>
    <template v-else>{{ m }}</template>
  </button>
</template>
