<script setup>
import { computed, watch, nextTick } from "vue";
import Icon from "./Icon.vue";
import { TAB_BAR, TAB_BAR_SW, TAB_OWNER } from "../config/tabs.js";
import { menu } from "../state.js";

// Step 3：高亮改成响应式，并且修掉「7 个 tab 底栏一个都不亮」的坑。
//
// 高亮逻辑：当前 tab 可能不在底栏里（比如 us / music / letter），
// 先经 TAB_OWNER 归到最近的底栏项，再点亮那一项 —— 这样用户永远看得出自己在哪个分区。
//
// ⚠️ 现在由 Vue 统一管高亮了，legacy switchTab 里的 classList 改动会被重渲染覆盖。
//    两者算出来的结果是一致的（都指向同一个 tab），所以不会打架；
//    真正驱动切换的仍然是 legacy 的 switchTab，Vue 只是把高亮画对。

const owner = computed(() => TAB_OWNER[menu.activeTab] || menu.activeTab);
const isActive = (key) => key === owner.value;

// ⚠️ 这一手是必须的，别删 —— 一个很隐蔽的坑：
// legacy 的 switchTab() 会先把所有 .tab-btn 的 active 清掉，再「只给底栏 5 项里匹配的那一个」加回来。
// 所以切到 music / where / diary 这类不在底栏的 tab 时，它清完就不加了，DOM 里一个亮的都没有。
// 而如果上一个 tab 的归属恰好和现在一样（listen → music，都归 listen），
// Vue 算出来的 class 字符串和上次**完全相同**，diff 认为没变化就不会去 patch DOM，
// 于是 DOM 就停在 legacy 清完之后的「全灭」状态。
// 这里在状态变化后手动按 Vue 的计算结果补一次 class，保证 DOM 永远和 Vue 的状态一致。
watch(
  () => menu.activeTab,
  () => {
    nextTick(() => {
      const root = document.querySelector(".tab-bar");
      if (!root) return;
      root.querySelectorAll(".tab-btn").forEach((b) => {
        b.classList.toggle("active", b.dataset.tab === owner.value);
      });
    });
  },
  { immediate: true }
);
</script>

<template>
  <!--
    渲染成 .tab-bar 的直接子元素（多根组件，不额外包一层 div），否则 flex 布局会散。
    ⚠️ 不绑 click：legacy 在 .tab-bar 上做了事件委托，绑了会触发两次。
  -->
  <button
    v-for="item in TAB_BAR"
    :key="item.key"
    class="tab-btn"
    :class="{ active: isActive(item.key) }"
    :data-tab="item.key"
    type="button"
    :aria-label="item.label"
    :aria-current="isActive(item.key) ? 'page' : undefined"
  >
    <Icon :name="item.icon" :sw="TAB_BAR_SW" />
    <span class="tab-lbl">{{ item.label }}</span>
  </button>
</template>
