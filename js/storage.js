// ========== 数据层（localStorage + 词汇抽取）==========
const STORAGE_KEY = 'ec_progress';
// 词汇题库主题（排除 phonetics 音标 / dialogue / stories / listening 长内容）
const VOCAB_THEME_IDS = ['pronouns','time','emotions','places','animals','fruits','vegetables','colors','numbers','toys','clothes','home','transport','food','body','weather','actions','shapes','opposites','jobs'];
// 句子题库主题
const SENTENCE_THEME_IDS = ['phrases'];
// 每日题数与题型分配
const DAILY_WORD_COUNT = 10;
const DAILY_SENT_COUNT = 5;

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

// 完成当日闯关：更新 daily / streak / totalStars；返回 {alreadyDone, streak, newTrophies}
function markTodayDone(result) {
  const p = loadProgress();
  const today = getToday();
  if (p.daily[today] && p.daily[today].completed) {
    return { alreadyDone: true, streak: p.streak, newTrophies: [] };
  }
  p.daily[today] = Object.assign({ completed: true, questionSeed: today }, result);
  // 连续打卡判定
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
  return { alreadyDone: false, streak: p.streak, newTrophies: newTrophies };
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
  // 全对：存在某天 correct===total
  const anyAllCorrect = Object.keys(p.daily).some(k => p.daily[k] && p.daily[k].total && p.daily[k].correct === p.daily[k].total);
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

