<script setup>
// 聊天空状态（Step 6 的第一刀）
//
// 为什么选它当第一步：整个聊天区是一坨 6800 行的顶层全局脚本（4597 起到文件尾），
// DOM 引用在 4600 行一次性缓存成 const，动任何一块都要横跨几千行改引用。
// 唯独 #empty 是干净的 —— 它被用到的地方只有：
//   9691  scrollEl.firstChild !== emptyEl      （判断当前是不是空状态）
//   9708  c !== emptyEl && ... c.remove()      （清列表时保住它）
//   9756/9762  emptyEl.classList.add/remove("hidden")
//   9757  scrollEl.replaceChildren(emptyEl)    （把它放回列表）
// 全是**节点级**操作，从不写它的 innerHTML，容器本身也不会被替换。
// Vue 的 mount(el) 保留容器只换内部 → 上面这些全部照旧有效，legacy 零改动。
//
// 结构必须保持 <div class="orb"> + <p>：legacy 的 applyIdentity()（index.html 4689）
// 用 querySelector("#empty p").innerHTML 往里塞 AI_NAME。
// 多根直出，不包壳 —— 包一层 div 会让 .empty 的直接子元素结构变掉。
import { ref } from "vue";

// AI_NAME 是全局 let（4463），不是 window 属性，module 里直接引用标识符即可。
function aiName() {
  try {
    if (typeof AI_NAME !== "undefined" && AI_NAME) return AI_NAME;
    if (typeof CONFIG !== "undefined" && CONFIG && CONFIG.AI_NAME) return CONFIG.AI_NAME;
  } catch (e) {}
  return "Claude";
}

const name = ref(aiName());
</script>

<template>
  <div class="orb"></div>
  <p>这里只有你和{{ name }}。<br />说点什么吧。</p>
</template>
