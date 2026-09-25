/* bigstore.js —— collide 统一存储层（真源 = IndexedDB）
 *
 * ── 为什么要有这个文件 ────────────────────────────────────────────
 * 过去所有数据（聊天记录、头像、日记、打卡、主题…）都躺在 localStorage 里。
 * localStorage 只有 5~10MB，而且是**同步** API —— 好处是读写不用 await，
 * 坏处是：一旦写满，setItem 抛 QuotaExceededError，如果没人 try/catch（或者
 * 甩手不管），所有写入**静默失败**。表现就是那一串连体症状：
 *   消息发完一刷新就没 / 礼物送不出去 / 头像主题换完又变回去 / 打卡点不动。
 *
 * IndexedDB 的配额浏览器按整站给（实测 10GB 量级），装聊天记录和头像绰绰有余。
 * 但它**只有异步 API** —— 而页面里 60 多处 localStorage.getItem 全是同步调用
 * （连 <head> 里挑主题的几行都是），改成 await 等于重写半个应用。
 *
 * ── 本文件的做法：同步壳 + 异步里子 ────────────────────────────────
 *   1. 启动瞬间同步把 localStorage 里的老数据灌进内存镜像 MEM
 *      （升级时数据还在 localStorage，这一步保证「零闪烁、零丢失」）；
 *   2. 异步把 MEM 整批搬进 IndexedDB，搬成功后**删掉 localStorage 里的原键**，
 *      从此 localStorage 里不再存任何业务数据；
 *   3. 之后每次启动从 IndexedDB 拉全量回填 MEM（几十毫秒，开屏动画正好盖住）；
 *   4. 读 = 同步读 MEM（上层代码一行都不用改）；
 *   5. 写 = 同步改 MEM + 异步落盘 IndexedDB（write-behind，一个 tick 内合并）。
 *
 * 上层拿到的 API 和 localStorage 长得一模一样：LS.get(k) / LS.set(k,v) / LS.del(k)
 * —— 只是 LS.get 可能在 IndexedDB 水合完成前返回 null，所以对「首屏外观」那一类
 * （主题、头像）额外监听 'collide:storeready' 再刷一次即可。
 *
 * ── 安全兜底 ──────────────────────────────────────────────────────
 *   · IndexedDB 打不开（无痕模式 / 被禁）→ 自动降级回原生 localStorage，
 *     并且**绝不删 localStorage**（否则数据就真没了）；
 *   · 水合完成之前产生的写，只对 IndexedDB 里**还不存在**的键生效（"种子"语义），
 *     防止默认值把真数据覆盖掉（llmCfg()/setting() 开场就爱填默认值）；
 *   · 页面隐藏/卸载前强制落盘一次，避免"写完立刻关页面"丢最后一条；
 *   · 多标签页：BroadcastChannel 同步 key 变更，避免两个标签页互相覆盖。
 *
 * 本文件管两个库：
 *   collide-store —— 业务数据全部搬进这里（window.LS）
 *   collide-big   —— 上一版「大件仓库」留下的库（window.bigStore），
 *                    老头像还在里面存着，指针 "big:avatar_me" 指向它，不能删。
 *
 * 必须在 local-server.js 之前以经典 script 加载（后面的代码同步依赖它）。
 */
