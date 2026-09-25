<script setup>
// 代办页整块（legacy index.html 4062-4078）。
//
// 这是第二个「整块 tab 交给 Vue」的页面（第一个是信封页）。和信封页一样，
// 列表 #todoList 是 legacy 用 innerHTML 塞的、且脚本末尾就调了 renderTodos()，
// 所以必须靠 vue:mounted 重跑一次，否则待办会「渲染过又被丢」。
//
// 内部复用 Step 2 的两个组件：筛选 chip 和空状态。原先它们是各自 mount 到
// #todoEmpty / .todo-filters 上的，整块接管后改由本组件渲染，
// 否则 #tab-todo 挂载会把那两个实例连 DOM 一起换掉，留下指向孤儿节点的实例。
//
// 多根直出：#tab-todo 的直接子元素就是这一排，多包一层会破坏布局。
import ChipGroup from "./ChipGroup.vue";
import EmptyState from "./EmptyState.vue";

const filters = [
  { key: "all", label: "全部" },
  { key: "active", label: "待完成" },
  { key: "done", label: "已完成" },
];
</script>

<template>
  <div class="todo-add-row">
    <input
      class="todo-input"
      id="todoInput"
      type="text"
      placeholder="写点什么..."
      maxlength="200"
    />
    <button class="todo-add-btn" id="todoAddBtn" type="button">添加</button>
  </div>
  <div class="todo-filters">
    <ChipGroup btn-class="todo-filter-btn" data-key="filter" :items="filters" />
  </div>
  <div class="todo-keep" id="todoKeep" style="display: none"></div>
  <div class="todo-list" id="todoList"></div>
  <!-- display:none 由 legacy 的 renderTodos() 用 style.display 控制，
       Vue 侧不绑响应式，避免和 legacy 抢这个属性 -->
  <div class="todo-empty" id="todoEmpty" style="display: none">
    <EmptyState icon="check" text="暂无待办，轻松一下吧 ♡" />
  </div>
</template>
