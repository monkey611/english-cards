// ========== 闯关游戏 ==========
let challengeState = null; // { questions, idx, correctCount, stars, answered, spell, wrong }

// HTML 转义
function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// 振动反馈（受设置控制）
function vibrate(pattern) {
  try {
    const stt = loadSettings();
    if (stt.vibrateOn && navigator.vibrate) navigator.vibrate(pattern);
  } catch (e) {}
}

// 中文→emoji 映射（给选择题选项加图标），懒加载缓存
let _zhEmojiMap = null;
function zhEmojiMap() {
  if (_zhEmojiMap) return _zhEmojiMap;
  _zhEmojiMap = {};
  try { buildQuestionPool().words.forEach(function (w) { if (w.emoji && !_zhEmojiMap[w.zh]) _zhEmojiMap[w.zh] = w.emoji; }); } catch (e) {}
  return _zhEmojiMap;
}

// 独立朗读（不依赖 currentTheme，供题目发音使用）
function playText(text, lang) {
  const stt = loadSettings();
  if (!stt.soundOn) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang || 'en-US';
    u.rate = stt.speechRate; u.pitch = speechPitch(); u.volume = 1.0;
    try {
      const v = selectVoice(lang || 'en-US');
      if (v) { u.voice = v; u.lang = v.lang; }
    } catch (e) {}
    window.speechSynthesis.speak(u);
  } catch (e) {}
}

// 闯关首页
function renderChallengeHome() {
  const p = loadProgress();
  const done = isTodayDone();
  const rec = getTodayRecord();
  let html = '<div class="ch-start">';
  if (done && rec) {
    html += '<div class="ch-done-icon">✅</div>';
    html += '<div class="ch-start-title">今日已完成！</div>';
    html += '<div class="ch-done-stats">⭐ ' + rec.stars + ' · 正确 ' + rec.correct + '/' + rec.total + ' · 🔥 ' + p.streak.current + ' 天</div>';
    html += '<div class="ch-done-tip">明天再来挑战吧 ✨</div>';
  } else {
    html += '<div class="ch-start-icon">🎮</div>';
    html += '<div class="ch-start-title">英语闯关</div>';
    html += '<div class="ch-start-sub">每日 15 题 · 选择 + 拼词 + 听力</div>';
    html += '<div class="ch-start-stats">';
    html += '<div>🔥 连续 ' + p.streak.current + ' 天</div>';
    html += '<div>⭐ 累计 ' + p.totalStars + '</div>';
    html += '</div>';
    html += '<button class="ch-start-btn" id="chStartBtn">开始闯关</button>';
  }
  html += '</div>';
  challengeContent.innerHTML = html;
  const btn = document.getElementById('chStartBtn');
  if (btn) btn.addEventListener('click', startChallenge);
}

function startChallenge() {
  const questions = generateDailyQuestions();
  challengeState = { questions: questions, idx: 0, correctCount: 0, stars: 0, answered: false, wrong: [] };
  renderQuestion(0);
}

function renderQuestion(idx) {
  const q = challengeState.questions[idx];
  challengeState.idx = idx;
  challengeState.answered = false;
  const total = challengeState.questions.length;
  const progressPct = (idx / total) * 100;
  let body = '<div class="ch-header">';
  body += '<button class="ch-exit" id="chExit" title="退出闯关">✕</button>';
  body += '<div class="ch-progress-bar"><div class="ch-progress-fill" style="width:' + progressPct + '%"></div></div>';
  body += '<div class="ch-meta">第 ' + (idx + 1) + '/' + total + ' 题 · <span class="star">⭐ ' + challengeState.stars + '</span></div>';
  body += '</div>';
  if (q.type === 'choice') body += renderChoice(q);
  else if (q.type === 'spell') body += renderSpell(q);
  else if (q.type === 'listen') body += renderListen(q);
  challengeContent.innerHTML = body;
  challengeContent.scrollTop = 0;
  const ex = document.getElementById('chExit');
  if (ex) ex.addEventListener('click', function () { window.speechSynthesis.cancel(); renderChallengeHome(); });
  if (q.type === 'choice') bindChoice(q);
  else if (q.type === 'spell') bindSpell(q);
  else if (q.type === 'listen') bindListen(q);
  // 选择/拼词题进入后自动发音（A1/D1）；听力题在 bindListen 内自动播放
  if (q.type !== 'listen') {
    setTimeout(function () { playText(q.item.en, 'en-US'); }, 450);
  }
}

