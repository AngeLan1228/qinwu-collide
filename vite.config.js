import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],

  // dedupe 是必需的：一旦 vue 被解析成两份实例（常见于 optimize 缓存重算后新旧 hash 混跑），
  // 症状是 renderSlot 里报 "Cannot read properties of null (reading 'ce')"，
  // 带 slot 的组件（UsCard / PageHero / LetterHero）整片挂载失败且控制台几乎不留痕。
  resolve: { dedupe: ["vue"] },
  optimizeDeps: { include: ["vue"] },

  // 站点部署在域名根目录（和现在 Netlify 的行为一致），保持 "/api/xxx" 这类绝对路径可用
  base: "/",

  // 静态资源目录：本版本自带的资源（已与 legacy 版分开，
  // 不再每次构建都从 frontend/collide-html 同步；要重新对齐请手动 npm run bridge）
  publicDir: "public",

  server: {
    host: true,        // 监听 0.0.0.0，手机连局域网就能访问
    port: 5173,
    strictPort: false,
  },

  preview: {
    host: true,
    port: 4173,
  },

  build: {
    outDir: "dist",
    // 保持 false：本机 safe-delete 护栏会在 dist 文件数 >50 时拦下 Vite 的清目录动作
    // （ta-media 一个目录就 64 个文件），每次构建都失败。产物文件名带 hash，
    // 同名覆盖不会串版本，不做清空也安全；要彻底重来手动删 dist 即可。
    emptyOutDir: false,
    // 现阶段 index.html 里是整站 legacy 代码，别让它被内联/拆包改写出意外行为
    target: "es2019",
    chunkSizeWarningLimit: 1500,
  },
});
