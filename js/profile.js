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
  // 打卡日历（包裹一层，便于切月局部刷新 C3）
  html += '<div class="pf-section"><div class="pf-section-title">📅 打卡日历</div>';
  html += '<div id="pfCalendarWrap">' + renderCalendar() + '</div>';
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
  // 设置（D4：语速 / 音效 / 振动）
  html += '<div class="pf-section"><div class="pf-section-title">⚙️ 设置</div>';
  html += renderSettings();
  html += '</div>';
  // 重置
  html += '<button class="pf-reset" id="pfReset">重置全部进度</button>';
  profileContent.innerHTML = html;
  // 绑定日历切月
  bindCalendarNav();
  // 词汇分组折叠
  profileContent.querySelectorAll('.pf-words-head').forEach(function (h) {
    h.addEventListener('click', function () { h.nextElementSibling.classList.toggle('open'); });
  });
  // 绑定设置控件
  bindSettings();
  // 重置进度：自定义长按确认弹窗（B1，替换原生 confirm）
  const rs = document.getElementById('pfReset');
  if (rs) rs.addEventListener('click', showResetModal);
}

// 绑定日历切月按钮
function bindCalendarNav() {
  const prevM = document.getElementById('calPrev');
  const nextM = document.getElementById('calNext');
  if (prevM) prevM.addEventListener('click', function () { shiftCalMonth(-1); });
  if (nextM) nextM.addEventListener('click', function () { shiftCalMonth(1); });
}

// ========== 设置 UI（D4：语速 / 音效 / 振动）==========
function renderSettings() {
  const stt = loadSettings();
  let h = '<div class="pf-setting-row col">';
  h += '<div class="pf-setting-label"><span>🐢 朗读语速</span><span class="pf-setting-val" id="setRateVal">' + stt.speechRate.toFixed(2) + 'x</span></div>';
  h += '<input type="range" class="pf-range" id="setRate" min="0.5" max="1.2" step="0.05" value="' + stt.speechRate + '">';
  h += '<div class="pf-range-marks"><span>慢</span><span>正常</span><span>快</span></div>';
  h += '</div>';
  h += '<div class="pf-setting-row">';
  h += '<div class="pf-setting-label"><span>🔊 音效朗读</span></div>';
  h += '<label class="pf-switch"><input type="checkbox" id="setSound" ' + (stt.soundOn ? 'checked' : '') + '><span class="pf-slider"></span></label>';
  h += '</div>';
  h += '<div class="pf-setting-row">';
  h += '<div class="pf-setting-label"><span>📳 振动反馈</span></div>';
  h += '<label class="pf-switch"><input type="checkbox" id="setVibrate" ' + (stt.vibrateOn ? 'checked' : '') + '><span class="pf-slider"></span></label>';
  h += '</div>';
  // 朗读音色（女声/男声）
  h += '<div class="pf-setting-row">';
  h += '<div class="pf-setting-label"><span>🗣️ 朗读音色</span></div>';
  h += '<div class="pf-seg" data-key="voiceGender">';
  h += '<button type="button" class="pf-seg-btn' + (stt.voiceGender !== 'male' ? ' active' : '') + '" data-val="female">女声</button>';
  h += '<button type="button" class="pf-seg-btn' + (stt.voiceGender === 'male' ? ' active' : '') + '" data-val="male">男声</button>';
  h += '</div>';
  h += '</div>';
  // 中文方言（普通话/粤语）
  h += '<div class="pf-setting-row">';
  h += '<div class="pf-setting-label"><span>🇨🇳 中文方言</span></div>';
  h += '<div class="pf-seg" data-key="zhDialect">';
  h += '<button type="button" class="pf-seg-btn' + (stt.zhDialect !== 'cantonese' ? ' active' : '') + '" data-val="mandarin">普通话</button>';
  h += '<button type="button" class="pf-seg-btn' + (stt.zhDialect === 'cantonese' ? ' active' : '') + '" data-val="cantonese">粤语</button>';
  h += '</div>';
  h += '</div>';
  return h;
}

