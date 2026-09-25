<script setup>
// 陪伴页（番茄钟 + 陪伴轻音乐）整块，来源：legacy index.html 3892–3961
//
// 这是整个 Step 4 里**缓存引用最多**的一个 tab：IIFE 顶层一次性取了 12 个元素
// （ring / timeEl / modeEl / startBtn / resetBtn / skipBtn / durRow / noteEl /
//  cmRows / nowLabel / modeSwitch / taskEl），全部改成了现取函数。
// 否则 Vue 一挂载，这 12 个引用就指向脱离文档的旧节点：
// 番茄钟照走秒、**界面一动不动**，控制台还不报错 —— 是那种最难查的失效。
//
// ── Step 5：番茄钟状态机搬进 Vue（src/pomo.js）──
// 时间/模式/文案/环/按钮图标/时长高亮/浮动状态条全部由 pomo 的响应式状态渲染，
// legacy 那份检测到容器被 Vue 接管后自动让位（不绑委托、updateUI 直接 return），
// 两边不会各跑一个 setInterval。详见 pomo.js 顶部注释。
//
// 内容填充方（仍是 legacy，Vue 只留空壳）：
//   #companionMusicRows ← renderCompanionMusic()（4 首内置 + IndexedDB 里用户传的）
//   #compaDonut / #compaLegend / #compaTip ← renderCompaStats()（全局函数）
// 轻音乐的按钮/列表还是 legacy 逐个绑的（bindCmUpload + renderCompanionMusic 内循环），
// 靠 vue:mounted 补跑一次，不要在 Vue 里重复绑。
//
// hero 走 PageHero：陪伴页是它第三个落地点（图标版，where 无图标、music 是黑胶）。
import { onMounted } from "vue";
import PageHero from "./PageHero.vue";
import {
  pomo,
  study,
  initPomo,
  startPause,
  resetPomo,
  skipRound,
  pickDur,
  switchKind,
} from "../pomo.js";

const PLAY_PATH = "M8 5v14l11-7z";
const PAUSE_PATH = "M6 5h4v14H6zM14 5h4v14h-4z";

onMounted(initPomo);
</script>

