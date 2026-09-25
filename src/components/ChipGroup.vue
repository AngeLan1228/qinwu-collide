<script setup>
// 一排筛选 chip：代办的「全部/待完成/已完成」、记忆库的「全部/喜好/事件/关于我/其他」是同一套。
// 来源：legacy index.html 4067–4071（todo）/ 4245–4251（memory）
//
// 两处 class 和 data-属性名都不一样，所以做成配置项而不是写死：
//   todo   → class="todo-filter-btn" data-filter="all"
//   memory → class="mf"              data-cat="all"
// legacy 的事件委托就是靠这两个属性取值的，改错就点不动了。
//
// ⚠️ 同 MoodPicker：active 只输出初始值，之后交给 legacy 的 classList，避免双向打架。

defineProps({
  items: { type: Array, required: true }, // [{ key, label }]
  btnClass: { type: String, required: true },
  dataKey: { type: String, required: true }, // 生成 data-<dataKey>="key"
  activeIndex: { type: Number, default: 0 },
});
</script>

<template>
  <button
    v-for="(it, i) in items"
    :key="it.key"
    :class="[btnClass, i === activeIndex ? 'active' : null]"
    type="button"
    :[`data-${dataKey}`]="it.key"
  >{{ it.label }}</button>
</template>
