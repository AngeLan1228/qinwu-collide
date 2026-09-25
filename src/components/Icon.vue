<script setup>
import { getIcon } from "../icons.js";

const props = defineProps({
  name: { type: String, required: true },
  // 九宫格 1.6 / 底导航 1.7 / 回忆 1.5 —— 沿用 legacy 原值
  sw: { type: [Number, String], default: 1.6 },
});

const shapes = getIcon(props.name);
</script>

<template>
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    :stroke-width="sw"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <template v-for="(s, i) in shapes" :key="i">
      <path v-if="s.t === 'path'" :d="s.d" />
      <circle v-else-if="s.t === 'circle'" :cx="s.cx" :cy="s.cy" :r="s.r" />
      <rect
        v-else-if="s.t === 'rect'"
        :x="s.x"
        :y="s.y"
        :width="s.width"
        :height="s.height"
        :rx="s.rx"
      />
      <line v-else-if="s.t === 'line'" :x1="s.x1" :y1="s.y1" :x2="s.x2" :y2="s.y2" />
      <polyline v-else-if="s.t === 'polyline'" :points="s.points" />
    </template>
  </svg>
</template>
