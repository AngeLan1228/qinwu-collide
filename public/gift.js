/* ============================================================
 * collide · 礼物小铺 / 我们的小金库 / 心动回忆
 * 纯虚拟金币，不接任何真实支付。数据由 local-server.js 存本地。
 * ============================================================ */
(function () {
  if (window.__giftLoaded) return; window.__giftLoaded = true;

  var INTIMACY_GOAL = 120;
  var STATE = null;
  var currentTab = "shop";

  function $(s, r){ return (r||document).querySelector(s); }
  function esc(s){ return String(s==null?"":s).replace(/[&<>"']/g, function(c){
    return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]; }); }
  function taName(){ try { return (window.taName && window.taName()) || "秦梧"; } catch(e){ return "秦梧"; } }
  function meName(){ try { return (window.meName && window.meName()) || "你"; } catch(e){ return "你"; } }
  function toast(t){ if (window.showToast) return window.showToast(t);
    var b = document.getElementById("gToast");
    if (!b){ b = document.createElement("div"); b.id="gToast"; b.className="g-toast"; document.body.appendChild(b); }
    b.textContent = t; b.classList.add("show"); clearTimeout(b._t);
    b._t = setTimeout(function(){ b.classList.remove("show"); }, 2200);
  }
  function api(path, opts){
    opts = opts || {};
    opts.headers = { "Content-Type":"application/json" };
    return fetch(path, opts).then(function(r){
      return r.json().catch(function(){return {};}).then(function(j){ return { ok:r.ok, status:r.status, json:j }; });
    });
  }
  function taAvatar(){
    try { var s = JSON.parse((window.LS ? LS.get("collide_setting") : localStorage.getItem("collide_setting")) || "{}"); return s.taAvatar || ""; } catch(e){ return ""; }
  }
  function todayStr(){ var d=new Date(); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); }
  function fmtDate(ts){ var d=new Date(ts); return (d.getMonth()+1)+"/"+d.getDate()+" "+String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0"); }
  function refreshChat(){ try { window.backfill && window.backfill(); } catch(e){} }

  /* ---------- 样式 ---------- */
  var css = `
.g-ov{position:fixed;inset:0;z-index:99990;background:rgba(40,20,30,.42);backdrop-filter:blur(3px);display:none;align-items:flex-end;justify-content:center;}
.g-ov.show{display:flex;animation:gFade .22s ease;}
@keyframes gFade{from{opacity:0}to{opacity:1}}
.g-card{width:100%;max-width:480px;height:88vh;background:var(--bg,#fff7fa);border-radius:22px 22px 0 0;box-shadow:0 -12px 40px rgba(0,0,0,.18);display:flex;flex-direction:column;overflow:hidden;animation:gUp .28s cubic-bezier(.2,.8,.25,1);}
@keyframes gUp{from{transform:translateY(40px);opacity:.6}to{transform:translateY(0);opacity:1}}
.g-head{padding:16px 16px 10px;display:flex;align-items:center;gap:10px;border-bottom:1px solid var(--hairline,rgba(232,137,156,.14));flex-wrap:wrap;}
.g-ava{width:42px;height:42px;border-radius:50%;object-fit:cover;background:var(--accent,#E8899C);flex:0 0 auto;}
.g-bal{display:flex;align-items:center;gap:6px;font-size:14px;font-weight:700;color:var(--accent-strong,#C66B84);}
.g-bal .coin{font-size:16px;}
.g-spacer{flex:1;}
.g-checkin{border:none;border-radius:16px;padding:7px 13px;font-size:13px;font-weight:600;color:var(--accent-fg,#fff);background:var(--accent,#E8899C);cursor:pointer;}
.g-checkin:disabled{opacity:.55;cursor:default;}
.g-close{border:none;background:transparent;font-size:22px;color:#b58a98;cursor:pointer;line-height:1;padding:2px 4px;}
.g-intimacy{padding:10px 16px 4px;}
.g-intimacy .lab{font-size:12px;color:#b07b8b;margin-bottom:5px;display:flex;justify-content:space-between;}
.g-bar{height:9px;border-radius:6px;background:var(--seg-track,rgba(232,137,156,.12));overflow:hidden;}
.g-bar>i{display:block;height:100%;border-radius:6px;background:linear-gradient(90deg,var(--accent,#E8899C),var(--accent-strong,#C66B84));transition:width .5s;}
.g-tabs{display:flex;gap:6px;padding:10px 16px 4px;}
.g-tab{flex:1;border:1px solid var(--hairline,rgba(232,137,156,.16));background:transparent;color:#a87484;border-radius:14px;padding:8px 0;font-size:13px;font-weight:600;cursor:pointer;}
.g-tab.on{background:var(--accent,#E8899C);color:var(--accent-fg,#fff);border-color:var(--accent,#E8899C);}
.g-body{flex:1;overflow-y:auto;padding:12px 16px 26px;-webkit-overflow-scrolling:touch;}
.g-grid{display:grid;grid-template-columns:1fr 1fr;gap:11px;}
.g-gift{background:var(--card,#fff);border:1px solid var(--card-line,rgba(232,137,156,.12));border-radius:16px;padding:13px 11px;display:flex;flex-direction:column;align-items:center;text-align:center;box-shadow:var(--card-shadow,0 6px 16px rgba(232,137,156,.08));}
.g-gift .em{font-size:34px;line-height:1;margin-bottom:7px;}
.g-gift .nm{font-size:14px;font-weight:700;color:#5a4149;}
.g-gift .ht{font-size:11px;color:#b59aa3;line-height:1.45;margin:4px 0 9px;min-height:30px;}
.g-gift button{border:none;border-radius:13px;padding:6px 14px;font-size:12.5px;font-weight:600;color:var(--accent-fg,#fff);background:var(--accent,#E8899C);cursor:pointer;}
.g-gift button:disabled{opacity:.5;}
.g-fund{background:var(--card,#fff);border:1px solid var(--card-line,rgba(232,137,156,.12));border-radius:16px;padding:14px;margin-bottom:12px;box-shadow:var(--card-shadow,0 6px 16px rgba(232,137,156,.08));}
.g-fund .fh{display:flex;align-items:center;gap:9px;margin-bottom:9px;}
.g-fund .fh .em{font-size:27px;}
.g-fund .fh .tt{font-size:14.5px;font-weight:700;color:#5a4149;}
.g-fund .fh .gd{margin-left:auto;font-size:12.5px;font-weight:700;color:var(--accent-strong,#C66B84);}
.g-fund .bar{height:11px;border-radius:7px;background:var(--seg-track,rgba(232,137,156,.12));overflow:hidden;margin-bottom:8px;}
.g-fund .bar>i{display:block;height:100%;border-radius:7px;background:linear-gradient(90deg,#f3b6c6,var(--accent,#E8899C));transition:width .6s;}
.g-fund .meta{font-size:11.5px;color:#b59aa3;display:flex;justify-content:space-between;}
.g-fund .dep{margin-top:10px;width:100%;border:none;border-radius:12px;padding:9px 0;font-size:13.5px;font-weight:600;color:var(--accent-fg,#fff);background:var(--accent,#E8899C);cursor:pointer;}
.g-fund .dep:disabled{opacity:.55;cursor:default;}
.g-fund.done .dep{background:#9dbda8;}
.g-story{background:var(--card,#fff);border:1px solid var(--card-line,rgba(232,137,156,.12));border-radius:15px;padding:13px 14px;margin-bottom:10px;cursor:pointer;box-shadow:var(--card-shadow,0 6px 16px rgba(232,137,156,.07));}
.g-story .st{font-size:14px;font-weight:700;color:#5a4149;display:flex;align-items:center;gap:7px;}
.g-story .sd{font-size:11.5px;color:#c0a3ac;margin-top:3px;}
.g-empty{text-align:center;color:#c3aab3;font-size:13px;line-height:1.9;padding:40px 10px;}
.g-tip{font-size:11.5px;color:#bd9fa8;line-height:1.7;text-align:center;margin:16px 4px 0;}
/* 反应弹窗 */
.g-react-ov{position:fixed;inset:0;z-index:99995;display:none;align-items:center;justify-content:center;padding:26px;background:rgba(40,20,30,.4);}
.g-react-ov.show{display:flex;}
.g-react{background:var(--card,#fff);border-radius:20px;padding:22px 20px;max-width:380px;width:100%;box-shadow:0 20px 50px rgba(0,0,0,.25);text-align:center;animation:gUp .3s;}
.g-react img.ra{width:66px;height:66px;border-radius:50%;object-fit:cover;background:var(--accent,#E8899C);}
.g-react .rname{font-size:13px;color:var(--accent-strong,#C66B84);font-weight:700;margin:9px 0 12px;}
.g-react .rline{font-size:15px;color:#4d3a41;line-height:1.85;white-space:pre-wrap;text-align:left;background:var(--bubble-ai,rgba(232,137,156,.08));border-radius:14px;padding:13px 15px;margin-bottom:8px;border:1px solid var(--bubble-ai-line,rgba(232,137,156,.1));}
.g-react .rstory-tag{display:inline-block;font-size:11px;color:var(--accent-fg,#fff);background:var(--accent-strong,#C66B84);border-radius:10px;padding:2px 10px;margin-bottom:10px;}
.g-react button{margin-top:12px;width:100%;border:none;border-radius:13px;padding:11px 0;font-size:14.5px;font-weight:600;color:var(--accent-fg,#fff);background:var(--accent,#E8899C);cursor:pointer;}
.g-toast{position:fixed;left:50%;bottom:14%;transform:translateX(-50%) translateY(12px);background:rgba(60,35,45,.92);color:#fff;padding:10px 18px;border-radius:16px;font-size:13.5px;z-index:99998;opacity:0;transition:.25s;max-width:80%;text-align:center;pointer-events:none;}
.g-toast.show{opacity:1;transform:translateX(-50%) translateY(0);}
`;
  var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  /* ---------- 入口按钮 ---------- */
  var ICON_GIFT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>';
  var ICON_FUND = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M14.5 9.2c-.5-.8-1.4-1.2-2.5-1.2-1.4 0-2.5.8-2.5 1.9 0 2.4 5 1.3 5 3.7 0 1.1-1.1 1.9-2.6 1.9-1.1 0-2.1-.5-2.6-1.3M12 6.5v1.3M12 16.2v1.3"/></svg>';
  var ARROW = '<div class="more-arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg></div>';

  function injectEntries(){
    var list = $("#tab-more .more-list");
    if (!list || $("#giftShopEntry")) return;
    list.insertAdjacentHTML("beforeend",
      '<button class="more-item" type="button" id="giftShopEntry"><div class="more-ic">'+ICON_GIFT+'</div><div class="more-label">礼物小铺</div>'+ARROW+'</button>' +
      '<button class="more-item" type="button" id="fundEntry"><div class="more-ic">'+ICON_FUND+'</div><div class="more-label">我们的小金库</div>'+ARROW+'</button>');
    $("#giftShopEntry").onclick = function(){ openPanel("shop"); };
    $("#fundEntry").onclick = function(){ openPanel("fund"); };
  }

  /* ---------- 主面板 ---------- */
  function ensureOverlay(){
    var ov = $("#gOverlay");
    if (ov) return ov;
    ov = document.createElement("div"); ov.id = "gOverlay"; ov.className = "g-ov";
    ov.innerHTML = '<div class="g-card">' +
      '<div class="g-head">' +
        '<img class="g-ava" id="gAva" alt="">' +
        '<div style="display:flex;flex-direction:column;gap:2px;"><div class="g-bal"><span class="coin">🪙</span><span id="gCoins">0</span><span style="font-weight:500;font-size:11px;color:#bd9fa8;">金币</span></div>' +
        '<div style="font-size:11px;color:#bd9fa8;">和 '+esc(taName())+' 的小日常</div></div>' +
        '<div class="g-spacer"></div>' +
        '<button class="g-checkin" id="gCheckin" type="button">每日签到</button>' +
        '<button class="g-close" id="gClose" type="button">×</button>' +
      '</div>' +
      '<div class="g-intimacy"><div class="lab"><span>❤ 心动值</span><span id="gIntTxt">0 / '+INTIMACY_GOAL+'</span></div><div class="g-bar"><i id="gIntBar" style="width:0%"></i></div></div>' +
      '<div class="g-tabs">' +
        '<button class="g-tab" data-t="shop" type="button">🎁 礼物小铺</button>' +
        '<button class="g-tab" data-t="fund" type="button">🏦 小金库</button>' +
        '<button class="g-tab" data-t="story" type="button">💌 回忆</button>' +
      '</div>' +
      '<div class="g-body" id="gBody"></div>' +
    '</div>';
    document.body.appendChild(ov);
    $("#gClose", ov).onclick = closePanel;
    ov.onclick = function(e){ if (e.target === ov) closePanel(); };
    $("#gCheckin", ov).onclick = doCheckin;
    Array.prototype.forEach.call(ov.querySelectorAll(".g-tab"), function(b){
      b.onclick = function(){ currentTab = b.getAttribute("data-t"); renderTabs(); };
    });
    return ov;
  }
  function openPanel(tab){
    currentTab = tab || "shop";
    var ov = ensureOverlay();
    var av = taAvatar();
    var img = $("#gAva", ov); if (av){ img.src = av; img.style.display="block"; } else { img.style.display="none"; }
    ov.classList.add("show");
    loadAndRender();
  }
  function closePanel(){ var ov=$("#gOverlay"); if(ov) ov.classList.remove("show"); }

  function loadAndRender(){
    return api("/api/gift/state").then(function(r){
      STATE = r.json || {};
      renderHead(); renderTabs();
    }).catch(function(){ toast("读不到数据，稍后再试"); });
  }
  function renderHead(){
    if (!STATE) return;
    $("#gCoins").textContent = STATE.coins;
    var pct = Math.min(100, Math.round((STATE.intimacy||0)/INTIMACY_GOAL*100));
    $("#gIntBar").style.width = pct+"%";
    $("#gIntTxt").textContent = (STATE.intimacy||0)+" / "+INTIMACY_GOAL;
    var btn = $("#gCheckin");
    var done = STATE.lastCheckin === todayStr();
    btn.disabled = done; btn.textContent = done ? "今日已签到 ♡" : "每日签到";
  }
  function renderTabs(){
    var ov = ensureOverlay();
    Array.prototype.forEach.call(ov.querySelectorAll(".g-tab"), function(b){
      b.classList.toggle("on", b.getAttribute("data-t") === currentTab);
    });
    var body = $("#gBody", ov);
    if (!STATE){ body.innerHTML = '<div class="g-empty">加载中…</div>'; return; }
    if (currentTab === "shop") body.innerHTML = renderShop();
    else if (currentTab === "fund") body.innerHTML = renderFund();
    else body.innerHTML = renderStory();
    bindBody();
  }

  function renderShop(){
    var coins = STATE.coins||0;
    var html = '<div class="g-grid">';
    (STATE.gifts||[]).forEach(function(g){
      var poor = coins < g.price;
      html += '<div class="g-gift"><div class="em">'+g.emoji+'</div><div class="nm">'+esc(g.name)+'</div>'+
        '<div class="ht">'+esc(g.hint)+'</div>'+
        '<button type="button" data-gift="'+g.id+'"'+(poor?' disabled':'')+'>🪙 '+g.price+(poor?' · 不够':' 送出')+'</button></div>';
    });
    html += '</div>';
    html += '<div class="g-gift" id="eggCard" style="border:1px dashed #e8a0b4;cursor:pointer;">' +
      '<div class="em">💌</div><div class="nm">作者的碎碎念</div>' +
      '<div class="ht">0 金币 · 看完有惊喜</div>' +
      '<button type="button">拆开看看</button></div>';
    html += '<div class="g-tip">金币来自每日签到、打卡和陪伴；送礼物会增加心动值，特定礼物还会触发专属小剧情 ♡<br>（纯虚拟金币，不涉及任何真实支付）</div>';
    return html;
  }
  function renderFund(){
    var defs = STATE.fundDefs||[];
    var rows = STATE.funds||[];
    var html = "";
    defs.forEach(function(d){
      var row = rows.filter(function(x){return x.id===d.id;})[0] || {balance:0,unlocked:false};
      var bal = Math.min(row.balance||0, d.goal);
      var pct = Math.min(100, Math.round(bal/d.goal*100));
      html += '<div class="g-fund'+(row.unlocked?' done':'')+'">' +
        '<div class="fh"><span class="em">'+d.emoji+'</span><span class="tt">'+esc(d.name)+'</span>' +
        '<span class="gd">'+(row.unlocked?'已实现 ♡':'🪙 '+bal+' / '+d.goal)+'</span></div>' +
        '<div class="bar"><i style="width:'+pct+'%"></i></div>' +
        '<div class="meta"><span>'+esc(taName())+'会和你一起攒</span><span>'+pct+'%</span></div>' +
        (row.unlocked
          ? '<button class="dep" type="button" disabled>这个愿望已经实现啦 ♡</button>'
          : '<button class="dep" type="button" data-fund="'+d.id+'">存入金币</button>') +
      '</div>';
    });
    html += '<div class="g-tip">两个人一起攒的小愿望：你存一点，'+esc(taName())+'也会悄悄补一点，攒满就会解锁一段专属剧情 ♡<br>（纯虚拟金币，不涉及转账或真实支付）</div>';
    return html;
  }
  function renderStory(){
    var arr = (STATE.stories||[]).slice().sort(function(a,b){ return (b.ts||0)-(a.ts||0); });
    if (!arr.length) return '<div class="g-empty">还没有心动回忆 ♡<br>送礼物、把小金库攒满，<br>专属剧情会悄悄长在这里。</div>';
    var html = "";
    arr.forEach(function(s){
      html += '<div class="g-story" data-story="'+esc(s.id)+'"><div class="st">💌 '+esc(s.title)+'</div><div class="sd">'+fmtDate(s.ts)+' · 点击回看</div></div>';
    });
    return html;
  }

  function bindBody(){
    var body = $("#gBody");
    Array.prototype.forEach.call(body.querySelectorAll("[data-gift]"), function(b){
      b.onclick = function(){ sendGift(b.getAttribute("data-gift")); };
    });
    var egg = document.getElementById("eggCard");
    if (egg) egg.onclick = openEgg;
    Array.prototype.forEach.call(body.querySelectorAll("[data-fund]"), function(b){
      b.onclick = function(){ deposit(b.getAttribute("data-fund")); };
    });
    Array.prototype.forEach.call(body.querySelectorAll("[data-story]"), function(b){
      b.onclick = function(){
        var s = (STATE.stories||[]).filter(function(x){return x.id===b.getAttribute("data-story");})[0];
        if (s) showReact([s.text], [], s.title);
      };
    });
  }

  /* ---------- 动作 ---------- */
  function doCheckin(){
    api("/api/gift/checkin", { method:"POST", body:JSON.stringify({}) }).then(function(r){
      var j = r.json||{};
      if (j.ok){ toast("签到成功 +"+j.reward+" 金币 ♡"); STATE.coins=j.coins; renderHead(); }
      else toast(j.msg || "今天已经签过到啦");
    }).catch(function(){ toast("网络开小差了"); });
  }

  function sendGift(id){
    var g = (STATE.gifts||[]).filter(function(x){return x.id===id;})[0];
    if (!g) return;
    if (!window.confirm("花 "+g.price+" 金币，把「"+g.name+"」送给 "+taName()+" ？")) return;
    var btn = document.querySelector('[data-gift="'+id+'"]'); if (btn) btn.disabled = true;
    api("/api/gift/send", { method:"POST", body:JSON.stringify({ giftId:id }) }).then(function(r){
      var j = r.json||{};
      if (!r.ok){ toast(j.error||"送出失败"); if (btn) btn.disabled=false; return; }
      STATE.coins = j.coins; STATE.intimacy = j.intimacy;
      if (j.unlocked && j.unlocked.length){
        j.unlocked.forEach(function(u){ if (!(STATE.stories||[]).some(function(x){return x.id===u.id;})) STATE.stories.push(u); });
      }
      renderHead(); renderTabs(); refreshChat();
      showReact(j.replies||[], j.unlocked||[]);
    }).catch(function(){ toast("网络开小差了"); if(btn) btn.disabled=false; });
  }

  /* ---------- 存入金币: 页内弹窗 ----------
   * 不用 window.prompt —— 手机浏览器(尤其微信内置)会屏蔽系统弹窗,
   * prompt 直接返回 null, 点了"存入金币"会毫无反应且没有报错。 */
  var DEP_CSS =
    ".g-dep-ov{position:fixed;inset:0;z-index:99999;background:rgba(40,20,30,.5);display:flex;align-items:center;justify-content:center;padding:18px;}" +
    ".g-dep{width:100%;max-width:340px;background:var(--card,#fff);border-radius:18px;padding:18px 16px 14px;box-shadow:0 12px 40px rgba(0,0,0,.22);}" +
    ".g-dep h3{margin:0 0 4px;font-size:15.5px;font-weight:700;color:#5a4149;}" +
    ".g-dep .sub{font-size:12px;color:#b59aa3;margin-bottom:12px;}" +
    ".g-dep .chips{display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap;}" +
    ".g-dep .chip{border:1px solid var(--field-line,#f0d7de);background:var(--seg-track,#fdf2f8);color:#a1727f;border-radius:20px;padding:7px 13px;font-size:13px;cursor:pointer;}" +
    ".g-dep .chip.on{background:var(--accent,#E8899C);color:#fff;border-color:var(--accent,#E8899C);}" +
    ".g-dep input{width:100%;box-sizing:border-box;border:1px solid var(--field-line,#f0d7de);border-radius:12px;padding:10px 12px;font-size:14px;margin-bottom:10px;background:var(--bg,#fff7fa);color:#5a4149;}" +
    ".g-dep .row{display:flex;gap:10px;margin-top:4px;}" +
    ".g-dep .row button{flex:1;border:none;border-radius:12px;padding:11px 0;font-size:14px;font-weight:600;cursor:pointer;}" +
    ".g-dep .cancel{background:var(--seg-track,#fdf2f8);color:#a1727f;}" +
    ".g-dep .ok{background:var(--accent,#E8899C);color:#fff;}" +
    ".g-dep .ok:disabled{opacity:.55;cursor:default;}";

  function ensureDepStyle(){
    if (document.getElementById("gDepStyle")) return;
    var s = document.createElement("style");
    s.id = "gDepStyle";
    s.textContent = DEP_CSS;
    document.head.appendChild(s);
  }

  function deposit(id){ openDeposit(id); }

  function openDeposit(id){
    var d = (STATE.fundDefs||[]).filter(function(x){ return x.id===id; })[0];
    if (!d) return;
    var coins = STATE.coins||0;
    if (coins <= 0){ toast("金币不够，先去签到或打卡赚一点"); return; }
    ensureDepStyle();

    var ov = document.createElement("div");
    ov.className = "g-dep-ov";
    ov.innerHTML =
      '<div class="g-dep">' +
        '<h3>往【'+esc(d.name)+'】存金币</h3>' +
        '<div class="sub">当前余额 🪙'+coins+'　目标 '+d.goal+'</div>' +
        '<div class="chips">' +
          '<button type="button" class="chip" data-a="20">20</button>' +
          '<button type="button" class="chip" data-a="50">50</button>' +
          '<button type="button" class="chip" data-a="100">100</button>' +
          '<button type="button" class="chip" data-a="'+coins+'">全部</button>' +
        '</div>' +
        '<input id="gDepAmt" type="number" inputmode="numeric" min="1" max="'+coins+'" placeholder="输入要存的金币数">' +
        '<input id="gDepNote" type="text" maxlength="20" placeholder="给这个愿望留句话（可留空）">' +
        '<div class="row">' +
          '<button type="button" class="cancel" id="gDepCancel">再想想</button>' +
          '<button type="button" class="ok" id="gDepOk">存入</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(ov);

    var amt = $("#gDepAmt", ov), note = $("#gDepNote", ov);
    amt.value = Math.min(20, coins);

    function close(){ if (ov.parentNode) ov.parentNode.removeChild(ov); }
    Array.prototype.forEach.call(ov.querySelectorAll(".chip"), function(c){
      c.onclick = function(){
        Array.prototype.forEach.call(ov.querySelectorAll(".chip"), function(x){ x.classList.remove("on"); });
        c.classList.add("on");
        amt.value = c.getAttribute("data-a");
      };
    });
    $("#gDepCancel", ov).onclick = close;
    ov.onclick = function(e){ if (e.target === ov) close(); };
    $("#gDepOk", ov).onclick = function(){ doDeposit(id, amt.value, note.value, this, close); };
    setTimeout(function(){ try { amt.focus(); } catch(e){} }, 60);
  }

  function doDeposit(id, rawAmt, rawNote, btn, close){
    var amount = parseInt(rawAmt, 10);
    if (!amount || amount <= 0){ toast("要存一个大于 0 的数哦"); return; }
    var coins = STATE.coins||0;
    if (amount > coins){ toast("金币不够，先去签到或打卡赚一点"); return; }
    if (btn) btn.disabled = true;
    api("/api/fund/deposit", { method:"POST", body:JSON.stringify({ fundId:id, amount:amount, note:String(rawNote||"").slice(0,20) }) }).then(function(r){
      var j = r.json||{};
      if (!r.ok){ toast(j.error || "存入失败（"+r.status+"）"); if (btn) btn.disabled=false; return; }
      STATE.coins = j.coins; STATE.funds = j.funds;
      (j.unlocked||[]).forEach(function(u){ if (!(STATE.stories||[]).some(function(x){return x.id===u.id;})) STATE.stories.push(u); });
      if (close) close();
      renderHead(); renderTabs(); refreshChat();
      var lines2 = (j.replies||[]).slice();
      showReact(lines2, j.unlocked||[], (j.unlocked && j.unlocked.length) ? null : ("已存入 " + amount + " · " + taName() + " 也补存了 " + (j.match||0)));
    }).catch(function(){ toast("网络开小差了"); if (btn) btn.disabled=false; });
  }

  /* ---------- 反应弹窗 ---------- */
  function showReact(lines, unlocked, title){
    var ov = $("#gReactOv");
    if (!ov){
      ov = document.createElement("div"); ov.id="gReactOv"; ov.className="g-react-ov";
      ov.innerHTML = '<div class="g-react"><img class="ra" id="gRAva" alt=""><div class="rname" id="gRName"></div><div id="gRContent"></div><button type="button" id="gROk">好</button></div>';
      document.body.appendChild(ov);
      $("#gROk", ov).onclick = function(){ ov.classList.remove("show"); };
      ov.onclick = function(e){ if (e.target===ov) ov.classList.remove("show"); };
    }
    var av = taAvatar(); var img = $("#gRAva",ov);
    if (av){ img.src=av; img.style.display="block"; } else { img.style.display="none"; }
    $("#gRName",ov).textContent = taName();
    var html = "";
    if (title) html += '<div class="rstory-tag">'+esc(title)+'</div>';
    (unlocked||[]).forEach(function(u){ if (!title) html += '<div class="rstory-tag">解锁剧情 · '+esc(u.title)+'</div>'; });
    (lines&&lines.length?lines:["……"]).forEach(function(ln){ html += '<div class="rline">'+esc(ln)+'</div>'; });
    $("#gRContent",ov).innerHTML = html;
    ov.classList.add("show");
  }

  /* ---------- 启动 ---------- */
  function boot(){ injectEntries(); }
  // 更多页已整块交给 Vue（Step 4），mount() 会重建 #tab-more 的内容。
  // 本文件是同步脚本、靠 DOMContentLoaded 注入，刚好晚于 Vue 的 defer 挂载才没被清掉 ——
  // 但这只是碰巧，不能依赖。补一个挂载完成监听：Vue 每次重建后都能把入口补回来。
  // injectEntries() 自带幂等（#giftShopEntry 已存在就直接返回）。
  // 纯 legacy 部署没有 Vue，这个事件永不触发，零副作用。
  document.addEventListener("vue:mounted", boot);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();

  function openEgg(){
    var modal = document.createElement("div");
    modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;";
    modal.innerHTML = '<div style="max-width:440px;width:100%;background:#fff;border-radius:18px;padding:26px;max-height:80vh;overflow:auto;">' +
      '<div style="font-size:18px;font-weight:600;margin-bottom:14px;">💌 作者的碎碎念</div>' +
      '<div style="font-size:14px;line-height:1.9;color:#333;">' +
      '谢谢各位宝宝的喜欢！特别感谢 大白、羊羊、⭐🐟，谢谢你们陪我走到这里 ♡<br><br>' +
      '本作品纯属为爱发电，如果做得不好好请大家原谅哦（鞠躬）<br><br>' +
      '嘿嘿嘿其实本来想做一坨送给亲友的（眼睛移动），但是发现有好多宝宝都想蹲一蹲，于是就把一坨送给亲友、大家的认真再做一做。<br><br>' +
      '如果后续有时间，或许会出大家呼声比较高的 611/75 宇宙。嗯嗯感觉我可以做一个论坛，大家一起评论这样！<br><br>' +
      '哦哦哦不可以骂亲妈和搞腐噢。祝大家天天开心！！=3=<br><br>' +
      '有什么 bug 可以在小红书告诉我噢！' +
      '</div>' +
      '<button id="eggOk" type="button" style="margin-top:18px;width:100%;padding:11px;border:none;border-radius:12px;background:#e8a0b4;color:#fff;font-size:14px;">读完啦 · 领 100 金币</button>' +
      '</div>';
    document.body.appendChild(modal);
    modal.querySelector("#eggOk").onclick = function(){
      modal.remove();
      fetch("/api/gift/egg", {method:"POST"}).then(r=>r.json()).then(function(j){
        if (j.ok){ toast("彩蛋 +100 金币 ♡ 谢谢喜欢"); STATE.coins=j.coins; renderHead(); }
        else if (j.already){ toast("谢谢你的喜欢，已经领过啦"); }
      }).catch(function(){});
    };
  }
