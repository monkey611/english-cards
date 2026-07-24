// ========== 我的页 ==========
let profileCalMonth = null; // {year, month} month 为 0-based

function statCard(num, lbl, icon) {
  return '<div class="pf-stat"><div class="num">' + (icon ? icon + ' ' : '') + num + '</div><div class="lbl">' + lbl + '</div></div>';
}

function renderProfileHome() {
  const p = loadProgress();
  const pool = buildQuestionPool();
  const totalVocab = pool.words.length;
  const masteredCount = Object.keys(p.masteredWords).length;
  const todayDone = isTodayDone();
  let html = '';
  // 统计
  html += '<div class="pf-section"><div class="pf-section-title">📊 学习统计</div><div class="pf-stats">';
  html += statCard(p.totalStars, '累计星星', '⭐');
  html += statCard(masteredCount + '/' + totalVocab, '已掌握词汇', '📚');
  html += statCard(p.streak.current, '连续打卡', '🔥');
  html += statCard(p.streak.longest, '最长连击', '🏅');
  html += statCard(todayDone ? '已完成' : '未完成', '今日闯关', todayDone ? '✅' : '⭕');
  html += '</div></div>';
  // 打卡日历
  html += '<div class="pf-section"><div class="pf-section-title">📅 打卡日历</div>';
  html += renderCalendar();
  html += '</div>';
  // 成就墙
  html += '<div class="pf-section"><div class="pf-section-title">🏆 成就墙</div><div class="pf-trophies">';
  Object.keys(TROPHY_META).forEach(function (tid) {
    const m = TROPHY_META[tid];
    const lit = p.trophies.indexOf(tid) >= 0;
    html += '<div class="pf-trophy' + (lit ? ' lit' : '') + '"><div class="t-icon">' + m.icon + '</div><div class="t-name">' + esc(m.name) + '</div><div class="t-desc">' + esc(m.desc) + '</div></div>';
  });
  html += '</div></div>';
  // 已掌握词汇
  html += '<div class="pf-section"><div class="pf-section-title">📖 已掌握词汇（' + masteredCount + '）</div>';
  html += renderMasteredWords(p);
  html += '</div>';
  // 重置
  html += '<button class="pf-reset" id="pfReset">重置全部进度</button>';
  profileContent.innerHTML = html;
  // 绑定日历切月
  const prevM = document.getElementById('calPrev');
  const nextM = document.getElementById('calNext');
  if (prevM) prevM.addEventListener('click', function () { shiftCalMonth(-1); });
  if (nextM) nextM.addEventListener('click', function () { shiftCalMonth(1); });
  // 词汇分组折叠
  profileContent.querySelectorAll('.pf-words-head').forEach(function (h) {
    h.addEventListener('click', function () { h.nextElementSibling.classList.toggle('open'); });
  });
  // 重置进度
  const rs = document.getElementById('pfReset');
  if (rs) rs.addEventListener('click', function () {
    if (confirm('确定要重置全部进度吗？将清空所有星星、打卡记录和已掌握词汇，且无法恢复。')) {
      resetProgress();
      renderProfileHome();
    }
  });
}

function renderCalendar() {
  if (!profileCalMonth) {
    const d = new Date();
    profileCalMonth = { year: d.getFullYear(), month: d.getMonth() };
  }
  const y = profileCalMonth.year, mo = profileCalMonth.month;
  const p = loadProgress();
  const today = getToday();
  const startDow = new Date(y, mo, 1).getDay();
  const daysInMonth = new Date(y, mo + 1, 0).getDate();
  const dows = ['日', '一', '二', '三', '四', '五', '六'];
  let h = '<div class="pf-cal-head">';
  h += '<button class="pf-cal-nav" id="calPrev">◀</button>';
  h += '<div class="pf-cal-month">' + y + '年' + (mo + 1) + '月</div>';
  h += '<button class="pf-cal-nav" id="calNext">▶</button>';
  h += '</div><div class="pf-cal-grid">';
  dows.forEach(function (d) { h += '<div class="pf-cal-dow">' + d + '</div>'; });
  for (let i = 0; i < startDow; i++) h += '<div class="pf-cal-day empty"></div>';
  for (let day = 1; day <= daysInMonth; day++) {
    const ds = y + '-' + String(mo + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
    const done = !!(p.daily[ds] && p.daily[ds].completed);
    const isToday = ds === today;
    h += '<div class="pf-cal-day' + (done ? ' done' : '') + (isToday ? ' today' : '') + '">' + day + (done ? '<div class="dot"></div>' : '') + '</div>';
  }
  h += '</div>';
  return h;
}

function shiftCalMonth(delta) {
  let y = profileCalMonth.year, mo = profileCalMonth.month + delta;
  if (mo < 0) { mo = 11; y--; }
  if (mo > 11) { mo = 0; y++; }
  profileCalMonth = { year: y, month: mo };
  renderProfileHome();
}

function renderMasteredWords(p) {
  const keys = Object.keys(p.masteredWords);
  if (keys.length === 0) return '<div class="pf-empty">还没有掌握的词汇，去闯关赢取吧！🎮</div>';
  const groups = {};
  const order = [];
  keys.forEach(function (en) {
    const found = findWordItemByEn(en);
    if (found) {
      if (!groups[found.themeId]) { groups[found.themeId] = { name: found.themeName, items: [] }; order.push(found.themeId); }
      groups[found.themeId].items.push(found.item);
    }
  });
  let h = '';
  order.forEach(function (tid) {
    const g = groups[tid];
    h += '<div class="pf-words-group">';
    h += '<div class="pf-words-head"><span>' + esc(g.name) + '</span><span class="cnt">' + g.items.length + ' 词</span></div>';
    h += '<div class="pf-words-body">';
    g.items.forEach(function (it) {
      h += '<div class="pf-word"><span class="e">' + (it.emoji ? it.emoji + ' ' : '') + esc(it.en) + '</span><span class="z">' + esc(it.zh) + '</span></div>';
    });
    h += '</div></div>';
  });
  return h;
}

