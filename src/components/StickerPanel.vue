<!--
  Step 6.4：贴纸面板 #stickerPanel。

  这是 Step 6 里第一块「连行为一起搬」的东西 —— 前面 6.1/6.2/6.3 都只搬结构，
  因为那些节点的值归 legacy 写。贴纸面板不一样：它的内容本来就是 legacy 用
  `panel.innerHTML = ...` 一把梭生成的，一旦 Vue 接管，legacy 那套就只剩
  「往 Vue 的 DOM 里塞节点」这一条路 —— 所以改成 Vue 自己渲染，legacy 让位
  （`stickerOwnedByVue()`，和番茄钟的 `pomoOwnedByVue()` 同一套）。

  仍然留在 legacy 的三件事（别抢）：
    1. 面板的显隐（.hidden）—— #emojiBtn 的点击在 composer 里，由 legacy 的
       bindEmojiBtn() 绑；点空白处收起也是 legacy 那条 document 级监听。
       容器本身是静态的（mount 保留容器），所以两边都不会踩到对方。
    2. sendSticker()：发送路径牵扯乐观消息 / 轮询 / IndexedDB，搬它等于提前做 6.5。
       Vue 只负责调 window.sendSticker(url, name, file)。
    3. resolveSticker()：/api/sticker-file/ 是伪地址，要 fetch 回字节转 blob: 才能显示。
       它带缓存和并发合并，Vue 直接复用（在 legacy 里是顶层 function 声明 → 挂 window）。

  结构必须**多根直出**：#stickerPanel 自己是 `display:grid`，
  .sticker-hd / .sticker-sep / .sticker-wrap 都是它的直接格子，包一层 div 布局就散了。

  ── 删除范围（2026-09-23 用户明确）：内置表情**不**给删，只删自己上传的那几张 ──
  内置图是打包进来的、没有后端记录，删了也没法恢复，所以保持 deletable:false。
  自己上传的存在后端 IndexedDB 里，删的是真实记录。
  整理模式下如果一张自定义都没有，给一句提示，免得用户以为「整理模式坏了」。
-->
<template>
  <div class="sticker-hd">
    <span>表情包</span>
    <span class="sticker-catpick" id="stickerCatPick">
      <button
        v-for="c in CATS"
        :key="c.key"
        type="button"
        class="sticker-cat"
        :class="{ on: uploadCat === c.key }"
        :data-cat="c.key"
        @click.stop="pickCat(c.key)"
      >{{ c.label }}</button>
    </span>
    <button
      class="sticker-manage"
      :class="{ on: managing }"
      id="stickerManageBtn"
      type="button"
      @click.stop="toggleManage"
    >{{ managing ? "完成" : "整理" }}</button>
    <button class="sticker-upload" id="stickerUploadBtn" type="button" @click.stop="onUploadClick">＋ 上传</button>
    <input
      id="stickerUploadInput"
      ref="fileRef"
      type="file"
      accept="image/*"
      multiple
      class="sr-file"
      aria-hidden="true"
      @change="onUploadChange"
    >
  </div>

  <template v-for="s in sections" :key="s.key">
    <div class="sticker-sep">{{ s.label }}</div>
    <div
      v-for="it in s.items"
      :key="it.url"
      class="sticker-wrap"
      :class="{ 'can-del': it.deletable }"
    >
      <img
        class="sticker-item"
        :class="{ 'sticker-item-broken': isBroken(it) }"
        :src="showSrc(it)"
        :alt="it.name"
        loading="lazy"
        @click.stop="onItemClick(it)"
        @contextmenu.prevent="noop"
        @pointerdown="lpStart($event, it)"
        @pointermove="lpMove($event)"
        @pointerup="lpCancel"
        @pointerleave="lpCancel"
        @pointercancel="lpCancel"
      >
      <button
        v-if="it.deletable && managing"
        class="sticker-del"
        type="button"
        style="display:flex"
        aria-label="删除这张表情"
        @click.stop="onDelete(it)"
      >{{ deleting === it.key ? "…" : "✕" }}</button>
    </div>
  </template>

  <div v-if="managing && customCount === 0" class="sticker-sep sticker-tip">
    还没有自己上传的表情 —— 点「＋上传」加一张，就能在这里删掉它。
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";

const CATS = [
  { key: "happy", label: "开心" }, { key: "cute", label: "卖萌" },
  { key: "tease", label: "犯贱" }, { key: "shock", label: "震惊" },
  { key: "sad", label: "悲伤" }, { key: "question", label: "疑问" },
  { key: "guilty", label: "心虚" }
];
const BUILTIN = {
  happy: ["sticker-happy-1", "sticker-happy-2", "sticker-happy-3", "sticker-happy-4", "sticker-happy-5", "sticker-happy-6", "sticker-happy-7"],
  cute: ["sticker-10", "sticker-11", "sticker-12", "sticker-15"],
  tease: ["sticker-8", "sticker-9"],
  shock: ["sticker-1", "sticker-2"],
  sad: ["sticker-3", "sticker-4", "sticker-5", "sticker-6", "sticker-7"],
  question: ["sticker-13"],
  guilty: ["sticker-14"]
};