function bindSettings() {
  const rateEl = document.getElementById('setRate');
  const rateVal = document.getElementById('setRateVal');
  if (rateEl) {
    rateEl.addEventListener('input', function () {
      const stt = loadSettings();
      stt.speechRate = parseFloat(rateEl.value);
      saveSettings();
      if (rateVal) rateVal.textContent = stt.speechRate.toFixed(2) + 'x';
    });
    // 松手时按当前语速试听
    rateEl.addEventListener('change', function () {
      const stt = loadSettings();
      if (stt.soundOn) playText('Hello', 'en-US');
    });
  }
  const soundEl = document.getElementById('setSound');
  if (soundEl) {
    soundEl.addEventListener('change', function () {
      const stt = loadSettings();
      stt.soundOn = soundEl.checked;
      saveSettings();
      if (stt.soundOn) playText('Hello', 'en-US');
    });
  }
  const vibrateEl = document.getElementById('setVibrate');
  if (vibrateEl) {
    vibrateEl.addEventListener('change', function () {
      const stt = loadSettings();
      stt.vibrateOn = vibrateEl.checked;
      saveSettings();
      if (stt.vibrateOn) vibrate(30);
    });
  }
  // 音色 / 方言分段控件
  profileContent.querySelectorAll('.pf-seg').forEach(function (seg) {
    const key = seg.dataset.key;
    seg.querySelectorAll('.pf-seg-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const stt = loadSettings();
        stt[key] = btn.dataset.val;
        saveSettings();
        seg.querySelectorAll('.pf-seg-btn').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        // 试听：方言切换试听中文，音色切换试听英文
        if (stt.soundOn) playText(key === 'zhDialect' ? '你好，你好' : 'Hello', key === 'zhDialect' ? 'zh-CN' : 'en-US');
      });
    });
  });
}

// ========== 自定义长按确认重置弹窗（B1）==========
function showResetModal() {
  if (document.getElementById('pfResetModal')) return;
  const overlay = document.createElement('div');
  overlay.className = 'pf-modal-overlay';
  overlay.id = 'pfResetModal';
  overlay.innerHTML =
    '<div class="pf-modal">' +
      '<div class="pf-modal-icon">⚠️</div>' +
      '<div class="pf-modal-title">重置全部进度？</div>' +
      '<div class="pf-modal-desc">将清空所有星星、打卡记录和已掌握词汇，且无法恢复。<br>请长按下方按钮确认。</div>' +
      '<button class="pf-modal-hold" id="pfHoldBtn"><span class="pf-hold-fill" id="pfHoldFill"></span><span class="pf-hold-text">长按 1.5 秒确认</span></button>' +
      '<button class="pf-modal-cancel" id="pfCancelBtn">取消</button>' +
    '</div>';
  document.body.appendChild(overlay);
  requestAnimationFrame(function () { overlay.classList.add('show'); });

  const holdBtn = document.getElementById('pfHoldBtn');
  const holdFill = document.getElementById('pfHoldFill');
  const holdText = holdBtn.querySelector('.pf-hold-text');
  let holdTimer = null;
  let done = false;
  const DURATION = 1500;

  function startHold(e) {
    if (e && e.cancelable) e.preventDefault();
    if (done) return;
    holdFill.style.transition = 'width ' + DURATION + 'ms linear';
    holdFill.style.width = '100%';
    holdText.textContent = '继续按住...';
    holdTimer = setTimeout(function () {
      done = true;
      resetProgress();
      closeModal();
      renderProfileHome();
    }, DURATION);
  }
  function cancelHold() {
    if (done) return;
    if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; }
    holdFill.style.transition = 'width 0.15s ease';
    holdFill.style.width = '0%';
    holdText.textContent = '长按 1.5 秒确认';
  }
  function closeModal() {
    if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; }
    overlay.classList.remove('show');
    setTimeout(function () { if (overlay.parentNode) overlay.remove(); }, 250);
  }

  holdBtn.addEventListener('mousedown', startHold);
  holdBtn.addEventListener('touchstart', startHold, { passive: false });
  holdBtn.addEventListener('mouseup', cancelHold);
  holdBtn.addEventListener('mouseleave', cancelHold);
  holdBtn.addEventListener('touchend', cancelHold);
  holdBtn.addEventListener('touchcancel', cancelHold);
  document.getElementById('pfCancelBtn').addEventListener('click', closeModal);
  overlay.addEventListener('click', function (e) { if (e.target === overlay) closeModal(); });
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

// 切月：局部刷新日历区域，保留滚动位置与折叠状态（C3）
function shiftCalMonth(delta) {
  let y = profileCalMonth.year, mo = profileCalMonth.month + delta;
  if (mo < 0) { mo = 11; y--; }
  if (mo > 11) { mo = 0; y++; }
  profileCalMonth = { year: y, month: mo };
  const wrap = document.getElementById('pfCalendarWrap');
  if (wrap) {
    wrap.innerHTML = renderCalendar();
    bindCalendarNav();
  } else {
    renderProfileHome();
  }
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
