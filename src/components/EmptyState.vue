<script setup>
import { computed } from "vue";
import Icon from "./Icon.vue";

// 空状态：大图标 + 居中文案。legacy 里有 4 处结构完全一样，只是图标和文案不同。
// 来源：legacy index.html 4074 / 4215 / 4253 / 4277
//
// ⚠️ 本组件**不控制显示/隐藏**：
//    挂载时 Vue 保留容器本身（#todoEmpty 等），只替换容器里的内容，
//    所以 legacy 那些 `el.style.display = "" / "none"` 和 `.hidden` class 切换照旧生效在容器上。
//    一旦这里用 v-if 自己控制显隐，就会和 legacy 打架 —— 那是 Step 4 搬 tab 时才做的事。

const props = defineProps({
  icon: { type: String, required: true },
  // 空状态图标统一是 1.2 的细描边（比九宫格 1.6 更轻）
  sw: { type: [Number, String], default: 1.2 },
  // 用 \n 分行，组件内部转成 <br>
  text: { type: String, default: "" },
});

const lines = computed(() => String(props.text || "").split("\n"));
</script>

<template>
  <Icon :name="icon" :sw="sw" />
  <!-- 紧凑写法：不留缩进空白，避免和 legacy 的渲染结果差出空格 -->
  <template v-for="(line, i) in lines" :key="i"><br v-if="i > 0" />{{ line }}</template>
</template>
