// ========== 闯关游戏 ==========
let challengeState = null; // { questions, idx, correctCount, stars, answered, spell }

// HTML 转义
function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// 独立朗读（不依赖 currentTheme，供听力题使用）
function playText(text, lang) {
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang || 'en-US';
    u.rate = 0.85; u.pitch = 1.1; u.volume = 1.0;
    try {
      const voices = window.speechSynthesis.getVoices();
      const prefix = (lang && lang.indexOf('zh') === 0) ? 'zh' : 'en';
      const v = voices.find(function (vx) { return vx.lang.indexOf(prefix) === 0; });
      if (v) u.voice = v;
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
  challengeState = { questions: questions, idx: 0, correctCount: 0, stars: 0, answered: false };
  renderQuestion(0);
}

function renderQuestion(idx) {
  const q = challengeState.questions[idx];
  challengeState.idx = idx;
  challengeState.answered = false;
  const total = challengeState.questions.length;
  const progressPct = (idx / total) * 100;
  let body = '<div class="ch-header">';
  body += '<div class="ch-progress-bar"><div class="ch-progress-fill" style="width:' + progressPct + '%"></div></div>';
  body += '<div class="ch-meta">第 ' + (idx + 1) + '/' + total + ' 题 · <span class="star">⭐ ' + challengeState.stars + '</span></div>';
  body += '</div>';
  if (q.type === 'choice') body += renderChoice(q);
  else if (q.type === 'spell') body += renderSpell(q);
  else if (q.type === 'listen') body += renderListen(q);
  challengeContent.innerHTML = body;
  challengeContent.scrollTop = 0;
  if (q.type === 'choice') bindChoice(q);
  else if (q.type === 'spell') bindSpell(q);
  else if (q.type === 'listen') bindListen(q);
}

function renderChoice(q) {
  const it = q.item;
  let s = '<div class="q-card">';
  s += '<div class="q-emoji">' + (it.emoji || '💭') + '</div>';
  if (q.kind === 'sentence') {
    s += '<div class="q-en sentence">' + esc(it.en) + '</div>';
  } else {
    s += '<div class="q-en">' + esc(it.en) + (it.phonetic ? '<span class="q-phonetic">' + esc(it.phonetic) + '</span>' : '') + '</div>';
  }
  s += '<div class="q-prompt">选出正确的中文意思</div>';
  s += '<div class="q-options">';
  q.options.forEach(function (opt, i) { s += '<button class="q-opt" data-i="' + i + '">' + esc(opt) + '</button>'; });
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
      slotsEl.innerHTML = '<div style="color:var(--accent);font-weight:800;font-size:22px">' + esc(st.answer) + '</div><div style="font-size:13px;color:var(--text-light);margin-top:4px">正确答案</div>';
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
  if (correct) {
    challengeState.correctCount++;
    challengeState.stars++;
    if (q.kind === 'word') addMastered(q.item.en);
    floatStar();
    spawnParticles();
    const nextIdx = challengeState.idx + 1;
    if (nextIdx === 5 || nextIdx === 10) setTimeout(milestonePop, 300);
  }
  setTimeout(function () {
    if (challengeState.idx + 1 >= challengeState.questions.length) finishChallenge();
    else renderQuestion(challengeState.idx + 1);
  }, correct ? 1100 : 1500);
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
  let html = '<div class="ch-result">';
  html += '<div class="ch-result-icon">🏆</div>';
  html += '<div class="ch-result-title">闯关成功！</div>';
  html += '<div class="ch-result-stars">⭐ × ' + stars + '</div>';
  html += '<div class="ch-result-acc">正确率 ' + Math.round(correct / total * 100) + '%（' + correct + '/' + total + '）</div>';
  html += '<div class="ch-result-streak">🔥 连续打卡 ' + done.streak.current + ' 天</div>';
  if (done.newTrophies && done.newTrophies.length) {
    let tHtml = '';
    done.newTrophies.forEach(function (tid) { const m = TROPHY_META[tid]; if (m) tHtml += '<span class="new-trophy">' + m.icon + ' ' + esc(m.name) + '</span>'; });
    html += '<div class="ch-result-trophies">🎉 新成就：<br>' + tHtml + '</div>';
  }
  html += '<button class="ch-result-btn" id="chResultBtn">查看我的进度</button>';
  html += '</div>';
  challengeContent.innerHTML = html;
  showConfetti();
  setTimeout(showConfetti, 600);
  const btn = document.getElementById('chResultBtn');
  if (btn) btn.addEventListener('click', function () { switchTab('profile'); });
}

