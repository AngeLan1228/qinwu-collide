<!--
  Step 6.2：聊天输入区（composer）。

  和 Menu 里那 12 个 tab 不同，这是 Vue 第一次接管**主页面**上的东西。
  只写壳、不写行为 —— textarea 的 value、发送/语音的显隐、引用条的内容
  全都还是 legacy 在操作（它用的是现取引用：`inputEl()` / `sendBtn()` …）。

  为什么这一版刻意「不作响应式」：
    · `#input` 是**非受控**的（不写 :value）。一旦两边都能写 value，
      谁后写谁生效，输入框会开始吞字 —— 发送路径上 `doSend()` 读的就是这个 value。
    · 发送/语音的 hidden、引用条的显隐同理，交给 legacy 的 classList。
      Vue 不去绑这些 class，就不会在 re-patch 时把 legacy 的改动抹掉。
  等 6.5 把消息列表也搬过来之后，这一块才会真正变成受控组件。

  结构必须**多根直出**（引用条 / field / 语音 / 发送 四个平级节点）：
    .composer 是 flex + wrap，引用条靠 `flex:1 1 100%` 独占一行，
    外面再包一层 div 布局就散了。
-->
<template>
  <div class="quote-bar hidden" id="quoteBar">
    <div class="quote-bar-body">
      <span class="quote-bar-title" id="quoteBarTitle"></span>
      <span class="quote-bar-text" id="quoteBarText"></span>
    </div>
    <button type="button" class="quote-bar-close" id="quoteBarClose" aria-label="取消引用">×</button>
  </div>

  <div class="field">
    <button class="floatbtn clip-in-field" id="clipBtn" aria-label="附件" title="附件" type="button">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5l-8.8 8.8a5 5 0 0 1-7.1-7.1l8.8-8.8a3.3 3.3 0 0 1 4.7 4.7l-8.6 8.6a1.6 1.6 0 0 1-2.3-2.3l8-8"/></svg>
    </button>
    <input type="file" id="clipInput" multiple class="hidden" aria-hidden="true">
    <input type="file" id="clipCameraInput" accept="image/*" capture="environment" class="hidden" aria-hidden="true">
    <input type="file" id="clipAlbumInput" accept="image/*" multiple class="hidden" aria-hidden="true">
    <textarea id="input" rows="1" placeholder="Write a letter..." enterkeyhint="send"></textarea>
    <button class="emojibtn" id="emojiBtn" aria-label="表情" title="表情" type="button">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8.5 14.3a4.2 4.2 0 0 0 7 0"/><line x1="9" y1="9.3" x2="9" y2="10"/><line x1="15" y1="9.3" x2="15" y2="10"/></svg>
    </button>
  </div>

  <button class="floatbtn hidden" id="micBtn" aria-label="语音" title="语音" type="button">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><line x1="12" y1="18" x2="12" y2="21.5"/></svg>
  </button>

  <button class="floatbtn send" id="sendBtn" aria-label="发送" type="button">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5"/><path d="M6.5 10.5L12 5l5.5 5.5"/></svg>
  </button>
</template>

<script setup>
// 没有 props、没有响应式状态 —— 这一版就是一份「结构搬家」。
// 行为仍在 legacy，靠 vue:mounted 重跑 bindComposer/bindClip/bindEmojiBtn 挂回来。
</script>
