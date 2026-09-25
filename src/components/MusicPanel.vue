<script setup>
// 「一起听」页：黑胶 hero + 歌单卡。
// 来源：legacy index.html 3983–4010
//
// 这页的 hero 是 PageHero 的第二个落地点（第一个是 where）：
// 图标位换成 .vinyl-wrap 黑胶，走 <slot name="visual">。
//
// 内容仍然 100% 由 legacy 填：
//   #playlistBar（歌单切换 chip）、#musicRows（歌曲行）、#musicCount（数量）、
//   #listenTogetherLine（一起听文案）都是空壳，靠 legacy 的 renderMusic()
//   等函数用 innerHTML 写进去。
//
// 三件套在本页的落法（legacy 已改）：
//   1. 现取：musicUploadBtn / musicUploadInput / musicShuffleBtn 原本是 IIFE 顶层的
//      const 缓存，改成 () => el(...)；renderShuffleBtn() 也跟着现取。
//   2. 委托：上传按钮和 file input 的绑定抽成 bindMusicUpload()，
//      带 dataset 幂等标记，Vue 换 DOM 后重跑一次就接上，不会重复绑。
//   3. 监听：legacy 加了 vue:mounted → initMusic()，把歌单/列表/随机按钮补渲染一遍。

import PageHero from "./PageHero.vue";

// 头像加载失败兜底。legacy 写的是 onerror 内联 JS，Vue 模板里属性是表达式，
// 内联 JS 会当表达式求值而报错，所以改成事件处理器。
// 加 dataset 幂等标记：兜底图再 404 时不会陷入死循环。
function onTaErr(e) {
  const img = e.target;
  if (img.dataset.fb) return;
  img.dataset.fb = "1";
  img.src = "/default-ta.jpg";
}
function onDiscErr(e) {
  e.target.style.display = "none";
}
</script>

<template>
  <div class="listen-hero">
    <PageHero
      title="和秦梧一起听"
      sub="纯音乐 · 一起听 · 他也在"
      titleId="musicTitle"
      subId="musicNowLabel"
    >
      <template #visual>
        <div class="vinyl-wrap">
          <div class="vinyl">
            <div class="vinyl-grooves"></div>
            <img
              class="vinyl-disc"
              id="vinylDisc"
              src="/avatar-peach.png"
              alt="专辑封面"
              @error="onDiscErr"
            />
            <div class="vinyl-hole"></div>
          </div>
          <div class="vinyl-ta">
            <img
              id="vinylTaAvatar"
              src="/avatar-peach.png"
              alt="他也在听"
              @error="onTaErr"
            />
          </div>
        </div>
      </template>
    </PageHero>
  </div>

  <div class="noise-card">
    <div class="playlist-hd">
      🎵 我的歌单 <span id="musicCount"></span>
      <span class="music-tools">
        <button
          class="music-tool"
          id="musicShuffleBtn"
          type="button"
          title="切换随机/顺序"
        >
          🔁
        </button>
        <button
          class="music-tool"
          id="musicUploadBtn"
          type="button"
          title="上传歌曲到当前歌单"
        >
          ＋ 上传
        </button>
      </span>
    </div>
    <div style="font-size: 11px; color: #a98; margin: -4px 2px 8px">
      支持 .mp3 / .ogg / .wav 格式；QQ音乐的 .mgg/.qmc 加密文件请先转成 .mp3
    </div>
    <div class="playlist-bar" id="playlistBar"></div>
    <div class="listen-together" id="listenTogetherLine">♫ 点一首歌，秦梧就陪你一起听</div>
    <input
      id="musicUploadInput"
      type="file"
      accept=".mp3,.ogg,.wav,audio/mpeg,audio/ogg,audio/wav"
      multiple
      style="display: none"
    />
    <div id="musicRows"></div>
  </div>
</template>