function renderChoice(q) {
  const it = q.item;
  const emap = zhEmojiMap();
  let s = '<div class="q-card">';
  s += '<div class="q-emoji">' + (it.emoji || '💭') + '</div>';
  if (q.kind === 'sentence') {
    s += '<div class="q-en sentence">' + esc(it.en) + '</div>';
  } else {
    s += '<div class="q-en">' + esc(it.en) + (it.phonetic ? '<span class="q-phonetic">' + esc(it.phonetic) + '</span>' : '') + '</div>';
  }
  s += '<div class="q-prompt">选出正确的中文意思</div>';
  s += '<div class="q-options">';
  q.options.forEach(function (opt, i) {
    const em = emap[opt];
    s += '<button class="q-opt" data-i="' + i + '">' + (em ? '<span class="opt-emoji">' + em + '</span> ' : '') + esc(opt) + '</button>';
  });
  s += '</div></div>';
  return s;
}

function renderListen(q) {
  let s = '<div class="q-card">';
  s += '<button class="q-play" id="qPlay">🔊 点一点，听一听</button>';
  s += '<div class="q-prompt">选出听到的内容</div>';
  s += '<div class="q-options">';
  q.options.forEach(function (opt, i) { s += '<button class="q-opt" data-i="' + i + '">' + esc(opt) + '</button>'; });
  s += '</div></div>';
  return s;
}

function renderSpell(q) {
  const it = q.item;
  const answerLetters = it.en.split('').map(function (l) { return l.toUpperCase(); });
  // 干扰字母
  const allLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const usedSet = {};
  answerLetters.forEach(function (l) { usedSet[l] = true; });
  const rand2 = seededRandom(it.en + '|' + it.zh);
  const distract = [];
  const distractTarget = Math.min(3, 26 - answerLetters.length);
  while (distract.length < distractTarget) {
    const c = allLetters[Math.floor(rand2() * 26)];
    if (!usedSet[c]) { usedSet[c] = true; distract.push(c); }
  }
  const pool = answerLetters.concat(distract);
  // 打乱字母池
  const rand3 = seededRandom(it.en + '::shuffle');
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rand3() * (i + 1)); const t = pool[i]; pool[i] = pool[j]; pool[j] = t; }

  let s = '<div class="q-card">';
  s += '<div class="q-emoji">' + (it.emoji || '💭') + '</div>';
  s += '<div class="q-zh">' + esc(it.zh) + '</div>';
  s += '<div class="q-prompt">拼出对应的英文</div>';
  s += '<div class="spell-slots" id="spellSlots"></div>';
  s += '<div class="spell-letters" id="spellLetters">';
  pool.forEach(function (l, i) { s += '<button class="spell-letter" data-l="' + l + '" data-i="' + i + '">' + l + '</button>'; });
  s += '</div>';
  s += '<div class="spell-actions">';
  s += '<button class="spell-act" id="spellDel">⌫ 删除</button>';
  s += '<button class="spell-act" id="spellClear">清空</button>';
  s += '<button class="spell-act spell-submit" id="spellSubmit">提交</button>';
  s += '</div>';
  s += '</div>';
  challengeState.spell = { answer: it.en.toUpperCase(), pool: pool, filled: [], usedIdx: {} };
  return s;
}

function bindChoice(q) {
  const opts = challengeContent.querySelectorAll('.q-opt');
  opts.forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (challengeState.answered) return;
      challengeState.answered = true;
      const i = parseInt(btn.dataset.i);
      const correct = q.options[i] === q.answer;
      opts.forEach(function (o) { o.classList.add('disabled'); });
      opts.forEach(function (o, oi) { if (q.options[oi] === q.answer) o.classList.add('correct'); });
      if (!correct) btn.classList.add('wrong');
      handleAnswer(correct, q);
    });
  });
}

