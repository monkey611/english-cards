// ========== 数据层（localStorage + 词汇抽取）==========
const STORAGE_KEY = 'ec_progress';
// 词汇题库主题（排除 phonetics 音标 / dialogue / stories / listening 长内容）
// 含中学（ms-*）主题，按 level 分层使用
const VOCAB_THEME_IDS = ['pronouns','time','emotions','places','animals','fruits','vegetables','colors','numbers','toys','clothes','home','transport','food','body','weather','actions','shapes','opposites','jobs','family','school','nature','sports','insects','sea','birds','drinks','snacks','music','furniture','plants','adjectives','verbs2','tools','classroom','space','tableware','ms-verbs','ms-nouns-abstract','ms-subjects','ms-society','ms-technology','ms-emotions-adv','ms-adjectives','ms-adverbs','ms-nature-env','ms-health','ms-travel','ms-economy','ms-media','ms-jobs-adv','ms-time-events'];
// 句子题库主题（按 level 分层：phrases=启蒙 / phrases-primary=小学 / phrases-middle=中学）
const SENTENCE_THEME_IDS = ['phrases','phrases-primary','phrases-middle'];
// 每日题数与题型分配
const DAILY_WORD_COUNT = 10;
const DAILY_SENT_COUNT = 5;

// ========== 设置（语速 / 音效 / 振动 / 音色 / 中文方言 / 词汇级别）==========
const SETTINGS_KEY = 'ec_settings';
// 词汇级别：starter 启蒙 / primary 小学 / middle 中学（对标新课标）
const VOCAB_LEVELS = [
  { id: 'starter', name: '启蒙', icon: '🌱', desc: '字母音标 + 基础词汇' },
  { id: 'primary', name: '小学', icon: '📚', desc: '新课标小学词汇' },
  { id: 'middle', name: '中学', icon: '🎓', desc: '新课标中学词汇' }
];
function defaultSettings() {
  return { speechRate: 0.85, soundOn: true, vibrateOn: true, voiceGender: 'female', zhDialect: 'mandarin', vocabLevel: 'starter' };
}
function getVocabLevel() { return loadSettings().vocabLevel || 'starter'; }
function setVocabLevel(level) {
  const stt = loadSettings();
  stt.vocabLevel = level;
  saveSettings();
}
function levelName(level) {
  const m = VOCAB_LEVELS.find(function (v) { return v.id === level; });
  return m ? m.name : level;
}
let _settings = null;
function loadSettings() {
  if (_settings) return _settings;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    _settings = raw ? Object.assign(defaultSettings(), JSON.parse(raw)) : defaultSettings();
  } catch (e) { _settings = defaultSettings(); }
  return _settings;
}
function saveSettings() {
  if (!_settings) _settings = defaultSettings();
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(_settings)); } catch (e) {}
}

function defaultProgress() {
  return {
    version: 1,
    masteredWords: {},
    daily: {},
    streak: { current: 0, longest: 0, lastDate: '' },
    totalStars: 0,
    trophies: []
  };
}

let _progress = null;
function loadProgress() {
  if (_progress) return _progress;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      _progress = Object.assign(defaultProgress(), parsed);
      _progress.streak = Object.assign({ current: 0, longest: 0, lastDate: '' }, _progress.streak || {});
      _progress.masteredWords = _progress.masteredWords || {};
      _progress.daily = _progress.daily || {};
      _progress.trophies = _progress.trophies || [];
    } else {
      _progress = defaultProgress();
    }
  } catch (e) {
    _progress = defaultProgress();
  }
  return _progress;
}

function saveProgress() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(_progress)); } catch (e) {}
}

function resetProgress() {
  _progress = defaultProgress();
  saveProgress();
}

