# legacy-bridge —— 一次性桥接工具（平时不要跑）

本目录只服务于「从 legacy 单文件版重新对齐一次」这件事。

`frontend/collide-vue` 现在是一个**独立的 Vue3 版本**：
`index.html` 是固化的，`dev` / `build` 都不再触发任何生成动作，
改动请直接改 `index.html` 或 `src/` 里的组件。

只有一种情况需要跑这里的东西：**legacy 那边（`frontend/collide-html/index.html`）
改了新 stuff，你想把它原样搬过来**。那样才执行：

```bash
cd frontend/collide-vue
npm run bridge        # = bootstrap-entry.mjs + sync-assets.mjs
```

## 两个脚本做什么

| 脚本 | 作用 | 会覆盖什么 |
|---|---|---|
| `bootstrap-entry.mjs` | 读 `frontend/collide-html/index.html`，做路径改写 + 剥 `tidal/` 前缀 + 注入 Vue 入口 script，输出成根目录 `index.html` | **整份覆盖根目录 index.html**（你对它的手工改动会丢） |
| `sync-assets.mjs` | 把 legacy 的静态资源复制到 `public/`（音乐 29MB 那批） | `public/**`（不删你的新文件） |

`src/` 下的组件**不受影响** —— 入口危险，组件安全。

## 路径怎么解析的

两个脚本都用 `import.meta.url`（脚本自身位置）往上两级推导 legacy 的路径，
所以只要 `frontend/collide-html/` 和 `frontend/collide-vue/` 的**相对位置不变**，
把整个 `collide-vue` 目录搬到别处也能正常桥接（真要彻底断就用 `npm rm` 不了这个 legacy 之前别乱搬）。
