// ========== 我的页 ==========
let profileCalMonth = null; // {year, month} month 为 0-based

function statCard(num, lbl, icon) {
  return '<div class="pf-stat"><div class="num">' + (icon ? icon + ' ' : '') + num + '</div><div class="lbl">' + lbl + '</div></div>';
}

function renderProfileHome() {
  const p = loadProgress();
  const pool = buildQuestionPool();
  const totalVocab = pool.words.length;
  // 已掌握词汇按当前级别统计（与闯关题库/目录保持一致）
  const level = getVocabLevel();
  const masteredCount = pool.words.filter(function (w) { return isMastered(w.en); }).length;
  const todayDone = isTodayDone();
  const todayRec = getTodayRecord();
  let html = '';
  // 级别提示
  html += '<div class="pf-level-banner">📚 当前词库：' + esc(levelName(level)) + '级 · 共 ' + totalVocab + ' 词</div>';
  // 统计
  html += '<div class="pf-section"><div class="pf-section-title">📊 学习统计</div><div class="pf-stats">';
  html += statCard(p.totalStars, '累计星星', '⭐');
  html += statCard(masteredCount + '/' + totalVocab, '已掌握词汇', '📚');
  html += statCard(p.streak.current, '连续打卡', '🔥');
  html += statCard(p.streak.longest, '最长连击', '🏅');
  if (todayDone && todayRec) {
    const attempts = todayRec.attemptCount || 1;
    html += statCard(attempts + '次', '今日闯关', '✅');
  } else {
    html += statCard('未完成', '今日闯关', '⭕');
  }
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
// 音质模式提示文案：高清模式百度TTS不支持音色/方言切换，需告知用户
function voiceQualityHint() {
  const stt = loadSettings();
  if (stt.voiceQuality === 'hd') {
    return '高清模式：用百度TTS朗读，音色自然，但男声/女声、普通话/粤语设置在此模式下不生效。预生成内容离线秒播，其他内容需联网。';
  }
  return '标准模式：用系统语音合成，离线即时，支持音色/方言切换。音色偏机械时可切回高清。';
}

function renderSettings() {
  const stt = loadSettings();
  // 语音引擎诊断（安卓 WebView voices 为空时引导用户）
  let engineH = '';
  const status = (typeof speechEngineStatus === 'function') ? speechEngineStatus() : null;
  if (status) {
    const dot = status.available ? '🟢' : '🔴';
    let info = dot + ' 语音引擎：' + status.voiceCount + ' 个';
    if (status.zhCount || status.enCount) info += '（中文 ' + status.zhCount + ' / 英文 ' + status.enCount + '）';
    engineH = '<div class="pf-setting-row col"><div class="pf-setting-hint">' + esc(info) + '</div>';
    if (status.hint) engineH += '<div class="pf-setting-hint">⚠️ ' + esc(status.hint) + '</div>';
    if (status.zhVoices && status.zhVoices.length) {
      engineH += '<div class="pf-setting-hint">🎧 中文语音：' + esc(status.zhVoices.join('、')) + '</div>';
    }
    // 播放模式提示（高清/标准两种模式都告知走哪种音频）
    const mode = (typeof currentPlayMode === 'function') ? currentPlayMode() : 'native';
    const modeLabels = {
      'hd-local': '高清模式：预生成音频（离线·自然）',
      'hd-remote': '高清模式：在线百度TTS（需联网）',
      'hd-native-fallback': '高清模式：原生TTS兜底（预生成+在线均失败）',
      'native': '标准模式：原生语音合成',
      'unavailable': '无可播放音源，请检查网络'
    };
    const modeText = modeLabels[mode] || ('标准模式：原生语音合成');
    engineH += '<div class="pf-setting-hint">🔊 当前播放模式：' + esc(modeText) + '</div>';
    engineH += '</div>';
  }
  let h = engineH;
  // 语音音质（高清百度TTS / 标准系统TTS）
  h += '<div class="pf-setting-row">';
  h += '<div class="pf-setting-label"><span>🎵 语音音质</span></div>';
  h += '<div class="pf-seg" data-key="voiceQuality">';
  h += '<button type="button" class="pf-seg-btn' + (stt.voiceQuality !== 'standard' ? ' active' : '') + '" data-val="hd">高清</button>';
  h += '<button type="button" class="pf-seg-btn' + (stt.voiceQuality === 'standard' ? ' active' : '') + '" data-val="standard">标准</button>';
  h += '</div>';
  h += '</div>';
  h += '<div class="pf-setting-hint" id="voiceQualityHint">' + esc(voiceQualityHint()) + '</div>';
  h += '<div class="pf-setting-row col">';
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
  // 方言可用性提示（设备无对应语音引擎时告知用户）
  const zhHint = (typeof zhDialectHint === 'function') ? zhDialectHint() : '';
  if (zhHint) {
    h += '<div class="pf-setting-hint">⚠️ ' + esc(zhHint) + '</div>';
  }
  // 语音引擎列表（让用户看到设备实际有哪些中文 voice，避免误以为代码限制）
  let zhVoices = [];
  try { zhVoices = (window.speechSynthesis.getVoices() || []).filter(function (v) { return (v.lang || '').toLowerCase().indexOf('zh') === 0; }); } catch (e) {}
  if (zhVoices.length) {
    const list = zhVoices.map(function (v) { return v.name + ' (' + v.lang + ')'; }).join('、');
    h += '<div class="pf-setting-hint">🎧 设备可用中文语音：' + esc(list) + '</div>';
  } else {
    h += '<div class="pf-setting-hint">🎧 设备暂无中文语音引擎，请安装系统中文语音包</div>';
  }
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
  // 音质 / 音色 / 方言分段控件
  profileContent.querySelectorAll('.pf-seg').forEach(function (seg) {
    const key = seg.dataset.key;
    seg.querySelectorAll('.pf-seg-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const stt = loadSettings();
        stt[key] = btn.dataset.val;
        saveSettings();
        seg.querySelectorAll('.pf-seg-btn').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        // 音质切换：刷新提示文案 + 刷新诊断卡片播放模式 + 试听
        if (key === 'voiceQuality') {
          const hintEl = document.getElementById('voiceQualityHint');
          if (hintEl) hintEl.textContent = voiceQualityHint();
          // 重新渲染设置区以刷新"当前播放模式"诊断
          setTimeout(function () { renderProfileHome(); }, 100);
          if (stt.soundOn) playText('Hello, this is a voice test.', 'en-US');
          return;
        }
        // 试听：用较长的句子让音色/方言差异更易感知
        if (stt.soundOn) {
          if (key === 'zhDialect') {
            // 按当前选择的方言路由：粤语→zh-HK，普通话→zh-CN
            const zh = stt.zhDialect === 'cantonese' ? 'zh-HK' : 'zh-CN';
            playText(stt.zhDialect === 'cantonese' ? '你好，今日天晴，我哋一齐去玩啦。' : '你好，今天天气真好，我们一起去玩吧。', zh);
            // 方言可能无对应 voice：切换后重渲染设置区，让"可用性提示"和"设备语音列表"刷新
            const support = (typeof zhDialectSupport === 'function') ? zhDialectSupport() : null;
            if (support && support.fallback) {
              // 稍延迟提示，避免与试听语音重叠
              setTimeout(function () {
                const msg = stt.zhDialect === 'cantonese' ? '当前设备无粤语语音引擎，刚才听到的是普通话兜底发音。如需粤语，请在系统添加粤语语音。' : '当前设备无普通话语音引擎，刚才听到的是相近语音。';
                alert(msg);
                // 重新渲染设置区，刷新提示文案与语音列表
                renderProfileHome();
              }, 1200);
            }
          } else {
            playText('Hello, how are you today? Let us learn English.', 'en-US');
          }
        } else {
          // 音效关闭时也刷新提示（用户看不到试听，更需要文字提示）
          if (key === 'zhDialect') {
            setTimeout(function () { renderProfileHome(); }, 50);
          }
        }
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