// legacy 的顶层 function 声明会挂到 window，module 里直接取。
// 纯 Vue 部署（万一哪天 legacy 退休）也不能白屏，所以每个都留兜底。
const g = (name, fallback) => (typeof window[name] === "function" ? window[name] : fallback);
const mediaBase = () => g("mediaBase", () => "/ta-media/")();
const isFakeApi = (s) => g("isFakeApi", (u) => /^\/api\/sticker-file\//.test(String(u || "")))(s);
const toast = (msg) => g("showToast", () => {})(msg);

const managing = ref(false);
const uploadCat = ref("happy");
const custom = ref([]);        // /api/stickers 回来的自定义表情
const resolved = ref({});      // 稳定地址 -> blob: 地址（"" 表示取不回来）
const deleting = ref("");      // 正在删除的自定义表情主键
const fileRef = ref(null);

const customCount = computed(() => custom.value.length);

const sections = computed(() => CATS.map((c) => {
  const items = [];
  // 内置：不给删（没有后端记录，删了没法恢复）
  (BUILTIN[c.key] || []).forEach((f) =>
    items.push({ url: mediaBase() + f + ".jpg", name: c.label + "表情", deletable: false, file: "", key: f, builtin: true }));
  custom.value.filter((x) => x.cat === c.key).forEach((x) =>
    items.push({ url: x.url, name: x.name || c.label, deletable: true, file: x.file || "", key: x.file || x.url, builtin: false }));
  return { key: c.key, label: c.label, items: items };
}));

// 自己的表情不能把 /api/sticker-file/ 直接写进 src：<img> 的请求不走被削尖的 fetch，
// 会被真服务器打回 404。取不回来就返回 null（Vue 会省略 src），配合 broken 占位。
function showSrc(it) {
  if (!isFakeApi(it.url)) return it.url;
  const r = resolved.value[it.url];
  return r ? r : null;
}
function isBroken(it) {
  return isFakeApi(it.url) && resolved.value[it.url] === "";
}
function noop() {}

async function hydrate() {
  const urls = [];
  sections.value.forEach((s) => s.items.forEach((it) => {
    if (isFakeApi(it.url) && resolved.value[it.url] === undefined) urls.push(it.url);
  }));
  const fn = g("resolveSticker", async () => "");
  await Promise.all(urls.map(async (u) => {
    resolved.value[u] = "";                       // 先占位，避免重复发请求
    const ou = await fn(u);
    resolved.value[u] = ou || "";
  }));
}

async function load() {
  try {
    const r = await fetch("/api/stickers");
    const list = await r.json();
    // 内置表情的 url 带 /ta-media/，那部分由 BUILTIN 直接出，这里只要自己上传的
    custom.value = (Array.isArray(list) ? list : []).filter((x) => x && !/\/ta-media\//.test(x.url || ""));
  } catch (e) {
    custom.value = [];
  }
  await hydrate();
}

function pickCat(k) { uploadCat.value = k; }
function toggleManage() {
  managing.value = !managing.value;
  // 退出整理模式时把长按计时清掉，免得悬着的定时器 600ms 后偷偷删一张
  lpCancel();
}
function onItemClick(it) {
  if (managing.value) return;            // 整理模式下点图不发送：彻底消除「想删却发出去」
  const send = g("sendSticker", null);
  if (send) send(it.url, it.name, it.file || "");
  managing.value = false;                // 与 legacy sendSticker 末尾那句 remove("managing") 对齐
}

// key 必须是后端真实主键，不能用 url 反推 —— 自定义表情的 url 末段不等于主键，
// 删错是静默假删除（legacy 里这条注释值得原样搬过来）。
function removeKey(key) {
  return fetch("/api/stickers/" + encodeURIComponent(key), { method: "DELETE" })
    .catch((err) => { console.error("[sticker] delete failed", err); });
}
function onDelete(it) {
  if (!it.deletable) return;                 // 内置不给删
  const key = it.key || it.file || String(it.url || "").split("/").pop();
  if (!key || deleting.value === key) return;
  deleting.value = key;
  removeKey(key).then(() => { deleting.value = ""; load(); });
}

// ── 长按 600ms 删除（不用先进整理模式）──
// 移动超过 10px 视为滚动，取消。
let lp = null, sx = 0, sy = 0;
function lpStart(e, it) {
  if (!it.deletable) return;
  sx = e.clientX; sy = e.clientY;
  clearTimeout(lp);
  lp = setTimeout(() => { lp = null; onDelete(it); }, 600);
}
function lpMove(e) {
  if (Math.abs(e.clientX - sx) > 10 || Math.abs(e.clientY - sy) > 10) lpCancel();
}
function lpCancel() { clearTimeout(lp); lp = null; }

function onUploadClick() {
  const fi = fileRef.value;
  if (!fi) return;
  fi.value = "";
  fi.click();
}
async function onUploadChange() {
  const fi = fileRef.value;
  if (!fi) return;
  const files = Array.from(fi.files || []);
  if (!files.length) return;
  await Promise.all(files.map((f) => {
    const form = new FormData();
    form.append("file", f);
    form.append("cat", uploadCat.value);
    return fetch("/api/stickers", { method: "POST", body: form }).catch(() => null);
  }));
  fi.value = "";
  await load();
  // 明说一句怎么删：之前只有「整理」模式里才出现角标，用户找不到，就报「无法删除」
  toast("上传好了 · 长按表情，或点「整理」再点 ✕ 就能删掉");
}

onMounted(load);
</script>
