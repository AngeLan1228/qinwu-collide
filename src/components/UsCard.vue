<script setup>
import Icon from "./Icon.vue";

// 白卡片外壳：卡头（图标 + 标题 + 副标题）+ 卡体。
// 我们 / 记忆库 / 时光轴 三处结构一模一样，只有图标、文案、卡体内容不同。
// 来源：legacy index.html 4016–4038（头像）/ 4041–4057（纪念日）/ 4223–4259（记忆库）/ 4264–4284（时光轴）
//
// 挂载点是 .us-section（Vue 保留容器），本组件渲染里面的 .us-card 单根。
// 卡体内容差异太大（头像行 / 纪念日列表 / 记忆库表单 / 时光轴列表），全部走 default slot。

defineProps({
  icon: { type: String, required: true },
  sw: { type: [Number, String], default: 1.6 },
  title: { type: String, required: true },
  sub: { type: String, default: "" },
  // legacy 有代码按 id 改副标题文案（如记忆库条数），要能透传
  subId: { type: String, default: "" },
  // 记忆库/时光轴的图标块额外带底色，我们页的两个没有
  icStyle: { type: [String, Object], default: "" },
});
</script>

<template>
  <div class="us-card">
    <div class="us-card-hd">
      <div class="us-hd-ic" :style="icStyle || null"><Icon :name="icon" :sw="sw" /></div>
      <div>
        <div class="us-hd-title">{{ title }}</div>
        <div class="us-hd-sub" :id="subId || null">{{ sub }}</div>
      </div>
    </div>
    <div class="us-card-body">
      <slot />
    </div>
  </div>
</template>