(function () {
  "use strict";

  /***** IndexedDB 小封装（两个库共用一套代码） *****/
  function mkDB(name, ver, store) {
    var dbp = null;
    function open() {
      if (dbp) return dbp;
      dbp = new Promise(function (res, rej) {
        var req;
        try { req = indexedDB.open(name, ver); } catch (e) { return rej(e); }
        req.onupgradeneeded = function () {
          var db = req.result;
          if (!db.objectStoreNames.contains(store)) db.createObjectStore(store);
        };
        req.onsuccess = function () { res(req.result); };
        req.onerror = function () { rej(req.error || new Error("open failed")); };
        req.onblocked = function () { rej(new Error("blocked")); };
      });
      dbp["catch"](function () { dbp = null; });   // 打开失败别赖着，下次再试
      return dbp;
    }
    /* 一个事务里发多个请求，等事务真正 commit 了才 resolve */
    function txMulti(mode, fn) {
      return open().then(function (db) {
        return new Promise(function (res, rej) {
          var t;
          try { t = db.transaction(store, mode); } catch (e) { return rej(e); }
          var s = t.objectStore(store);
          var reqs;
          try { reqs = fn(s) || []; } catch (e) { return rej(e); }
          if (!reqs.length) { try { t.abort(); } catch (e2) {} return res([]); }
          var out = new Array(reqs.length), left = reqs.length, bad = false;
          var finish = function () {
            t.oncomplete = function () { res(out); };
          };
          reqs.forEach(function (r, i) {
            r.onsuccess = function () { out[i] = r.result; if (--left === 0 && !bad) finish(); };
            r.onerror = function () { bad = true; rej(r.error || new Error("req failed")); };
          });
          t.onabort = function () { rej(t.error || new Error("abort")); };
          t.onerror = function () { rej(t.error || new Error("tx error")); };
        });
      });
    }
    return {
      open: open,
      txMulti: txMulti,
      get: function (k) { return txMulti("readonly", function (s) { return [s.get(k)]; }).then(function (r) { return r[0]; })["catch"](function () { return null; }); },
      set: function (k, v) { return txMulti("readwrite", function (s) { return [s.put(v, k)]; }).then(function () { return true; })["catch"](function () { return false; }); },
      del: function (k) { return txMulti("readwrite", function (s) { return [s["delete"](k)]; }).then(function () { return true; })["catch"](function () { return false; }); },
      keys: function () { return txMulti("readonly", function (s) { return [s.getAllKeys()]; }).then(function (r) { return r[0] || []; })["catch"](function () { return []; }); },
    };
  }

  /* ── 库一：上一版的大件仓库（只读取历史数据用，不再往里写新东西） ── */
  var big = mkDB("collide-big", 1, "kv");
  window.bigStore = {
    get: big.get, set: big.set, del: big.del, keys: big.keys,
    ready: function () { return big.open().then(function () { return true; })["catch"](function () { return false; }); },
  };

  /* ── 库二：业务数据总库 ── */
  var main = mkDB("collide-store", 1, "kv");
  var MARK = "collide_store_migrated";       // localStorage 里唯一允许留下的键
  var BC_NAME = "collide-store-sync";

  /* 不搬进 IndexedDB 的键 */
  var KEEP = {};
  KEEP[MARK] = 1;
  KEEP["__collide_probe"] = 1;

  /***** 状态 *****/
  var MEM = Object.create(null);      // key -> string|null，运行时内存镜像
  var DIRTY = Object.create(null);    // key -> "p"(put) | "d"(del)，待落盘
  var PRE = Object.create(null);      // 水合完成前产生的写（种子语义）
  var IDB_KEYS = Object.create(null); // IndexedDB 里已有的键（水合时记录）
  var MODE = "idb";                   // "idb" | "ls"（降级）
  var readyFlag = false;
  var flushing = false;
  var flushTimer = null;
  var lastError = null;
  var sweepless = false;
  var bc = null;

  /***** 失败提示：沿用原来那张「配额满了」卡片的路子 *****/
  function warnFull(where) {
    try { window.__storageFull = true; } catch (e) {}
    try { if (typeof window.warnStorageFull === "function") window.warnStorageFull(where); } catch (e) {}
  }
  function relieveLS() {
    // 只在降级模式下用得上：删掉可重建的缓存给业务数据腾地方
    var freed = 0;
    ["companion_deleted_ids", "listen_history", "companion_listen_total", "letters_seen"].forEach(function (k) {
      try { if (localStorage.getItem(k) !== null) { localStorage.removeItem(k); freed++; } } catch (e) {}
    });
    return freed;
  }

  /***** 同步油门前：读 / 写（对上层完全同步） *****/
  function rawGetLS(k) {
    try { return localStorage.getItem(k); } catch (e) { return null; }
  }

  function LSget(k) {
    try {
      if (MODE === "ls") return rawGetLS(k);
      if (k in MEM) { var v = MEM[k]; return v == null ? null : v; }
      // 冷启动兜底：水合还没跑完时，localStorage 里可能刚被外部塞了值
      if (!readyFlag) {
        var r = rawGetLS(k);
        if (r !== null) { MEM[k] = r; return r; }
      }
      return null;
    } catch (e) { return null; }
  }

  function LSset(k, val) {
    try {
      var s = (val === undefined || val === null) ? null : String(val);
      if (MODE === "ls") {
        try { localStorage.setItem(k, s); return true; }
        catch (e) {
          if (relieveLS()) { try { localStorage.setItem(k, s); return true; } catch (e2) {} }
          warnFull(k); return false;
        }
      }
      MEM[k] = s;
      if (!readyFlag) { PRE[k] = s; return true; }   // 等水合后按"种子"语义落盘
      DIRTY[k] = "p";
      scheduleFlush();
      publish(k);
      return true;
    } catch (e) { return false; }
  }

  function LSdel(k) {
    try {
      if (MODE === "ls") { try { localStorage.removeItem(k); } catch (e) {} return true; }
      MEM[k] = null;
      if (!readyFlag) { PRE[k] = null; return true; }
      DIRTY[k] = "d";
      scheduleFlush();
      publish(k);
      return true;
    } catch (e) { return false; }
  }

  /***** 落盘（write-behind） *****/
  function scheduleFlush() {
    if (flushing) return;
    if (flushTimer) clearTimeout(flushTimer);
    // 用 0ms 而不是 50ms：一个 tick 后就写，既能合并同帧内的多次写（连着改主题+名字），
    // 又不会因为"刚发完消息马上刷新"丢最后一条 —— 人的手指没那么快。
    flushTimer = setTimeout(function () { flushTimer = null; flushNow(); }, 0);
  }

  function flushNow() {
    if (MODE === "ls") return Promise.resolve(true);
    if (flushing) { scheduleFlush(); return Promise.resolve(true); }
    var jobs = Object.keys(DIRTY);
    if (!jobs.length) return Promise.resolve(true);
    flushing = true;
    if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
    var snap = jobs.map(function (k) { return { k: k, act: DIRTY[k], v: MEM[k] }; });
    jobs.forEach(function (k) { delete DIRTY[k]; });
    return main.txMulti("readwrite", function (s) {
      return snap.map(function (j) { return j.act === "d" ? s["delete"](j.k) : s.put(j.v, j.k); });
    }).then(function () {
      flushing = false;
      snap.forEach(function (j) { if (j.act === "d") delete IDB_KEYS[j.k]; else IDB_KEYS[j.k] = 1; });
      if (Object.keys(DIRTY).length) scheduleFlush();   // 落盘期间又有人写了
      return true;
    }, function (e) {
      flushing = false;
      lastError = e;
      console.warn("[store] 落盘失败:", e);
      warnFull("IndexedDB");
      // 写不回去就塞回队列，下次有机会再试，别丢数据
      snap.forEach(function (j) { DIRTY[j.k] = j.act; });
      return false;
    });
  }

  /***** 水合 / 迁移 *****/
  function isMine(k) {
    if (KEEP[k]) return false;
    // 只认自己的东西：第三方塞进来的键不碰、不留、不删
    return /^(collide_|companion_)/.test(k);
  }

  /* 启动第一件事：把 localStorage 里的业务数据同步灌进 MEM。
     升级那一次真数据还在 localStorage —— 这一步让所有同步读立刻拿到值，
     页面既不闪白也不会"读了半天是空的"。 */
  function warmFromLS() {
    var n = 0;
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (!isMine(k)) continue;
        var v = localStorage.getItem(k);
        if (v === null) continue;
        MEM[k] = v; n++;
      }
    } catch (e) {}
    return n;
  }

  /* 一次性搬家：MEM（= localStorage 现状）整批写进 IndexedDB，
     成功后才删 localStorage —— localStorage 必须先确认 IDB 已 commit 才能动。 */
  function migrateFromLS() {
    var keys = Object.keys(MEM).filter(isMine);
    try { localStorage.setItem(MARK, "1"); } catch (e) {}
    if (!keys.length) return Promise.resolve(0);
    return main.txMulti("readwrite", function (s) {
      return keys.map(function (k) { return s.put(MEM[k], k); });
    }).then(function () {
      keys.forEach(function (k) {
        IDB_KEYS[k] = 1;
        try { localStorage.removeItem(k); } catch (e) {}
      });
      console.info("[store] 已把 " + keys.length + " 项数据搬进 IndexedDB，localStorage 不再存业务数据");
      return keys.length;
    });
  }

  /* 从 IndexedDB 拉全量回填 MEM */
  function hydrate() {
    return main.txMulti("readonly", function (s) { return [s.getAllKeys(), s.getAll()]; }).then(function (r) {
      var keys = r[0] || [], vals = r[1] || [];
      for (var i = 0; i < keys.length; i++) { MEM[keys[i]] = vals[i]; IDB_KEYS[keys[i]] = 1; }
      return keys.length;
    });
  }

  /* 收养：localStorage 里又冒出来的旧式数据（老版本标签页写的、外部脚本塞的）。
     IndexedDB 里有的，以 IndexedDB 为真源、删掉 localStorage 那份；
     IndexedDB 里没有的，收养进 IndexedDB —— localStorage 于是永远不脏。 */
  function sweepLS() {
    if (MODE === "ls" || sweepless) return Promise.resolve(0);
    var adopt = [], drop = [];
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (!isMine(k)) continue;
        if (IDB_KEYS[k]) drop.push(k); else adopt.push(k);
      }
    } catch (e) {}
    drop.forEach(function (k) { try { localStorage.removeItem(k); } catch (e) {} });
    if (!adopt.length) return Promise.resolve(0);
    return main.txMulti("readwrite", function (s) {
      return adopt.map(function (k) { return s.put(localStorage.getItem(k), k); });
    }).then(function () {
      adopt.forEach(function (k) { IDB_KEYS[k] = 1; try { localStorage.removeItem(k); } catch (e) {} });
      return adopt.length;
    }, function () { return 0; });
  }

  /* 水合完成前那批写：只有 IndexedDB 里**本来没有**的键才认（"种子"语义）。
     为什么非这样不可：llmCfg() / setting() 一开场就拿默认值 setDB 一遍，
     照单全收的话，用户真的人设档案和设置会被开场这几毫秒的默认值洗掉。 */
  function applyPre() {
    var seed = Object.keys(PRE).filter(function (k) { return !IDB_KEYS[k] && PRE[k] != null; });
    PRE = Object.create(null);
    if (!seed.length) return Promise.resolve(0);
    seed.forEach(function (k) { MEM[k] = MEM[k]; DIRTY[k] = "p"; });
    return flushNow().then(function () { return seed.length; });
  }

  /* 上一版头像搬迁留下的 "big:xxx" 指针，现在没必要存在了 ——
     所有键值本来就住在 IndexedDB 里。这里把它们还原成真值，往后少一条分支。 */
  function resolvePointers() {
    var jobs = [];
    Object.keys(MEM).forEach(function (k) {
      var v = MEM[k];
      if (typeof v !== "string" || v.indexOf("big:") < 0) return;
      if (v.indexOf("big:") === 0) { jobs.push({ key: k, ptr: v.slice(4), field: null }); return; }
      try {
        var o = JSON.parse(v);
        if (o && typeof o === "object") {
          Object.keys(o).forEach(function (f) {
            if (typeof o[f] === "string" && o[f].indexOf("big:") === 0) {
              jobs.push({ key: k, ptr: o[f].slice(4), field: f, obj: o });
            }
          });
        }
      } catch (e) {}
    });
    if (!jobs.length) return Promise.resolve(0);
    return Promise.all(jobs.map(function (j) {
      return big.get(j.ptr).then(function (real) {
        if (typeof real !== "string" || !real) return;
        if (j.field) { j.obj[j.field] = real; MEM[j.key] = JSON.stringify(j.obj); }
        else MEM[j.key] = real;
        DIRTY[j.key] = "p";
      });
    })).then(function () { return flushNow().then(function () { return jobs.length; }); }, function () { return 0; });
  }

  /***** 多标签页 *****/
  function publish(k) {
    if (!bc) return;
    try { bc.postMessage({ k: k }); } catch (e) {}
  }
  function initBC() {
    if (bc || typeof BroadcastChannel === "undefined") return;
    try {
      bc = new BroadcastChannel(BC_NAME);
      bc.onmessage = function (ev) {
        var k = ev.data && ev.data.k;
        if (!k) return;
        main.txMulti("readonly", function (s) { return [s.get(k)]; }).then(function (r) {
          MEM[k] = (r && r[0] !== undefined) ? r[0] : null;
        })["catch"](function () {});
      };
    } catch (e) { bc = null; }
  }

  /***** 启动 *****/
  function markReady(n) {
    readyFlag = true;
    try { window.__storeReady = true; } catch (e) {}
    // 配额数字给「存储体检」那张卡片用（异步，晚一点到不影响）
    try {
      if (navigator.storage && navigator.storage.estimate) {
        navigator.storage.estimate().then(function (e) {
          try { window.__storeQuota = e.quota || 0; } catch (e2) {}
        })["catch"](function () {});
      }
    } catch (e) {}
    var ev = null;
    try { ev = new CustomEvent("collide:storeready", { detail: { keys: n } }); } catch (e) {}
    try { window.dispatchEvent(ev || new Event("collide:storeready")); } catch (e) {}
  }

  var readyPromise = new Promise(function (resolve) {
    warmFromLS();
    if (typeof indexedDB === "undefined" || !indexedDB) {
      goLS(new Error("no indexedDB"));
      return;
    }
    main.open().then(function () {
      return rawGetLS(MARK) === "1" ? Promise.resolve(0) : migrateFromLS();
    }).then(function () {
      return hydrate();
    }).then(function () {
      return sweepLS();
    }).then(function () {
      return applyPre();
    }).then(function () {
      return resolvePointers();
    }).then(function () {
      initBC();
      markReady(Object.keys(MEM).length);
      resolve({ mode: MODE, n: Object.keys(MEM).length });
    })["catch"](function (e) {
      goLS(e);
    });

    function goLS(e) {
      MODE = "ls";
      lastError = e;
      sweepless = true;
      console.warn("[store] IndexedDB 不可用，已降级到 localStorage：", e && e.message ? e.message : e);
      // 降级后 localStorage 才是唯一的家：把已经读进来的东西原样写回去，一个都不能少
      Object.keys(MEM).forEach(function (k) {
        if (!isMine(k) || MEM[k] == null) return;
        try { if (localStorage.getItem(k) === null) localStorage.setItem(k, MEM[k]); } catch (e2) {}
      });
      try { localStorage.setItem(MARK, "0"); } catch (e2) {}
      markReady(0);
      resolve({ mode: MODE, n: 0 });
    }
  });

  /***** 页面藏起来 / 关掉之前把最后一批写推出去 *****/
  function flushOnLeave() {
    try { if (MODE !== "ls" && Object.keys(DIRTY).length) flushNow(); } catch (e) {}
  }
  window.addEventListener("pagehide", flushOnLeave);
  window.addEventListener("beforeunload", flushOnLeave);
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") flushOnLeave();
  });
  // 兜底：每 5 秒巡一次，万一 setTimeout(0) 那条链被某个异常打断也不会积着
  setInterval(function () { if (!flushing && MODE !== "ls" && Object.keys(DIRTY).length) flushNow(); }, 5000);

  /***** 对外 API *****/
  window.LS = {
    get: LSget,                 // 同步读（和 localStorage.getItem 一样，没有就 null）
    set: LSset,                 // 同步写（改内存 + 异步落盘），返回 true/false
    del: LSdel,
    has: function (k) { return LSget(k) !== null; },
    keys: function () { return Object.keys(MEM); },
    /* 单个键占多少字节（UTF-16，和浏览器算配额的口径一致） */
    size: function (k) { return ((k || "").length + (LSget(k) || "").length) * 2; },
    /* 全部业务数据占多少字节 */
    used: function () {
      var t = 0;
      Object.keys(MEM).forEach(function (k) { t += (k.length + (MEM[k] || "").length) * 2; });
      return t;
    },
    /* 最占地方的几项，体检面板用 */
    top: function (n) {
      var rows = Object.keys(MEM).map(function (k) {
        return { key: k, kb: Math.round((k.length + (MEM[k] || "").length) * 2 / 1024) };
      });
      rows.sort(function (a, b) { return b.kb - a.kb; });
      return rows.slice(0, n || 8);
    },
    flush: flushNow,
    ready: readyPromise,
    isReady: function () { return readyFlag; },
    mode: function () { return MODE; },
    lastError: function () { return lastError; },
    /* 浏览器给的整站配额（异步） */
    estimate: function () {
      try {
        if (navigator.storage && navigator.storage.estimate) {
          return navigator.storage.estimate().then(function (e) {
            return { usage: e.usage || 0, quota: e.quota || 0 };
          })["catch"](function () { return { usage: window.LS.used(), quota: 0 }; });
        }
      } catch (e) {}
      return Promise.resolve({ usage: window.LS.used(), quota: 0 });
    },
  };

  /* 老代码还在用 window.bigMigrate / window.bigResolve，留着兼容（历史指针还能读） */
  window.bigMigrate = function (keys) {
    if (!keys || !keys.length) return Promise.resolve(0);
    var moved = 0;
    return Promise.all(keys.map(function (k) {
      var v = null;
      try { v = localStorage.getItem(k); } catch (e) {}
      if (!v || v.indexOf("big:") === 0) return Promise.resolve();
      return big.set(k, v).then(function (ok) {
        if (!ok) return;
        try {
          if (localStorage.getItem(k) !== v) return;   // 期间被改过就别覆盖
          localStorage.setItem(k, "big:" + k);
          moved++;
        } catch (e) {}
      });
    })).then(function () { return moved; });
  };
  // 指针 -> 真值；不是指针就原样返回（调用方不用关心东西存哪）
  window.bigResolve = function (v) {
    if (typeof v === "string" && v.indexOf("big:") === 0) {
      return big.get(v.slice(4)).then(function (real) { return real == null ? null : real; });
    }
    return Promise.resolve(v);
  };
})();
