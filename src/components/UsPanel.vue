<script setup>
// 我们页整块，来源：legacy index.html 4015–4061
//
// 两个白卡片都复用 Step 2 的 UsCard（卡头 + 卡体），卡体差异走默认 slot。
//
// 这页要改的三处痛点（legacy 已配合改完）：
//   1. annivList / addAnnivBtn 原本是顶层 const 缓存 —— 纪念日会渲染进旧 DOM，
//      表现是「列表一直是空的」，但控制台没报错。
//   2. 四个「换头像」按钮原本直接 addEventListener，Vue 重建后全失效，
//      改成现取 + dataset 幂等绑定（ Vue 挂载后由 vue:mounted 补绑一次）。
//   3. 「添加纪念日」和中间那个交换箭头改委托到 #tab-us 容器本身。
//
// 头像 src 由 legacy 的 applyAvatars() 按 id 填，Vue 挂载后会被 vue:mounted 重跑一次。
import UsCard from "./UsCard.vue";
</script>

<template>
  <div class="us-section">
    <UsCard icon="user" title="互相头像" sub="换一换，看到对方的另一面">
      <div class="us-avatar-row">
        <div class="us-av-wrap">
          <img class="us-av" id="usAvMe" src="/avatar.webp" alt="我的头像" />
          <span>我</span>
          <button class="us-av-change-btn" id="changeMyAvatarBtn" type="button">换头像</button>
        </div>
        <svg
          id="swapUsBtn"
          style="
            width: 26px;
            height: 26px;
            color: var(--text-faint);
            flex-shrink: 0;
            cursor: pointer;
            transition: transform 0.25s ease, color 0.25s ease;
          "
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M17 1l4 4-4 4" />
          <path d="M3 11V9a4 4 0 0 1 4-4h14" />
          <path d="M7 23l-4-4 4-4" />
          <path d="M21 13v2a4 4 0 0 1-4 4H3" />
        </svg>
        <div class="us-av-wrap">
          <img class="us-av" id="usAvTa" src="/avatar-peach.png" alt="TA 的头像" />
          <span>TA</span>
          <button class="us-av-change-btn" id="changeTaAvatarBtn" type="button">换头像</button>
        </div>
      </div>
    </UsCard>
  </div>

  <div class="us-section">
    <UsCard icon="calendarPlain" title="纪念日" sub="记住属于我们的特别时刻">
      <!-- 列表由 legacy 的 renderAnnivs() 用 innerHTML 填（剩余天数在里面算） -->
      <div class="anniv-list" id="annivList"></div>
      <button class="add-anniv-btn" id="addAnnivBtn" type="button">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        添加纪念日
      </button>
    </UsCard>
  </div>
</template>
