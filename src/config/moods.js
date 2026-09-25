// 心情表情 5 连 —— 日记表单（#diaryMoods）和打卡（#moodRow）用的是同一组。
// 来源：legacy index.html 4108–4112 / 4186–4190
//
// ⚠️ 顺序不能动：legacy 用 data-mood 取值，且打卡初始化时按 dataset.mood 比对来决定高亮哪一个。
// ⚠️ 只存 emoji 本身，不存 label —— 两处的 DOM 结构不一样（见 MoodPicker.vue 的 variant）。

export const MOODS = ["😊", "🥰", "😌", "😢", "😴"];

// 打卡没选心情时的兜底值，和 legacy index.html 6142 保持一致
export const DEFAULT_MOOD = "😊";
