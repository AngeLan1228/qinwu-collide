<script setup>
// 打卡页整块（legacy index.html 4159–4219）。
//
// 这页是「三件套」里**委托上移**最典型的一处：
// legacy 原本把六个点击分别绑在 #moodRow / #checkinSubmit / #checkinGrid /
// #calPrev / #calNext / #checkinList 上 —— 全是 #tab-checkin 的内部节点，
// 整块交给 Vue 后每个都会被重建，绑上去的监听全部失效（点了没反应、不报错）。
// 已统一上移到容器 #tab-checkin：mount(el) 保留容器，委托一次绑永久有效。
//
// 内容仍是 legacy 填：星期/日期/连续天数/日历格子/往日记录 都由
// renderCheckinTop / renderCheckinGrid / renderCheckinList / renderFocusToday
// 写进去，靠 vue:mounted 补跑一次。
//
// 两个 Step 2 组件下放到这里渲染（原先各自 mount，整块接管后必须删掉那两个 mount）：
//   #moodRow     → MoodPicker(variant=checkin)
//   #checkinEmpty → EmptyState
import MoodPicker from "./MoodPicker.vue";
import EmptyState from "./EmptyState.vue";
</script>

<template>
  <div class="checkin-today">
    <div class="checkin-date">
      <div class="checkin-date-l">
        <span class="checkin-date-w" id="checkinWeekday">—</span>
        <span class="checkin-date-d" id="checkinDate">—</span>
      </div>
      <div class="checkin-streaks">
        <!-- 连续打卡天数：display 由 legacy 的 renderCheckinTop() 控制 -->
        <div class="checkin-streak" id="checkinStreak" style="display: none">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z"
            />
          </svg>
          <span id="checkinStreakN">0</span> 天
        </div>
        <div
          class="checkin-streak checkin-streak-todo"
          id="checkinTodoStreak"
          style="display: none"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span id="checkinTodoStreakN">0</span> 天
        </div>
      </div>
    </div>

    <div class="checkin-focus-today" id="checkinFocusToday" style="display: none">
      🍅 今日专注 <b id="focusTodayMin">0</b> 分钟 · <b id="focusTodayN">0</b> 轮 · 完成
      <b id="focusTodayDone">0</b> 件事
    </div>

    <div class="checkin-mood-label">今天的心情</div>
    <div class="mood-row" id="moodRow">
      <MoodPicker variant="checkin" />
    </div>

    <div class="checkin-text-label">今天的小事</div>
    <textarea
      class="checkin-text"
      id="checkinText"
      placeholder="今天发生了什么特别的事？哪怕是路上看到的一朵云 ☁️"
      maxlength="500"
    ></textarea>

    <button class="checkin-submit" id="checkinSubmit" type="button">
      ✓ 完成今天的打卡
    </button>
  </div>

  <div class="checkin-cal">
    <div class="checkin-cal-hd">
      <button class="checkin-cal-nav" id="calPrev" type="button" aria-label="上个月">
        ‹
      </button>
      <div class="checkin-cal-title" id="checkinCalTitle">—</div>
      <button class="checkin-cal-nav" id="calNext" type="button" aria-label="下个月">
        ›
      </button>
      <div class="checkin-cal-stat">
        本月 <b id="checkinTotalDays">0</b> 天 · 累计 <b id="checkinTotalAllDays">0</b> 天
      </div>
    </div>
    <div class="checkin-cal-wd" aria-hidden="true">
      <span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span
      ><span>日</span>
    </div>
    <div class="checkin-grid" id="checkinGrid"></div>
    <div class="checkin-day-detail" id="checkinDayDetail" style="display: none"></div>
  </div>

  <div class="checkin-list-hd">往日的记录</div>
  <div class="checkin-list" id="checkinList"></div>
  <!-- display:none 由 legacy 的 renderCheckinList() 用 style.display 控制 -->
  <div class="checkin-empty" id="checkinEmpty" style="display: none">
    <EmptyState icon="message" text="还没有记录 ♡ 开始今天的打卡吧" />
  </div>
</template>
