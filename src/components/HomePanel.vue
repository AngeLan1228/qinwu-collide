<script setup>
// 首页整块，来源：legacy index.html 3811–3888
//
// 和前面几个 tab 不同的三点：
//
// 1) **内联 onclick**：「他在干嘛」那条迷你栏原本写着
//    onclick="document.querySelector('[data-quick=\"where\"]').click()"。
//    Vue 模板里属性是**表达式**，这串 JS 会被当表达式求值然后报错，
//    所以改成 @click 走下面这个函数，行为一致（找到那个九宫格按钮点一下）。
//
// 2) **九宫格在这里**：QuickGrid 原先单独 mount 到 .home-quick 上（Step 1）。
//    整块接管后必须由本组件渲染 —— 否则先挂后清，会留下指向孤儿节点的实例。
//    QuickGrid 刻意不绑 click（legacy 在 .home-quick 上做了委托），照旧不绑。
//
// 3) 内容还是 legacy 填：天数 / since / 两个名字 ← refreshHome()，
//    迷你栏文案 ← window.renderWhere()。这四处原本都是**缓存引用**，
//    已全改成现取 + vue:mounted 补跑（否则天数会停在旧值上，且不报错）。
//
// 多根直出：#tab-home 的直接子元素就是 hero / 迷你栏 / 九宫格三块。
import QuickGrid from "./QuickGrid.vue";

// legacy 原逻辑：点迷你栏 = 点九宫格里的「他在干嘛」
function gotoWhere() {
  const el = document.querySelector('[data-quick="where"]');
  if (el) el.click();
}
</script>

<template>
  <div class="home-hero">
    <div class="home-avatars">
      <img class="home-av me" id="homeAvMe" src="/avatar.webp" alt="我" />
      <svg class="home-heart" viewBox="0 0 24 24" fill="currentColor">
        <path
          d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.27 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.77-3.4 6.86-8.55 11.54L12 21.35z"
        />
      </svg>
      <img class="home-av ta" id="homeAvTa" src="/avatar-peach.png" alt="TA" />
    </div>
    <div class="home-names">
      <div id="homeNameMe">我</div>
      <div class="home-since-row">
        <div class="home-since" id="homeSince">since 2026/01/01</div>
        <button
          class="since-edit"
          id="sinceEditBtn"
          type="button"
          aria-label="修改起始日期"
          title="修改起始日期"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
        </button>
        <input type="date" id="sincePicker" class="hidden" aria-hidden="true" />
      </div>
      <div id="homeNameTa">TA</div>
    </div>
    <div class="home-days">
      <span class="num" id="homeDays">113</span>
      <span class="lab">Days together</span>
    </div>
  </div>

  <!-- 他在干嘛迷你条：点它等于点九宫格里的「他在干嘛」
       那串内联 style 是 legacy 原样带的，别精简 —— 少了它就是一块裸文本 -->
  <div
    id="homeWhereMini"
    @click="gotoWhere"
    style="
      margin: 0 0 14px;
      padding: 10px 14px;
      border-radius: 14px;
      background: rgba(var(--w-ink), 0.55);
      font-size: 13px;
      color: var(--text-color);
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
    "
  >
    <span
      style="
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #52c41a;
        flex: none;
      "
    ></span>
    <span id="homeWhereText">秦梧正在…</span>
  </div>

  <div class="home-quick">
    <QuickGrid />
  </div>
</template>
