<script setup>
import Icon from "./Icon.vue";
import { QUICK_GRID } from "../config/quickGrid.js";
</script>

<template>
  <!--
    渲染成 .home-quick 的直接子元素（多根组件，不额外包一层 div），
    否则会破坏 .home-quick 的 grid 布局。
    ⚠️ 不绑 click：legacy 在 .home-quick 上做了事件委托，绑了会触发两次。
  -->
  <button
    v-for="item in QUICK_GRID"
    :key="item.key"
    class="quick-card"
    type="button"
    :data-quick="item.key"
  >
    <span class="quick-ic"><Icon :name="item.icon" :sw="item.sw || 1.6" /></span>
    <span class="quick-lbl">{{ item.label }}</span>
  </button>
</template>
