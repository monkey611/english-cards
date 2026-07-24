// 种子随机（线性同余）：保证同一天种子产生相同题目
function seededRandom(seed) {
  let s = 0;
  for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) >>> 0;
  if (s === 0) s = 1;
  return function () {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// 构建题库池：{ words:[{themeId,en,zh,emoji,phonetic}], sentences:[{themeId,en,zh,emoji}] }
function buildQuestionPool() {
  const words = [];
  const sentences = [];
  THEMES.forEach(theme => {
    if (VOCAB_THEME_IDS.indexOf(theme.id) >= 0) {
      theme.items.forEach(item => {
        if (item.en && item.zh) {
          words.push({
            themeId: theme.id,
            en: item.en,
            zh: item.zh,
            emoji: item.emoji || '',
            phonetic: item.phonetic || getPhonetic(item.en)
          });
        }
      });
    } else if (SENTENCE_THEME_IDS.indexOf(theme.id) >= 0) {
      // phrases 主题：en 即英文短句、zh 即中文意思（其 sentence/sentenceZh 字段为空）
      theme.items.forEach(item => {
        if (item.en && item.zh) {
          sentences.push({
            themeId: theme.id,
            en: item.en,
            zh: item.zh,
            emoji: item.emoji || '',
            phonetic: ''
          });
        }
      });
    }
  });
  return { words: words, sentences: sentences };
}

// 用随机函数从数组不重复抽取 n 个
function pickN(arr, n, rand) {
  const pool = arr.slice();
  const out = [];
  while (pool.length && out.length < n) {
    const idx = Math.floor(rand() * pool.length);
    out.push(pool.splice(idx, 1)[0]);
  }
  return out;
}

// 生成选项：返回打乱的 zh 字符串数组（含正确答案）
function makeOptions(correctZh, allCandidates, rand, count) {
  const opts = [correctZh];
  const seen = {}; seen[correctZh] = true;
  const uniquePool = [];
  allCandidates.forEach(c => {
    const zh = c.zh;
    if (zh && !seen[zh]) { seen[zh] = true; uniquePool.push(zh); }
  });
  const distractors = pickN(uniquePool, count - 1, rand);
  distractors.forEach(zh => opts.push(zh));
  // Fisher–Yates 打乱
  for (let i = opts.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = opts[i]; opts[i] = opts[j]; opts[j] = tmp;
  }
  return opts;
}

// 生成当日 15 题（选择8 + 拼词4 + 听力3）
// 词汇10 = 选择4 + 拼词4 + 听力2；句子5 = 选择4 + 听力1
function generateDailyQuestions(seedStr) {
  const seed = seedStr || getToday();
  const rand = seededRandom(seed);
  const pool = buildQuestionPool();
  const p = loadProgress();

  // 词汇：未掌握优先（70%），不足则从已掌握补
  const unmastered = pool.words.filter(w => !p.masteredWords[w.en]);
  const mastered = pool.words.filter(w => p.masteredWords[w.en]);
  const wordTarget = Math.min(DAILY_WORD_COUNT, pool.words.length);
  const unmasteredTarget = Math.round(wordTarget * 0.7);
  let wordsPicked = pickN(unmastered, unmasteredTarget, rand);
  if (wordsPicked.length < wordTarget) {
    const remaining = unmastered.filter(w => wordsPicked.indexOf(w) < 0);
    wordsPicked = wordsPicked.concat(pickN(remaining, wordTarget - wordsPicked.length, rand));
  }
  if (wordsPicked.length < wordTarget) {
    const masteredPool = mastered.filter(w => wordsPicked.indexOf(w) < 0);
    wordsPicked = wordsPicked.concat(pickN(masteredPool, wordTarget - wordsPicked.length, rand));
  }

  // 句子：随机抽 5
  const sentTarget = Math.min(DAILY_SENT_COUNT, pool.sentences.length);
  const sentencesPicked = pickN(pool.sentences, sentTarget, rand);

  const questions = [];

  // 词汇选择题 ×4
  wordsPicked.slice(0, 4).forEach(w => {
    questions.push({ type: 'choice', kind: 'word', item: w, options: makeOptions(w.zh, pool.words, rand, 4), answer: w.zh });
  });
  // 词汇拼词 ×4
  wordsPicked.slice(4, 8).forEach(w => {
    questions.push({ type: 'spell', kind: 'word', item: w, answer: w.en });
  });
  // 词汇听力 ×2
  wordsPicked.slice(8, 10).forEach(w => {
    questions.push({ type: 'listen', kind: 'word', item: w, options: makeOptions(w.zh, pool.words, rand, 4), answer: w.zh });
  });
  // 句子选择题 ×4
  sentencesPicked.slice(0, 4).forEach(s => {
    questions.push({ type: 'choice', kind: 'sentence', item: s, options: makeOptions(s.zh, pool.sentences, rand, 4), answer: s.zh });
  });
  // 句子听力 ×1
  sentencesPicked.slice(4, 5).forEach(s => {
    questions.push({ type: 'listen', kind: 'sentence', item: s, options: makeOptions(s.zh, pool.sentences, rand, 4), answer: s.zh });
  });

  // 打乱题目顺序（题型分布不变）
  for (let i = questions.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = questions[i]; questions[i] = questions[j]; questions[j] = tmp;
  }
  return questions;
}

// 反查：根据 en 找到 THEMES 中完整 item（用于"已掌握词汇列表"）
function findWordItemByEn(en) {
  for (let i = 0; i < THEMES.length; i++) {
    const t = THEMES[i];
    if (VOCAB_THEME_IDS.indexOf(t.id) < 0) continue;
    for (let j = 0; j < t.items.length; j++) {
      if (t.items[j].en === en) return { themeId: t.id, themeName: t.name, item: t.items[j] };
    }
  }
  return null;
}

