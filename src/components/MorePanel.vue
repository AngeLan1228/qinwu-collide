<script setup>
// 「更多」页：2 组 5 个二级入口。
// 来源：legacy index.html 4124–4156
//
// 这个 tab 没有任何动态内容，也没有初始化副作用 —— 是 Step 4 里最简单的一个。
// 但**所有 5 项都绑了点击**，而且 legacy 是遍历 [data-gotab] / 按 id 逐个绑的，
// 换 DOM 后全失效 → 必须先在 legacy 侧改成委托（见 index.html 的改动）。
//
// 这里只负责渲染，不绑任何 click（Vue+legacy 混跑铁律：点击一律交给 legacy 的委托）。
// 多根组件：直接挂到 #tab-more 本身。

import { MORE_GROUPS } from "../config/moreGroups.js";
import Icon from "./Icon.vue";

const groups = MORE_GROUPS;
</script>

<template>
  <template v-for="g in groups" :key="g.group">
    <div class="more-section-label">{{ g.group }}</div>
    <div class="more-list">
      <button
        v-for="it in g.items"
        :key="it.key"
        class="more-item"
        type="button"
        :id="it.id || undefined"
        :data-gotab="it.gotab || undefined"
      >
        <div class="more-ic"><Icon :name="it.icon" :sw="1.7" /></div>
        <div class="more-label">
          {{ it.label }}
          <span
            v-if="it.subId"
            :id="it.subId"
            style="display:block;font-size:11px;opacity:.6;font-weight:400;margin-top:2px"
          ></span>
        </div>
        <div class="more-arrow"><Icon name="chevron" :sw="1.8" /></div>
      </button>
    </div>
  </template>
</template>
