# collide-vue · Vue3 独立版本

「你和 TA 的小窝」的 **Vue3 + Vite 版**，已与 legacy 单文件版**分开**，可独立开发、独立构建、独立部署。

| | 本版本（Vue3） | legacy（HTML 单文件） |
|---|---|---|
| 位置 | `frontend/collide-vue/` | `frontend/collide-html/index.html` |
| 入口 | 根目录 `index.html`（**固化文件**，改它就是改本版本） | `index.html`（11800 行单文件） |
| 构建 | `npm run build` → `dist/`（**含全部静态资源，可直接上传**） | 无需构建，整目录上传 |
| 关系 | 不再由 legacy 生成；要对齐才手动 `npm run bridge` | 独立维护，本版本不引用它 |

两个版本**都是完整可用的 App**，不是半成品：`dist/` 和 tidal 目录各自能单独跑起来。

## 快速开始

```bash
cd frontend/collide-vue
npm install          # 首次
npm run dev          # http://localhost:5173 （监听 0.0.0.0，手机连局域网可访问）
npm run build        # 构建到 dist/
npm run preview      # 预览构建产物 http://localhost:4173
```

注意：`dev` / `build` **不再**触发任何「从 legacy 生成」的动作（以前叫 sync，已去掉）。

## 部署 / 你要「单独检测后上传」时带走哪个目录

### 只上传 → 带走 `dist/` 整个目录，别的什么都不要

`npm run build` 产出的 **`dist/` 是完全自包含的**：Vite 已经把 `public/` 的资源整份复制进去，
里面自带 `index.html`、打包后的 `assets/`、`local-server.js`、`sw.js`、`manifest.webmanifest`、
壁纸 / 音乐 / 头像 / `ta-media/`。**丢到任何静态服务器就能跑，不需要 npm、不需要 node_modules。**

已实测：把 `dist/` 复制到一个完全独立的目录（不在项目里、旁边没有 `collide-html`），
起 `python -m http.server` 访问 → 12/12 tab 全接管、控制台无异常、头像持久化 10/10 PASS。

```bash
# 上传前快速自检（这几项都该存在）
ls dist/index.html dist/assets/ dist/local-server.js dist/sw.js dist/ta-media
```

体积约 **42MB**，其中 `music/` 占 29MB。上传时不想带音乐的，可以删掉 `dist/music/`
（播放音乐会没声音，其余功能不受影响）。

| 静态托管配置 | 值 |
|---|---|
| Build command | `npm run build` |
| Publish directory | `dist` |
| Base directory | 留空（或指向 `frontend/collide-vue`） |

⚠️ `vite.config.js` 里 `base: "/"` —— 产物里的路径都是根绝对路径（`/assets/xxx`、`/sw.js`），
**必须部署在域名根目录**。要放到子路径（如 `example.com/app/`）得先把 `base` 改成 `"/app/"` 再构建。

### 要继续开发 → 源码版需要这些

| 文件 | 必须？ | 说明 |
|---|---|---|
| `index.html` | ✅ | Vite 入口，**固化文件**，改它就是改本版本 |
| `src/` | ✅ | Vue 组件与状态（24 个组件 + `main.js` / `state.js` / `pomo.js`） |
| `public/` | ✅（运行时） | 41MB 静态资源，**gitignore 忽略**，clone 下来是空的 |
| `package.json` / `vite.config.js` | ✅ | 构建配置 |
| `node_modules/` | 由 `npm install` 生成 | 不入库 |
| `legacy-bridge/` | ❌ | 只在要跟 HTML 版对齐时才用 |

`public/` 没入库这件事已经处理掉了：`predev` / `prebuild` 会先跑
`legacy-bridge/ensure-assets.mjs`，资源缺失时自动从 `frontend/collide-html/` 补齐。
所以 **clone 下来直接 `npm install && npm run dev` 就能跑**（前提是两版在同一个仓库里）。
如果你要把 Vue 源码版单独搬到另一个仓库，就必须把 `public/` 一起带走，或者让它入库。

## 目录结构