function bindListen(q) {
  const playBtn = document.getElementById('qPlay');
  function play() {
    playText(q.item.en, 'en-US');
    if (playBtn) { playBtn.classList.add('playing'); setTimeout(function () { playBtn.classList.remove('playing'); }, 1500); }
  }
  if (playBtn) playBtn.addEventListener('click', play);
  // 进入后自动播放一次（若被浏览器拦截，用户可点按钮）
  setTimeout(play, 450);
  const opts = challengeContent.querySelectorAll('.q-opt');
  opts.forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (challengeState.answered) return;
      challengeState.answered = true;
      const i = parseInt(btn.dataset.i);
      const correct = q.options[i] === q.answer;
      opts.forEach(function (o) { o.classList.add('disabled'); });
      opts.forEach(function (o, oi) { if (q.options[oi] === q.answer) o.classList.add('correct'); });
      if (!correct) btn.classList.add('wrong');
      handleAnswer(correct, q);
    });
  });
}

function bindSpell(q) {
  const st = challengeState.spell;
  const slotsEl = document.getElementById('spellSlots');
  const lettersEl = document.getElementById('spellLetters');
  function renderSlots() {
    let h = '';
    st.filled.forEach(function (f) { h += '<span class="spell-slot filled">' + f.l + '</span>'; });
    for (let i = st.filled.length; i < st.answer.length; i++) h += '<span class="spell-slot"></span>';
    slotsEl.innerHTML = h;
  }
  renderSlots();
  lettersEl.querySelectorAll('.spell-letter').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (challengeState.answered) return;
      if (st.filled.length >= st.answer.length) return;
      const i = parseInt(btn.dataset.i);
      if (st.usedIdx[i]) return;
      st.usedIdx[i] = true;
      btn.classList.add('used');
      st.filled.push({ l: btn.dataset.l, idx: i });
      renderSlots();
      // 填满自动提交
      if (st.filled.length === st.answer.length) {
        setTimeout(function () { if (!challengeState.answered) submitSpell(); }, 250);
      }
    });
  });
  function submitSpell() {
    if (challengeState.answered) return;
    if (st.filled.length < st.answer.length) return;
    challengeState.answered = true;
    const guess = st.filled.map(function (f) { return f.l; }).join('');
    const correct = guess === st.answer;
    if (!correct) {
      slotsEl.innerHTML = '<div class="spell-answer">' + esc(st.answer) + '</div><div class="spell-answer-tip">正确答案</div>';
    }
    handleAnswer(correct, q);
  }
  document.getElementById('spellDel').addEventListener('click', function () {
    if (challengeState.answered || st.filled.length === 0) return;
    const f = st.filled.pop();
    st.usedIdx[f.idx] = false;
    const btn = lettersEl.querySelector('.spell-letter[data-i="' + f.idx + '"]');
    if (btn) btn.classList.remove('used');
    renderSlots();
  });
  document.getElementById('spellClear').addEventListener('click', function () {
    if (challengeState.answered) return;
    st.filled.forEach(function (f) {
      st.usedIdx[f.idx] = false;
      const btn = lettersEl.querySelector('.spell-letter[data-i="' + f.idx + '"]');
      if (btn) btn.classList.remove('used');
    });
    st.filled = [];
    renderSlots();
  });
  document.getElementById('spellSubmit').addEventListener('click', submitSpell);
}

// 统一答题处理：反馈 + 里程碑 + 进入下一题/结算
function handleAnswer(correct, q) {
  const card = challengeContent.querySelector('.q-card');
  if (correct) {
    challengeState.correctCount++;
    challengeState.stars++;
    if (q.kind === 'word') addMastered(q.item.en);
    floatStar();
    spawnParticles();
    vibrate(30);
    if (card) { const fb = document.createElement('div'); fb.className = 'q-feedback good'; fb.textContent = '真棒！🎉'; card.appendChild(fb); }
    const nextIdx = challengeState.idx + 1;
    if (nextIdx === 5 || nextIdx === 10) setTimeout(milestonePop, 300);
  } else {
    // 答错：收集错词 + 朗读正确发音 + 鼓励（A2/D3）
    if (challengeState.wrong && !challengeState.wrong.some(function (w) { return w.en === q.item.en; })) {
      challengeState.wrong.push({ en: q.item.en, zh: q.item.zh, emoji: q.item.emoji || '💭' });
    }
    vibrate([40, 30, 40]);
    setTimeout(function () { playText(q.item.en, 'en-US'); }, 200);
    if (card) { const fb = document.createElement('div'); fb.className = 'q-feedback bad'; fb.innerHTML = '没关系，再听一次正确发音 👂'; card.appendChild(fb); }
  }
  // 答错停留更久，让孩子消化（B4）
  setTimeout(function () {
    if (challengeState.idx + 1 >= challengeState.questions.length) finishChallenge();
    else renderQuestion(challengeState.idx + 1);
  }, correct ? 1100 : 2200);
}