function getToday() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function dateAddDays(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function getYesterday() { return dateAddDays(getToday(), -1); }

function isMastered(en) {
  return !!loadProgress().masteredWords[en];
}

function addMastered(en) {
  const p = loadProgress();
  if (!p.masteredWords[en]) {
    p.masteredWords[en] = true;
    saveProgress();
  }
}

function isTodayDone() {
  const p = loadProgress();
  const t = getToday();
  return !!(p.daily[t] && p.daily[t].completed);
}

function getTodayRecord() {
  return loadProgress().daily[getToday()] || null;
}

// 今日已尝试次数（含首次，用于无限次闯关生成不同种子）
function getTodayAttemptCount() {
  const rec = getTodayRecord();
  if (!rec) return 0;
  return rec.attemptCount || 1;
}

// 取两份结果中较优者（星星多 / 正确数多）
function bestResult(a, b) {
  if (!a) return b;
  if (!b) return a;
  if ((b.stars || 0) !== (a.stars || 0)) return (b.stars || 0) > (a.stars || 0) ? b : a;
  return (b.correct || 0) > (a.correct || 0) ? b : a;
}

// 完成当日闯关：更新 daily / streak / totalStars；返回 {alreadyDone, isRetry, attemptCount, streak, newTrophies}
// 支持无限次重试：首次完成记 streak；重试时只刷新 attemptCount/best/lastAttempt 并累加星星，不重复计算打卡
function markTodayDone(result, opts) {
  const p = loadProgress();
  const today = getToday();
  const existing = p.daily[today];
  const isRetry = !!(existing && existing.completed);
  if (isRetry) {
    // 重试：更新尝试次数、最佳成绩、最近一次成绩
    existing.attemptCount = (existing.attemptCount || 1) + 1;
    existing.best = bestResult(existing.best, result);
    existing.lastAttempt = { stars: result.stars, correct: result.correct, total: result.total };
    p.totalStars += (result.stars || 0);
    const newTrophies = checkTrophies(p);
    saveProgress();
    return { alreadyDone: true, isRetry: true, attemptCount: existing.attemptCount, best: existing.best, streak: p.streak, newTrophies: newTrophies };
  }
  // 首次完成
  p.daily[today] = Object.assign({ completed: true, questionSeed: today, attemptCount: 1, best: result, lastAttempt: { stars: result.stars, correct: result.correct, total: result.total } }, result);
  // 连续打卡判定（仅首次）
  if (p.streak.lastDate === today) {
    // 同日重复（理论上已被拦截）
  } else if (p.streak.lastDate === getYesterday()) {
    p.streak.current += 1;
  } else {
    p.streak.current = 1;
  }
  p.streak.longest = Math.max(p.streak.longest, p.streak.current);
  p.streak.lastDate = today;
  p.totalStars += (result.stars || 0);
  const newTrophies = checkTrophies(p);
  saveProgress();
  return { alreadyDone: false, isRetry: false, attemptCount: 1, best: result, streak: p.streak, newTrophies: newTrophies };
}

// 奖杯判定：基于当前进度返回新增奖杯 id（并写入 p.trophies）
function checkTrophies(p) {
  const earned = p.trophies;
  const has = id => earned.indexOf(id) >= 0;
  const add = id => { if (!has(id)) { earned.push(id); newly.push(id); } };
  const newly = [];
  const masteredCount = Object.keys(p.masteredWords).length;
  // 首次完成（任意 daily.completed）
  const anyDone = Object.keys(p.daily).some(k => p.daily[k] && p.daily[k].completed);
  if (anyDone) add('first_complete');
  if (masteredCount >= 10) add('master_10');
  if (masteredCount >= 50) add('master_50');
  if (masteredCount >= 100) add('master_100');
  if (p.streak.current >= 3) add('streak_3');
  if (p.streak.current >= 7) add('streak_7');
  if (p.streak.current >= 15) add('streak_15');
  if (p.streak.current >= 30) add('streak_30');
  // 全对：某天首次全对，或重试中某次全对（best.correct===total）
  const anyAllCorrect = Object.keys(p.daily).some(k => {
    const d = p.daily[k];
    if (!d || !d.total) return false;
    if (d.correct === d.total) return true;
    if (d.best && d.best.correct === d.best.total) return true;
    if (d.lastAttempt && d.lastAttempt.correct === d.lastAttempt.total) return true;
    return false;
  });
  if (anyAllCorrect) add('all_correct');
  return newly;
}

// 奖杯元数据（图标/名称/条件文案）
const TROPHY_META = {
  first_complete: { icon: '🥇', name: '初次闯关', desc: '完成第一次闯关' },
  all_correct:    { icon: '💯', name: '全部答对', desc: '一次闯关全对' },
  master_10:      { icon: '🌱', name: '小小学者', desc: '掌握 10 个词' },
  master_50:      { icon: '📚', name: '词汇达人', desc: '掌握 50 个词' },
  master_100:     { icon: '🎓', name: '词汇大师', desc: '掌握 100 个词' },
  streak_3:       { icon: '🔥', name: '连击 3 天', desc: '连续打卡 3 天' },
  streak_7:       { icon: '🏆', name: '坚持一周', desc: '连续打卡 7 天' },
  streak_15:      { icon: '⭐', name: '半月之星', desc: '连续打卡 15 天' },
  streak_30:      { icon: '👑', name: '月度王者', desc: '连续打卡 30 天' }
};