<template>
  <div class="listen-hero">
    <PageHero
      icon="focus"
      :sw="1.5"
      title="秦梧陪你专注"
      :sub="pomo.nowText"
      titleId="listenTitle"
      subId="listenNowLabel"
    />
  </div>

  <div class="pomo-card">
    <div class="pomo-mode-switch" id="pomoModeSwitch">
      <button
        class="pms"
        :class="{ active: pomo.kind === 'countdown' }"
        data-mode="countdown"
        type="button"
        @click="switchKind('countdown')"
      >
        ⏳ 倒计时
      </button>
      <button
        class="pms"
        :class="{ active: pomo.kind === 'stopwatch' }"
        data-mode="stopwatch"
        type="button"
        @click="switchKind('stopwatch')"
      >
        ⏱️ 正计时
      </button>
    </div>
    <div class="pomo-ring-wrap">
      <svg class="pomo-ring" viewBox="0 0 200 200" aria-hidden="true">
        <defs>
          <linearGradient id="pomoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color: var(--grad-a)"></stop>
            <stop offset="100%" style="stop-color: var(--grad-b)"></stop>
          </linearGradient>
        </defs>
        <circle class="pomo-ring-bg" cx="100" cy="100" r="88"></circle>
        <circle
          class="pomo-ring-fg"
          id="pomoRing"
          cx="100"
          cy="100"
          r="88"
          :style="{ strokeDashoffset: pomo.ringOffset }"
        ></circle>
      </svg>
      <div class="pomo-time" id="pomoTime">{{ pomo.time }}</div>
    </div>
    <div class="pomo-mode" id="pomoMode">{{ pomo.modeText }}</div>
    <input
      class="pomo-task"
      id="pomoTask"
      type="text"
      placeholder="在学什么？比如：高数第三章 📚"
      maxlength="40"
      v-model="pomo.task"
    />
    <div class="pomo-dur" id="pomoDurRow" :class="{ hide: pomo.kind === 'stopwatch' }">
      <button
        class="pd"
        :class="{ active: pomo.activeDur === 25 }"
        data-min="25"
        type="button"
        @click="pickDur(25)"
      >
        25分
      </button>
      <button
        class="pd"
        :class="{ active: pomo.activeDur === 45 }"
        data-min="45"
        type="button"
        @click="pickDur(45)"
      >
        45分
      </button>
      <button
        class="pd"
        :class="{ active: pomo.activeDur === 60 }"
        data-min="60"
        type="button"
        @click="pickDur(60)"
      >
        60分
      </button>
      <button
        class="pd rest"
        :class="{ active: pomo.activeDur === 5 }"
        data-min="5"
        type="button"
        @click="pickDur(5)"
      >
        休息5
      </button>
    </div>
    <div class="pomo-controls">
      <button
        class="pc-btn"
        id="pomoResetBtn"
        type="button"
        aria-label="重置"
        title="重置"
        @click="resetPomo()"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.9"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
          <path d="M3 3v5h5" />
        </svg>
        <span class="pc-label">重置</span>
      </button>
      <button
        class="pc-btn big"
        id="pomoStartBtn"
        type="button"
        :aria-label="pomo.startLabel"
        :title="pomo.startLabel"
        @click="startPause()"
      >
        <svg id="pomoPlayIcon" viewBox="0 0 24 24" fill="currentColor">
          <path :d="pomo.running ? PAUSE_PATH : PLAY_PATH" />
        </svg>
        <span class="pc-label">{{ pomo.startLabel }}</span>
      </button>
      <button
        class="pc-btn"
        id="pomoSkipBtn"
        type="button"
        :aria-label="pomo.skipTitle"
        :title="pomo.skipTitle"
        @click="skipRound()"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.9"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M5 5l10 7-10 7z" />
          <line x1="19" y1="5" x2="19" y2="19" />
        </svg>
        <span class="pc-label">{{ pomo.skipTitle }}</span>
      </button>
    </div>
    <div class="pomo-note" id="pomoNote">{{ pomo.noteText }}</div>
  </div>

  <!-- 今天的学习：每次学完自动重画（按当天记录统计科目分布，不是累计） -->
  <div class="compa-stats" id="studyTodayCard" v-show="study.visible">
    <div class="compa-stats-hd">📚 今天的学习</div>
    <div class="compa-stats-main">
      <div class="compa-donut-wrap">
        <svg viewBox="0 0 120 120" aria-hidden="true">
          <path
            v-for="s in study.slices"
            :key="s.cat"
            :d="s.d"
            :fill="s.color"
            stroke="#fff"
            stroke-width="1.5"
          />
          <circle cx="60" cy="60" r="29" fill="#fff" opacity="0.92"></circle>
        </svg>
        <div class="compa-donut-c">
          <b>{{ study.totalMin }}</b><span>分钟</span>
        </div>
      </div>
      <div class="compa-legend">
        <div class="compa-lg-row" v-for="s in study.slices" :key="s.cat">
          <span class="compa-lg-dot" :style="{ background: s.color }"></span>
          <span class="compa-lg-name">{{ s.cat }}</span>
          <span class="compa-lg-val">{{ s.pct }}%</span>
        </div>
      </div>
    </div>
    <div class="compa-tip" v-if="study.praise">{{ study.praise }}</div>
    <div class="compa-tip" v-else-if="study.loading">他在想该怎么夸你…</div>
  </div>

  <!-- 陪伴累计：display 由 renderCompaStats() 控制 -->
  <div class="compa-stats" id="compaStats" style="display: none">
    <div class="compa-stats-hd">🍅 陪伴累计</div>
    <div class="compa-stats-main">
      <div class="compa-donut-wrap">
        <svg id="compaDonut" viewBox="0 0 120 120" aria-hidden="true"></svg>
        <div class="compa-donut-c"><b id="compaTotalMin">0</b><span>分钟</span></div>
      </div>
      <div class="compa-legend" id="compaLegend"></div>
    </div>
    <div class="compa-tip" id="compaTip"></div>
  </div>

  <div class="noise-card">
    <div class="playlist-hd">
      🎵 陪伴轻音乐
      <button class="music-tool" id="companionUploadBtn" type="button" title="上传轻音乐">
        ＋ 上传
      </button>
    </div>
    <div style="font-size: 11px; color: #a98; margin: -4px 2px 8px">
      支持 .mp3 / .ogg / .wav 格式
    </div>
    <input
      id="companionUploadInput"
      type="file"
      accept=".mp3,.ogg,.wav,audio/mpeg,audio/ogg,audio/wav"
      multiple
      style="display: none"
    />
    <div id="companionMusicRows"></div>
  </div>
</template>
