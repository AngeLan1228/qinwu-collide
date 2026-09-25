<script setup>
// 日记页整块（legacy index.html 4094-4122）。第四个「整块 tab 交给 Vue」的页面。
//
// 复用 LetterHero：hero 的操作区走默认 slot（日记是 2 个按钮），
// 编辑表单走新增的 after slot —— 它必须夹在 hero 和列表之间，不能塞进 hero 里。
//
// 心情选择器 #diaryMoods 由 MoodPicker 在本组件内渲染，主入口不再单独 mount：
// 整块挂载会把独立 mount 出来的实例连 DOM 一起换掉。
//
// legacy 那边要改的（三件套 + 一个额外项）：
//   1. 9 个元素引用全部缓存 → 现取（这个 tab 缓存得最多）
//   2. 5 个绑元素的事件 → 委托到 #tab-diary（含原本绑在 #diaryMoods 上的心情委托，
//      它同样是容器内部节点，整块接管后会被重建）
//   3. 加 vue:mounted → loadDiary()（列表是脚本末尾就加载的）
//   4. 额外：日期默认值 diaryDate.value 是在初始化时赋的，DOM 重建后要重设一次

import LetterHero from "./LetterHero.vue";
import MoodPicker from "./MoodPicker.vue";
</script>

<template>
  <LetterHero
    icon="book"
    title="我们的日记"
    sub="一本只属于你和他的日记，谁都可以写下今天"
    list-id="diaryList"
    list-class="diary-list"
  >
    <div class="diary-actions">
      <button class="letter-gen ghost" id="diaryGenBtn" type="button">
        让秦梧写一篇
      </button>
      <button class="letter-gen" id="diaryNewBtn" type="button">我来写</button>
    </div>

    <template #after>
      <!-- hidden class 的增删仍由 legacy 做（.hidden 是 display:none!important，
           Vue 侧不能用 v-if 抢，否则两边打架） -->
      <div class="diary-form hidden" id="diaryForm">
        <div class="diary-form-row">
          <input type="date" id="diaryDate" />
          <div class="diary-moods" id="diaryMoods">
            <MoodPicker variant="diary" />
          </div>
        </div>
        <textarea
          id="diaryText"
          placeholder="今天发生了什么？写点什么吧..."
          rows="4"
        ></textarea>
        <div class="diary-form-row end">
          <button class="letter-gen ghost" id="diaryCancelBtn" type="button">
            取消
          </button>
          <button class="letter-gen" id="diarySaveBtn" type="button">保存日记</button>
        </div>
      </div>
    </template>
  </LetterHero>
</template>