```
frontend/collide-vue/
├─ index.html            ← Vite 入口。= legacy 那版整体的固化副本 + Vue 入口 script
├─ vite.config.js
├─ package.json          ← name: collide-vue
├─ legacy-bridge/        ← 【平时不要跑】只在需要重新对齐 legacy 时用（见该目录 README）
├─ public/               ← 本版本自带的静态资源（41MB，gitignore 忽略，但 dist 里会有）
├─ src/
│   ├─ main.js           ← 挂载 12 个 tab + #empty + .composer + #msgMenu + #stickerPanel + .tab-bar
│   ├─ state.js          ← 跨组件共享的响应式状态
│   ├─ pomo.js           ← 番茄钟状态机（Step 5）
│   ├─ icons.js          ← 图标数据（只存 path/circle…，不存整坨 svg）
│   ├─ config/           ← quickGrid.js / tabs.js / moreGroups.js
│   └─ components/       ← 24 个组件（见下）
└─ dist/                 ← 构建产物 = 可上传目录
```

## 现在 Vue 接管到哪一步了

| 模块 | 状态 | 说明 |
|---|---|---|
| 12 个 Menu tab 面板 | **Vue 整块接管** | Home / Listen / Where / Music / Us / Todo / Letter / Diary / More / Checkin / Memory / Timeline |
| 番茄钟 | **Vue（含状态机）** | `src/pomo.js`，legacy 检测到就自动让位，不会跑双份计时器 |
| 聊天空状态 `#empty` | **Vue** | 结构搬了，行为仍在 legacy |
| 输入区 `.composer` | **Vue** | `#input` 非受控，两边都写 value 会吞字，所以故意不接管行为 |
| 消息操作菜单 `#msgMenu` | **Vue** | 同上，点击由 legacy 的 `bindMsgMenu()` 委托 |
| 贴纸面板 `#stickerPanel` | **Vue（连行为一起）** | 第一个把行为也搬过来的模块 |
| 底栏 `.tab-bar` | **Vue** | 归属相同的相邻 tab 切换时 Vue 算出的 class 不变 → 不 patch，需要在组件里 watch + nextTick 手动再 toggle |
| **消息列表 `#scroll`** | **留在 legacy（有意）** | 同帧 anchor 补偿会被 Vue 的 nextTick 拆开 → 上滑抖动；评估后决定不搬 |
| 其他（轮询 / 虚拟滚动 / IndexedDB 缓存） | legacy | 同上 |

**这是有意的混跑，不是「没搬完」。**

### Vue 侧依赖的 legacy 全局接口（以后要彻底解耦就从这里动刀）

`CONFIG`（配置与名字）、`taName()`、`switchTab()`、`openMenu()`、`showToast()`、
`renderWhere()`、`addRecord()`、`__listenMusicOn`、`__menu`、`sendSticker()`、
以及被覆写的 `window.fetch`（local-server 提供的本地 API 层，数据在 localStorage `collide_*`）。

## Vue 与 legacy 混跑的三条铁律（改之前必读）

1. **Vue 是 defer，晚于页面里同步执行的内联脚本** → legacy 逐个 `querySelector 绑事件`
   抓不到 Vue 渲染出来的节点。legacy 侧必须改成**事件委托**（绑在不会被 Vue 换掉的静态容器上）。
2. **缓存引用改现取**：`const el = $('#xxx')` 缓存下来的引用会在 Vue 挂载后指向脱离文档的旧节点
   （症状：数据一直停在旧值上，且不报错）。
3. **加 `vue:mounted` 监听**：`src/main.js` 挂完后会广播这个事件，legacy 各模块监听它重跑一次
   渲染/绑定。纯 legacy 部署下这事件永不触发，零副作用。

另外：消息列表这种「渲染 + 立刻补偿滚动」的同帧操作**不能拆到 nextTick**，会抖。
详细机制与踩过的坑见仓库根目录 `progress.md`。

## 发版前检查清单

- [ ] 改了前端就给 `public/sw.js` 的 `CACHE` **+1**（否则老用户被 SW 缓存卡住看不到新版本）
- [ ] `npm run build` 通过，dist 里 `index.html / assets / local-server.js / sw.js / ta-media` 都在
- [ ] 跑 `_chrome_tmp/cdp-health.js` 体检（真浏览器，检查遮挡 / Vue 挂点 / 控制台异常）
- [ ] 仓库是 public 的：**不要写本机绝对路径、不要提交真实密钥**（API Key 存在 localStorage，不落盘）
