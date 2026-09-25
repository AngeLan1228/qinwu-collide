<script setup>
// 信封页 / 日记页共用的大标题块（legacy index.html 4082-4091 / 4095-4103）。
//
// 结构：.letter-hero（图标 + 标题 + 副标题 + 操作按钮）+ 下方的内容容器。
// 两者只差操作区：信封是 1 个「收一封信」，日记是 2 个按钮 + 一个表单，
// 所以操作区走默认 slot，日记版接管时整体替换即可。
//
// 多根直出：#tab-letter 的直接子元素就是 .letter-hero 和 .letter-list，
// 多包一层 div 会让 .letter-hero 的 flex 居中失效。
import Icon from "./Icon.vue";

const props = defineProps({
  icon: { type: String, default: "mail" },
  title: { type: String, required: true },
  sub: { type: String, default: "" },
  // 标题 id 要保留：applyNames() 按 id 把标题换成「<名字>的信」
  titleId: { type: String, default: "" },
  btnId: { type: String, default: "" },
  btnText: { type: String, default: "收一封信" },
  btnIcon: { type: String, default: "send" },
  // 列表容器：legacy 往里塞 innerHTML，必须保留 id
  listId: { type: String, default: "" },
  listClass: { type: String, default: "letter-list" },
});
</script>

<template>
  <div class="letter-hero">
    <div class="letter-ic"><Icon :name="icon" :sw="1.4" /></div>
    <div class="letter-h1" :id="titleId || undefined">{{ title }}</div>
    <div class="letter-sub">{{ sub }}</div>
    <slot>
      <button class="letter-gen" :id="btnId || undefined" type="button">
        <Icon :name="btnIcon" :sw="1.8" />
        {{ btnText }}
      </button>
    </slot>
  </div>
  <!-- after 插槽：日记页的编辑表单夹在 hero 和列表之间，不能塞进 hero 里面 -->
  <slot name="after" />
  <div v-if="listId" :class="listClass" :id="listId"></div>
</template>
