// 一次性脚本：把 legacy 的 index.html 复制成 Vite 入口，并把相对资源路径改成根绝对路径。
//
// 为什么必须改：Vite 会把 index.html 里的 src/href/url() 当成资源来处理，
// 相对路径（如 "wall-fenda.jpg"）会被当成“相对于项目根目录的文件”去找，找不到就报错。
// 改成 "/xxx" 后，Vite 识别为 public 目录下的公开文件，原样保留 —— 行为与现在完全一致。
//
// 只改路径，不改任何逻辑；脚本执行顺序（local-server.js 必须同步先跑）保持不变。

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(here, "../../collide-html/index.html");
const DST = path.resolve(here, "..", "index.html");

let html = fs.readFileSync(SRC, "utf8");

const hits = [];
function note(kind, from, to) { hits.push(kind + ": " + from + "  ->  " + to); }

// 资源名白名单：只改这类值，避免误伤 JS 模板字符串里的 ${...}
const ASSET_RE = /^(?:\.\/)?([\w\-./]+\.(?:js|css|png|jpe?g|webp|svg|json|mp3|ogg|wav|webmanifest|ico))$/i;
// 明确排除的：data: / blob: / http / # / mailto / 已经是绝对路径
const SKIP_RE = /^(?:https?:|data:|blob:|#|\/|mailto:|javascript:)/i;

// 1) 内联 CSS 里的 url("xxx")
html = html.replace(/url\((['"]?)([^)'"]+)\1\)/g, (m, q, v) => {
  if (SKIP_RE.test(v)) return m;
  if (!ASSET_RE.test(v)) return m;
  const to = "/" + v.replace(/^\.\//, "");
  note("css url", v, to);
  return "url(" + q + to + q + ")";
});

// 2) src / href 属性
html = html.replace(/(src|href)="([^"]*)"/g, (m, attr, v) => {
  if (SKIP_RE.test(v)) return m;
  if (!ASSET_RE.test(v)) return m;
  const to = "/" + v.replace(/^\.\//, "");
  note(attr, v, to);
  return attr + '="' + to + '"';
});

// 2.5) 剥掉 tidal/ 前缀
//    legacy 页面部署在 tidal 的上一层目录，所以写了 src="tidal/avatar-peach.png"。
//    现在 public/ 就是站点根，直接指向 /avatar-peach.png 即可 ——
//    这样就不需要再镜像一份 public/tidal/（避免目录里躺着两份会各自漂移的副本）。
//    同时覆盖 JS 字符串里的 "tidal/xxx"（属性规则抓不到）。
const tidalBefore = html;
html = html.replace(
  /(["'(])\/?tidal\/([\w\-./]+\.(?:js|css|png|jpe?g|webp|svg|json|mp3|ogg|wav|webmanifest|ico))/gi,
  "$1/$2"
);
if (html !== tidalBefore) note("tidal 前缀", '"tidal/xxx" 或 "/tidal/xxx"', '"/xxx"');

// 3) Service Worker 注册路径（JS 字符串，属性规则抓不到）
const swBefore = html;
html = html.replace(/serviceWorker\.register\("sw\.js"\)/g, 'serviceWorker.register("/sw.js")');
if (html !== swBefore) note("js", 'register("sw.js")', 'register("/sw.js")');

// 4) 把内联脚本里的字面量控制字符换成转义写法
//    原文件里 sigs.join("<0x01>") 用了一个真实的 0x01 字节做分隔符。
//    浏览器无所谓，但 Vite 用 parse5 严格解析 index.html 会报
//    "control-character-in-input-stream" 而放弃解析 —— 那样 Step 1 注入
//    <script type="module" src="/src/main.js"> 时就会失效。
//    换成 \u0001 转义后，运行时的字符串值完全一样，行为零变化。
html = html.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, (ch) => {
  const code = ch.charCodeAt(0).toString(16).padStart(4, "0");
  const to = "\\u" + code;
  note("ctrl", "0x" + code + " 字面量", to + " 转义");
  return to;
});

// 4.4) 剥掉 legacy 版自己的说明横幅
//    它写着「这是 HTML 单文件独立版本」，跟着一起进 Vue 版入口会误导人
//    （dist/index.html 里会出现两段互相打架的版本说明）。只剥注释块，不动逻辑。
const bannerBefore = html;
html = html.replace(
  /<!--\s*=+\s*\n\s*collide-html · HTML 单文件独立版本[\s\S]*?=+\s*\n-->\n?/,
  ""
);
if (html !== bannerBefore) note("legacy 横幅", "存在", "已剥掉");

// 4.5) 打上「本文件是独立版入口」的说明
//    两个版本已经分开：这份 index.html 是**固化**的入口，dev/build 都不会再生成它。
//    注释写在生成流程里，是为了让人以后手动跑 bridge 时也不会把这个提醒搞丢。
const BANNER = [
  "<!--",
  "  ==========================================================================",
  "  collide-vue · Vue3 独立版本入口",
  "  --------------------------------------------------------------------------",
  "  本文件由 legacy-bridge/bootstrap-entry.mjs 从 legacy 单文件版生成，随后**固化**：",
  "   - 日常改动直接改本文件、以及 src/ 下的 Vue 组件 module；",
  "   - dev / build 不再触发任何「从 legacy 生成」的动作；",
  "   - 再跑一次 npm run bridge 会用 legacy 那版**整份覆盖**本文件（手工改动会丢，src/ 不受影响）。",
  "  和 HTML 版（frontend/collide-html/index.html）的差异只有：资源路径改成根绝对路径、",
  "  剥掉 tidal/ 前缀、控制字符转转义、末尾注入 Vue 入口 script。",
  "  ==========================================================================",
  "-->",
].join("\n");
if (/collide-vue · Vue3 独立版本入口/.test(html)) {
  note("版本横幅", "已存在", "跳过");
} else if (/<meta charset="UTF-8">/i.test(html)) {
  html = html.replace(/<meta charset="UTF-8">/i, "<meta charset=\"UTF-8\">\n" + BANNER);
  note("版本横幅", "无", "插到 <meta charset> 之后");
}

// 5) 注入 Vue 入口
//    <script type="module"> 是 defer：文档解析完、DOMContentLoaded 之前执行，
//    晚于页面里那些同步内联脚本。所以 Vue 渲染出来的按钮抓不到逐个绑定的事件 ——
//    legacy 侧已把相关绑定改成事件委托（见 quick-card / tab-btn / letter 红点）。
const VUE_ENTRY = '<script type="module" src="/src/main.js"></' + "script>";
if (/<script type="module" src="\/src\/main\.js">/.test(html)) {
  note("vue 入口", "已存在", "跳过");
} else {
  const idx = html.lastIndexOf("</body>");
  if (idx < 0) throw new Error("找不到 </body>，无法注入 Vue 入口");
  html = html.slice(0, idx) + "  " + VUE_ENTRY + "\n" + html.slice(idx);
  note("vue 入口", "无", "</body> 前注入 module script");
}

fs.writeFileSync(DST, html);

const uniq = [...new Set(hits)];
console.log("[entry] 改写 " + hits.length + " 处（去重 " + uniq.length + " 种）:");
uniq.forEach((h) => console.log("   " + h));
console.log("[entry] 已生成 " + DST + " (" + (html.length / 1024).toFixed(0) + "KB)");
