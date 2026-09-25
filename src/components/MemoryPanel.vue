<script setup>
// 记忆库整块（legacy index.html 4222-4260）。第三个「整块 tab 交给 Vue」的页面。
//
// 和代办页的同构点：
//   输入区 / 筛选 chip / 列表 / 空状态 四件套，列表是 legacy innerHTML 塞的，
//   脚本末尾就 loadMemories() 了 → 靠 vue:mounted 重跑。
// 不同点（也是本页最容易踩的一处）：
//   legacy 把 #memoryFilters 的**容器本身**抓出来绑了委托（index.html 4832），
//   整块接管后这个容器会被 Vue 重建，绑在旧节点上的委托就死了 →
//   必须和代办页一样，把.delegate 上移到 #tab-memory 容器。（详见 index.html 的改动）
//
// 内部复用 Step 2 的两个组件，原先各自 mount 到 #memoryEmpty / #memoryFilters，
// 整块接管后改由本组件渲染，否则整块挂载会把那两个实例连 DOM 一起换掉。

import UsCard from "./UsCard.vue";
import ChipGroup from "./ChipGroup.vue";
import EmptyState from "./EmptyState.vue";

const cats = [
  { key: "all", label: "全部" },
  { key: "喜好", label: "喜好" },
  { key: "事件", label: "事件" },
  { key: "关于我", label: "关于我" },
  { key: "其他", label: "其他" },
];

// ⚠️ 多行文案必须放在 JS 字符串里，不能直接写进模板属性：
// 模板属性里的 \n 是「反斜杠+n」两个字面字符（HTML 属性不做转义处理），
// EmptyState 按真换行切分，那样写会得到一个不分行、且肉眼可见 "\n" 的空状态。
const emptyText =
  "还没有记忆呢\n和他聊天，他会慢慢记住你说过的话；\n也可以在上面写一条，让他立刻记住 ♡";
</script>

<template>
  <div class="us-section">
    <UsCard
      icon="sparkle"
      title="记忆库"
      sub="秦梧记得关于你的点点滴滴 · 共 0 条"
      sub-id="memorySub"
      ic-style="background:rgba(var(--accent-rgb),0.14);"
    >
      <div class="memory-add">
        <input
          id="memoryInput"
          type="text"
          placeholder="想让秦梧记住什么？比如：我最喜欢草莓"
          maxlength="60"
        />
        <select id="memoryCat" aria-label="分类">
          <option value="喜好">喜好</option>
          <option value="事件">事件</option>
          <option value="关于我">关于我</option>
          <option value="其他">其他</option>
        </select>
        <button id="memoryAddBtn" type="button">记住 ♡</button>
      </div>
      <div class="memory-filters" id="memoryFilters">
        <ChipGroup btn-class="mf" data-key="cat" :items="cats" />
      </div>
      <div class="memory-list" id="memoryList"></div>
      <!-- 显隐由 legacy 的 renderMemories() 用 style.display 控制，Vue 侧不绑响应式 -->
      <div class="memory-empty" id="memoryEmpty">
        <EmptyState icon="sparkle" :text="emptyText" />
      </div>
    </UsCard>
  </div>
</template>
