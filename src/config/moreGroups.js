// 「更多」页的二级入口分组
// 来源：legacy index.html 4124–4156（2 组 5 项）
//
// Step 4 起真正用于渲染（MorePanel.vue）。
// 注意 legacy 的命名是反直觉的，别按字面去"修正"：
//   moreContactBtn → 打开的是**免责声明**（showDisclaimer）
//   moreAboutBtn   → 打开的是**联系作者**（showContact）
// id 必须保留：legacy 的事件委托按 id 认人。
//
// 图标此前写错过一轮（设置用了 check、常见问题用了 book、免责声明用了 mail），
// 已按原 SVG 逐个核对改回 gear / info / infoUp。

export const MORE_GROUPS = [
  {
    group: "功能",
    items: [
      // gotab：点了直接切 tab，由 legacy 的 [data-gotab] 委托处理
      { key: "us", label: "我们", icon: "users", gotab: "us" },
      { key: "music", label: "一起听", icon: "headphone", gotab: "music" },
    ],
  },
  {
    group: "通用",
    items: [
      { key: "settings", label: "设置", icon: "gear", id: "moreSettingsBtn" },
      { key: "about", label: "常见问题", icon: "info", id: "moreAboutBtn" },
      { key: "contact", label: "免责声明", icon: "infoUp", id: "moreContactBtn" },
      // 存储体检：消息发完刷新就没 / 礼物送不出 / 打卡没反应 / 换头像主题一刷新
      // 回原样，八成是 localStorage 被撑爆后写入被静默丢掉。这里给个能自救的入口。
      // subId：legacy 的 refreshStorageSub() 会把「已用约 xxKB」写进这个 span。
      { key: "storage", label: "存储空间", icon: "database", id: "moreStorageBtn", subId: "moreStorageSub" },
    ],
  },
];
