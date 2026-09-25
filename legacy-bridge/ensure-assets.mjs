// 资源自检：本版本的 public/ 是静态资源的一份自带副本（41MB，gitignore 忽略）。
// 从仓库 clone 下来时它是空的 —— 直接 npm run dev / build 会「页面能开但满屏裂图」。
//
// 这个脚本挂在 predev / prebuild 上：发现 public/ 缺关键资源时，
// 自动从 frontend/collide-html/ 拉一份过来；那边也不在就把话说清楚再退出。
//
// 注意它只在「缺」的时候才动手：public/ 已经是本版本自带的一份，
// 平时不会被 legacy 覆盖，改本版本的资源不会被冲掉。

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const PUB = path.resolve(root, "public");
const LEGACY = path.resolve(root, "..", "collide-html");

// 判断「资源到位了没」的样本：有这几个就说明同步过
const SAMPLES = ["sw.js", "local-server.js", "manifest.webmanifest", "wall-fenda.jpg"];

function hasAssets() {
  return SAMPLES.every((f) => fs.existsSync(path.join(PUB, f)));
}

if (hasAssets()) {
  console.log("[assets] public/ 已就绪，跳过");
  process.exit(0);
}

if (!fs.existsSync(LEGACY)) {
  console.error(
    "\n[assets] public/ 缺资源，而且旁边找不到 frontend/collide-html/，无法自动补齐。\n" +
      "        需要补齐的文件示例：" + SAMPLES.join(" / ") + "\n" +
      "        手工做法：把 frontend/collide-html/ 下除 index.html 之外的文件拷进 public/。\n"
  );
  process.exit(0); // 不阻断：也许用户就是要跑一次空壳
}

console.log("[assets] public/ 是空的，从 frontend/collide-html/ 拉一份…");
const mod = await import("./sync-assets.mjs").catch((e) => {
  console.error("[assets] 同步脚本执行失败：", e.message);
  return null;
});
if (mod) console.log("[assets] 补齐完成");