function floatStar() {
  const el = document.createElement('div');
  el.className = 'float-star';
  el.textContent = '⭐ +1';
  document.body.appendChild(el);
  setTimeout(function () { el.remove(); }, 1000);
}

function milestonePop() {
  const el = document.createElement('div');
  el.className = 'milestone-pop';
  el.innerHTML = '<div class="ms-icon">🏆</div><div class="ms-text">真棒！继续加油！</div>';
  document.body.appendChild(el);
  showConfetti();
  setTimeout(function () { el.remove(); }, 1600);
}

function finishChallenge() {
  const total = challengeState.questions.length;
  const correct = challengeState.correctCount;
  const stars = challengeState.stars;
  const result = { stars: stars, correct: correct, total: total };
  const done = markTodayDone(result);
  const acc = total > 0 ? correct / total : 0;
  // 结算文案按表现分级（A3）
  let icon, title;
  if (acc >= 1) { icon = '🏆'; title = '全部答对！太厉害了！'; }
  else if (acc >= 0.8) { icon = '🌟'; title = '闯关成功！表现很棒！'; }
  else if (acc >= 0.5) { icon = '😊'; title = '闯关完成！继续加油！'; }
  else { icon = '💪'; title = '闯关完成！下次会更好！'; }
  let html = '<div class="ch-result">';
  html += '<div class="ch-result-icon">' + icon + '</div>';
  html += '<div class="ch-result-title">' + title + '</div>';
  html += '<div class="ch-result-stars">⭐ × ' + stars + '</div>';
  html += '<div class="ch-result-acc">正确率 ' + Math.round(acc * 100) + '%（' + correct + '/' + total + '）</div>';
  html += '<div class="ch-result-streak">🔥 连续打卡 ' + done.streak.current + ' 天</div>';
  if (done.newTrophies && done.newTrophies.length) {
    let tHtml = '';
    done.newTrophies.forEach(function (tid) { const m = TROPHY_META[tid]; if (m) tHtml += '<span class="new-trophy">' + m.icon + ' ' + esc(m.name) + '</span>'; });
    html += '<div class="ch-result-trophies">🎉 新成就：<br>' + tHtml + '</div>';
  }
  // 错词复习区（D3）
  if (challengeState.wrong && challengeState.wrong.length) {
    html += '<div class="ch-review"><div class="ch-review-title">📖 复习错词（' + challengeState.wrong.length + '）</div><div class="ch-review-list">';
    challengeState.wrong.forEach(function (w) {
      html += '<div class="ch-review-item"><span class="ri-emoji">' + (w.emoji || '💭') + '</span><span class="ri-en">' + esc(w.en) + '</span><span class="ri-zh">' + esc(w.zh) + '</span><button class="ri-play" data-en="' + esc(w.en) + '">🔊</button></div>';
    });
    html += '</div></div>';
  }
  html += '<button class="ch-result-btn" id="chResultBtn">查看我的进度</button>';
  html += '</div>';
  challengeContent.innerHTML = html;
  showConfetti();
  setTimeout(showConfetti, 600);
  challengeContent.querySelectorAll('.ri-play').forEach(function (b) {
    b.addEventListener('click', function () { playText(b.dataset.en, 'en-US'); });
  });
  const btn = document.getElementById('chResultBtn');
  if (btn) btn.addEventListener('click', function () { switchTab('profile'); });
}
