// 【桥接工具 · 平时不要跑】把 HTML 版（collide-html）的静态资源同步到本版本的 public/
// 本版本（frontend/collide-vue）已经和 HTML 版分开，dev / build 都不再调用它。
//   源: frontend/collide-html/**      （除 index.html）
//   目标: frontend/collide-vue/public/**
//   注意：原页面里有 7 处写成 src="tidal/avatar-peach.png"，
//        该前缀由 bootstrap-entry.mjs 统一剥成 /avatar-peach.png，这里不再镜像。

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(here, "../../collide-html");
const DST = path.resolve(here, "..", "public");

if (!fs.existsSync(SRC)) {
  console.error("[sync] 源目录不存在: " + SRC);
  process.exit(1);
}

fs.mkdirSync(DST, { recursive: true });

let copied = 0;
let bytes = 0;

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    const f = path.join(from, e.name);
    const t = path.join(to, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules") continue;
      copyDir(f, t);
    } else {
      if (e.name === "index.html") continue; // 入口由 vite 自己管，不拷
      const st = fs.statSync(f);
      const dstSt = fs.existsSync(t) ? fs.statSync(t) : null;
      if (!dstSt || dstSt.size !== st.size || dstSt.mtimeMs < st.mtimeMs) {
        fs.copyFileSync(f, t);
        copied++;
        bytes += st.size;
      }
    }
  }
}

// 1) 全部资源 → public/
copyDir(SRC, DST);

// 2) 清理历史遗留的镜像目录 public/tidal/
//    以前为了兼容 src="tidal/xxx.png" 而镜像了一整份顶层文件；
//    现在 bootstrap-entry.mjs 已把这类前缀剥成 /xxx.png，镜像不再需要。
//    留着它就会变成第二份会各自漂移的副本（这个项目已经踩过一次死副本的坑）。
const MIRROR = path.join(DST, "tidal");
if (fs.existsSync(MIRROR)) {
  fs.rmSync(MIRROR, { recursive: true, force: true });
  console.log("[sync] 已删除不再需要的镜像目录 public/tidal/");
}

console.log(
  "[sync] " + (copied ? "已更新 " + copied + " 个文件 (" + (bytes / 1048576).toFixed(1) + "MB)" : "资源无变化")
);
