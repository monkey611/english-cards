// ========== 口语练习页（人机对话 + 语音识别 + 字幕）==========
// 场景对话脚本：bot 用 TTS 朗读，user 行用 SpeechRecognition 识别并评分
const SPEAKING_SCENARIOS = [
  {
    id: 'greeting', title: '打招呼', icon: '👋', desc: '见面问好', level: 'starter',
    lines: [
      { side: 'bot', en: 'Hi! How are you today?', zh: '嗨！你今天好吗？' },
      { side: 'user', en: "I'm fine, thank you.", zh: '我很好，谢谢。', hint: '回答你很好并道谢', accept: ["i'm fine", 'i am fine', 'fine thank', 'im fine', 'very well'] },
      { side: 'bot', en: 'Nice to meet you!', zh: '很高兴认识你！' },
      { side: 'user', en: 'Nice to meet you too.', zh: '我也很高兴认识你。', hint: '说“我也很高兴认识你”', accept: ['nice to meet you too', 'nice to meet you', 'you too'] },
      { side: 'bot', en: 'Goodbye! See you tomorrow.', zh: '再见！明天见。' },
      { side: 'user', en: 'See you tomorrow!', zh: '明天见！', hint: '说“明天见”', accept: ['see you tomorrow', 'see you', 'tomorrow'] }
    ]
  },
  {
    id: 'introduction', title: '自我介绍', icon: '🙋', desc: '名字与年龄', level: 'starter',
    lines: [
      { side: 'bot', en: 'Hello! What is your name?', zh: '你好！你叫什么名字？' },
      { side: 'user', en: 'My name is Tom.', zh: '我的名字叫汤姆。', hint: '说“我的名字叫…”', accept: ['my name is', "i'm", 'i am', 'im ', 'name is'] },
      { side: 'bot', en: 'How old are you?', zh: '你几岁了？' },
      { side: 'user', en: 'I am seven years old.', zh: '我七岁了。', hint: '说“我…岁了”', accept: ['years old', 'year old', 'i am', "i'm"] },
      { side: 'bot', en: 'Great! Welcome to our class.', zh: '太棒了！欢迎来到我们班。' },
      { side: 'user', en: 'Thank you!', zh: '谢谢！', hint: '说“谢谢”', accept: ['thank you', 'thanks', 'thank'] }
    ]
  },
  {
    id: 'family', title: '我的家庭', icon: '👨‍👩‍👧', desc: '谈论家人', level: 'starter',
    lines: [
      { side: 'bot', en: 'Do you have any brothers or sisters?', zh: '你有兄弟姐妹吗？' },
      { side: 'user', en: 'Yes, I have a sister.', zh: '是的，我有一个姐姐。', hint: '回答有兄弟姐妹', accept: ['i have a', 'i have', 'a sister', 'a brother', 'yes'] },
      { side: 'bot', en: 'What does your father do?', zh: '你爸爸做什么工作？' },
      { side: 'user', en: 'My father is a teacher.', zh: '我爸爸是老师。', hint: '说“爸爸是…”', accept: ['my father', 'father is', 'is a teacher', 'is a', 'my dad'] },
      { side: 'bot', en: 'Do you love your family?', zh: '你爱你的家人吗？' },
      { side: 'user', en: 'Yes, I love my family.', zh: '是的，我爱我的家人。', hint: '说“我爱我的家人”', accept: ['i love my family', 'i love', 'love my', 'yes'] }
    ]
  },
  {
    id: 'food', title: '喜欢食物', icon: '🍎', desc: '谈论喜好', level: 'starter',
    lines: [
      { side: 'bot', en: 'Do you like apples?', zh: '你喜欢苹果吗？' },
      { side: 'user', en: 'Yes, I like apples.', zh: '是的，我喜欢苹果。', hint: '说“我喜欢苹果”', accept: ['i like apples', 'i like', 'like apples', 'yes'] },
      { side: 'bot', en: 'What is your favorite food?', zh: '你最喜欢的食物是什么？' },
      { side: 'user', en: 'My favorite food is rice.', zh: '我最喜欢的食物是米饭。', hint: '说“我最喜欢…”', accept: ['my favorite food', 'favorite food', 'favorite is', 'i like'] },
      { side: 'bot', en: 'Can you eat with chopsticks?', zh: '你会用筷子吃饭吗？' },
      { side: 'user', en: 'Yes, I can.', zh: '是的，我会。', hint: '说“我会”', accept: ['yes i can', 'i can', 'yes'] }
    ]
  },
  {
    id: 'school', title: '学校生活', icon: '🏫', desc: '谈论学校', level: 'primary',
    lines: [
      { side: 'bot', en: 'What is your favorite subject?', zh: '你最喜欢的科目是什么？' },
      { side: 'user', en: 'My favorite subject is English.', zh: '我最喜欢的科目是英语。', hint: '说“我最喜欢的科目是…”', accept: ['my favorite subject', 'favorite subject', 'english', 'i like'] },
      { side: 'bot', en: 'Why do you like it?', zh: '你为什么喜欢它？' },
      { side: 'user', en: 'Because it is interesting.', zh: '因为它很有趣。', hint: '说“因为它…”', accept: ['because it is', 'because', 'it is interesting', 'interesting'] },
      { side: 'bot', en: 'What time do you go to school?', zh: '你几点去上学？' },
      { side: 'user', en: 'I go to school at seven.', zh: '我七点去上学。', hint: '说“我…点去上学”', accept: ['i go to school', 'go to school', 'at seven', 'at 7'] }
    ]
  },
  {
    id: 'weather', title: '谈论天气', icon: '☀️', desc: '日常天气', level: 'primary',
    lines: [
      { side: 'bot', en: 'How is the weather today?', zh: '今天天气怎么样？' },
      { side: 'user', en: 'It is sunny today.', zh: '今天是晴天。', hint: '说“今天是晴天/雨天”', accept: ['it is sunny', 'sunny', 'it is rainy', 'rainy', 'cloudy', 'it is'] },
      { side: 'bot', en: 'Do you like rainy days?', zh: '你喜欢下雨天吗？' },
      { side: 'user', en: 'No, I do not like rain.', zh: '不，我不喜欢下雨。', hint: '说“喜欢/不喜欢”', accept: ['i do not like', "i don't like", 'i like', 'no', 'yes'] },
      { side: 'bot', en: 'What do you do on sunny days?', zh: '晴天你会做什么？' },
      { side: 'user', en: 'I play outside.', zh: '我在外面玩。', hint: '说“我…”', accept: ['i play', 'play outside', 'i go', 'outside'] }
    ]
  },
  {
    id: 'hobby', title: '兴趣爱好', icon: '⚽', desc: '运动与爱好', level: 'primary',
    lines: [
      { side: 'bot', en: 'What do you like to do?', zh: '你喜欢做什么？' },
      { side: 'user', en: 'I like playing football.', zh: '我喜欢踢足球。', hint: '说“我喜欢…”', accept: ['i like playing', 'i like', 'playing football', 'football'] },
      { side: 'bot', en: 'How often do you play?', zh: '你多久玩一次？' },
      { side: 'user', en: 'I play every day.', zh: '我每天都玩。', hint: '说“我每天/每周”', accept: ['every day', 'everyday', 'i play', 'once a week', 'every week'] },
      { side: 'bot', en: 'Can you swim?', zh: '你会游泳吗？' },
      { side: 'user', en: 'Yes, I can swim well.', zh: '是的，我游得很好。', hint: '说“我会游泳”', accept: ['i can swim', 'yes i can', 'i can', 'yes'] }
    ]
  },
  {
    id: 'travel', title: '旅行计划', icon: '✈️', desc: '出行与计划', level: 'middle',
    lines: [
      { side: 'bot', en: 'Where are you going this summer?', zh: '今年夏天你去哪里？' },
      { side: 'user', en: 'I am going to Beijing.', zh: '我要去北京。', hint: '说“我要去…”', accept: ['i am going to', "i'm going to", 'going to beijing', 'im going to', 'to beijing'] },
      { side: 'bot', en: 'How will you get there?', zh: '你怎么去那里？' },
      { side: 'user', en: 'I will go by train.', zh: '我坐火车去。', hint: '说“我坐…去”', accept: ['by train', 'by plane', 'by car', 'i will go', 'by bus'] },
      { side: 'bot', en: 'What do you want to see there?', zh: '你想在那里看什么？' },
      { side: 'user', en: 'I want to see the Great Wall.', zh: '我想看长城。', hint: '说“我想看…”', accept: ['i want to see', 'want to see', 'i want to', 'great wall', 'i want'] }
    ]
  },
  {
    id: 'future', title: '未来梦想', icon: '🌟', desc: '理想与未来', level: 'middle',
    lines: [
      { side: 'bot', en: 'What do you want to be in the future?', zh: '你将来想成为什么？' },
      { side: 'user', en: 'I want to be a doctor.', zh: '我想成为一名医生。', hint: '说“我想成为…”', accept: ['i want to be', 'want to be', 'a doctor', 'a teacher', 'i want'] },
      { side: 'bot', en: 'Why do you want to be a doctor?', zh: '你为什么想当医生？' },
      { side: 'user', en: 'Because I want to help people.', zh: '因为我想帮助别人。', hint: '说“因为我想…”', accept: ['because i want', 'because', 'help people', 'i want to help'] },
      { side: 'bot', en: 'How will you achieve your dream?', zh: '你将如何实现你的梦想？' },
      { side: 'user', en: 'I will study hard.', zh: '我会努力学习。', hint: '说“我会…”', accept: ['i will study', 'study hard', 'i will', 'work hard'] }
    ]
  }
];

let _spkState = null; // { scenario, idx, recognized:0, total:0, rec }

// 浏览器是否支持语音识别
function speechRecognitionSupported() {
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

// 当前环境是否为安全上下文（SpeechRecognition 仅在 HTTPS 或 localhost 下可用）
function isSecureContextForSR() {
  // window.isSecureContext 是浏览器原生判断（HTTPS 或 localhost 返回 true）
  return (typeof window !== 'undefined' && window.isSecureContext === true) ||
    location.protocol === 'https:' ||
    location.hostname === 'localhost' ||
    location.hostname === '127.0.0.';
}

// 渲染口语练习首页（场景列表）
function renderSpeakingHome() {
  const supported = speechRecognitionSupported();
  const secure = isSecureContextForSR();
  let html = '<div class="spk-title">🎤 口语练习</div>';
  // 环境提示：不支持识别 / 非安全上下文（service-not-allowed 根因）
  if (!supported) {
    html += '<div class="spk-warn">⚠️ 当前浏览器不支持语音识别，仍可点场景练习跟读（不会评分）。</div>';
  } else if (!secure) {
    html += '<div class="spk-warn">⚠️ 语音识别需 HTTPS 或本地访问。当前是非安全上下文，按说话可能报 service-not-allowed。建议通过 HTTPS 域名访问。</div>';
  } else {
    html += '<div class="spk-sub">选一个场景，和 AI 对话练口语 ✨</div>';
  }
  html += '<div class="spk-grid">';
  const doneSet = loadSpeakingProgress();
  SPEAKING_SCENARIOS.forEach(function (sc, i) {
    const done = doneSet[sc.id];
    html += '<div class="spk-scenario-card' + (done ? ' done' : '') + '" data-sc="' + i + '">';
    html += '<span class="sc-icon">' + sc.icon + '</span>';
    html += '<div class="sc-title">' + esc(sc.title) + '</div>';
    html += '<div class="sc-desc">' + esc(sc.desc) + '</div>';
    html += '<span class="sc-lv">' + esc(levelName(sc.level)) + '</span>';
    if (done) html += ' <span class="sc-lv" style="background:var(--green);color:#fff">⭐' + done + '</span>';
    html += '</div>';
  });
  html += '</div>';
  speakingContent.innerHTML = html;
  speakingContent.querySelectorAll('.spk-scenario-card').forEach(function (card) {
    card.addEventListener('click', function () {
      const i = parseInt(card.dataset.sc);
      openScenario(SPEAKING_SCENARIOS[i]);
    });
  });
}

// 口语练习进度（按场景记录最佳星数）
const SPEAKING_KEY = 'ec_speaking';
function loadSpeakingProgress() {
  try { return JSON.parse(localStorage.getItem(SPEAKING_KEY)) || {}; } catch (e) { return {}; }
}
function saveSpeakingScore(scenarioId, stars) {
  const all = loadSpeakingProgress();
  if (!all[scenarioId] || stars > all[scenarioId]) {
    all[scenarioId] = stars;
    try { localStorage.setItem(SPEAKING_KEY, JSON.stringify(all)); } catch (e) {}
  }
}

// 打开场景对话
function openScenario(scenario) {
  _spkState = { scenario: scenario, idx: 0, recognized: 0, total: 0, rec: null, finished: false };
  // 统计需要用户回答的行数
  scenario.lines.forEach(function (l) { if (l.side === 'user') _spkState.total++; });

  let html = '<div class="spk-chat-wrap active" id="spkChatWrap">';
  html += '<div class="spk-chat-head">';
  html += '<button class="spk-chat-back" id="spkBack">← 返回</button>';
  html += '<div class="spk-chat-title">' + esc(scenario.icon) + ' ' + esc(scenario.title) + '</div>';
  html += '<div class="spk-chat-progress" id="spkProgress">0/' + _spkState.total + '</div>';
  html += '</div>';
  html += '<div class="spk-chat" id="spkChat"></div>';
  html += '<div class="spk-interim" id="spkInterim"></div>';
  html += '<div class="spk-hint" id="spkHint"></div>';
  html += '<div class="spk-input">';
  html += '<button class="spk-mic-btn" id="spkMic" disabled>🎤 准备中</button>';
  html += '<button class="spk-skip-btn" id="spkSkip" style="display:none">跳过</button>';
  html += '</div>';
  html += '</div>';
  speakingContent.innerHTML = html;
  document.getElementById('spkBack').addEventListener('click', closeScenario);
  document.getElementById('spkMic').addEventListener('click', onMicClick);
  document.getElementById('spkSkip').addEventListener('click', skipUserLine);
  // 开始第一句
  setTimeout(function () { playLine(0); }, 350);
}

function closeScenario() {
  try { window.speechSynthesis.cancel(); } catch (e) {}
  if (_spkState && _spkState.rec) { try { _spkState.rec.stop(); } catch (e) {} }
  _spkState = null;
  renderSpeakingHome();
}

// 播放某一行：bot 用 TTS 朗读，user 则等待用户录音
function playLine(idx) {
  if (!_spkState || idx >= _spkState.scenario.lines.length) { finishScenario(); return; }
  _spkState.idx = idx;
  const line = _spkState.scenario.lines[idx];
  if (line.side === 'bot') {
    appendBubble('bot', line.en, line.zh);
    speakBotLine(line.en, function () {
      // bot 说完，进入下一行
      setTimeout(function () { playLine(idx + 1); }, 400);
    });
    setMicState(false, '…');
    setHint('');
    hideSkip();
  } else {
    // 等待用户录音
    setMicState(true, '🎤 按一下说话');
    setHint('提示：' + (line.hint || ''));
    showSkip();
  }
}

function speakBotLine(text, onend) {
  const stt = loadSettings();
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.rate = stt.speechRate;
    u.pitch = speechPitch();
    u.volume = 1.0;
    applyVoice(u, 'en-US');
    // 高亮当前 bot 气泡
    const bubbles = document.querySelectorAll('#spkChat .spk-bubble.bot');
    const last = bubbles[bubbles.length - 1];
    if (last) last.classList.add('speaking');
    safeSpeak(u, function () {
      if (last) last.classList.remove('speaking');
      if (onend) onend();
    }, function () {
      if (last) last.classList.remove('speaking');
      if (onend) onend();
    });
  } catch (e) { if (onend) onend(); }
}

function appendBubble(side, en, zh, extraClass) {
  const chat = document.getElementById('spkChat');
  if (!chat) return;
  const div = document.createElement('div');
  div.className = 'spk-bubble ' + side + (extraClass ? ' ' + extraClass : '');
  const tag = side === 'bot' ? '🤖 AI' : '🙋 你';
  div.innerHTML = '<div class="b-tag">' + tag + '</div><div class="b-en">' + esc(en) + '</div><div class="b-zh">' + esc(zh) + '</div>';
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

function setMicState(enabled, text) {
  const mic = document.getElementById('spkMic');
  if (!mic) return;
  mic.disabled = !enabled;
  mic.textContent = text;
  mic.classList.remove('recording');
}
function setHint(text) {
  const el = document.getElementById('spkHint');
  if (el) el.innerHTML = text ? '💡 ' + esc(text) : '';
}
function showSkip() { const el = document.getElementById('spkSkip'); if (el) el.style.display = ''; }
function hideSkip() { const el = document.getElementById('spkSkip'); if (el) el.style.display = 'none'; }
function updateProgress() {
  const el = document.getElementById('spkProgress');
  if (el && _spkState) el.textContent = _spkState.recognized + '/' + _spkState.total;
}

// 点击麦克风按钮
function onMicClick() {
  if (!_spkState) return;
  const idx = _spkState.idx;
  const line = _spkState.scenario.lines[idx];
  if (!line || line.side !== 'user') return;
  if (!speechRecognitionSupported()) {
    // 不支持识别：直接当作"已尝试"，显示参考答案
    appendBubble('user', line.en, line.zh, 'miss');
    _spkState.recognized++;
    updateProgress();
    playLine(idx + 1);
    return;
  }
  // 非安全上下文（http 非 localhost）：SpeechRecognition 会被拒绝，提示并走跟读模式
  if (!isSecureContextForSR()) {
    appendBubble('user', line.en, line.zh, 'miss');
    _spkState.recognized++;
    updateProgress();
    const interim = document.getElementById('spkInterim');
    if (interim) interim.innerHTML = '⚠️ 语音识别需 HTTPS 访问，当前已切换为跟读模式。<a href="' + esc(location.href) + '" target="_blank" style="color:var(--primary);text-decoration:underline">了解</a>';
    playLine(idx + 1);
    return;
  }
  startRecognition(line);
}

// 启动语音识别
function startRecognition(line) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const rec = new SR();
  rec.lang = 'en-US';
  rec.interimResults = true;
  rec.maxAlternatives = 3;
  _spkState.rec = rec;
  const mic = document.getElementById('spkMic');
  const interim = document.getElementById('spkInterim');
  if (mic) { mic.classList.add('recording'); mic.textContent = '🔴 听ing…再点结束'; }
  if (interim) interim.textContent = '';

  let finalTranscript = '';
  rec.onresult = function (e) {
    let interimText = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript;
      if (e.results[i].isFinal) finalTranscript += t;
      else interimText += t;
    }
    if (interim) interim.textContent = interimText ? '“' + interimText + '”' : '';
  };
  rec.onerror = function (e) {
    // 针对常见错误给明确提示，避免用户不知所措
    const err = e.error || '未知';
    let msg = '';
    if (err === 'service-not-allowed' || err === 'not-allowed') {
      msg = '🚫 麦克风权限被拒绝或非 HTTPS 环境。请：1) 允许浏览器麦克风权限；2) 通过 HTTPS 域名访问。已切换为跟读模式。';
      // 自动切换跟读模式（不计识别成功）
      appendBubble('user', line.en, line.zh, 'miss');
      _spkState.recognized++;
      updateProgress();
      const idx = _spkState.idx;
      setTimeout(function () { playLine(idx + 1); }, 1500);
    } else if (err === 'no-speech') {
      msg = '🤔 没有听到声音，请靠近麦克风再说一次。可点跳过。';
    } else if (err === 'audio-capture') {
      msg = '🎙️ 麦克风设备错误，请检查设备连接。可点跳过。';
    } else if (err === 'network') {
      msg = '🌐 网络错误，语音识别需联网。可点跳过。';
    } else {
      msg = '识别出错：' + err + '，可点跳过';
    }
    if (interim) interim.textContent = msg;
    resetMicAfterRecognition();
  };
  rec.onend = function () {
    if (interim) interim.textContent = '';
    scoreUserAnswer(finalTranscript, line);
  };
  try { rec.start(); } catch (e) {
    // 启动失败（如已在识别中）：恢复按钮，提示
    if (interim) interim.textContent = '启动识别失败：' + (e.message || '未知') + '，可点跳过';
    resetMicAfterRecognition();
  }
}

// 结束识别后恢复按钮状态
function resetMicAfterRecognition() {
  const mic = document.getElementById('spkMic');
  if (mic) { mic.classList.remove('recording'); mic.textContent = '🎤 按一下说话'; }
  _spkState.rec = null;
}

// 评分用户回答：检查是否包含 accept 中任一关键词
function scoreUserAnswer(transcript, line) {
  resetMicAfterRecognition();
  const text = (transcript || '').toLowerCase().replace(/[^a-z0-9\s']/g, ' ').replace(/\s+/g, ' ').trim();
  const matched = text && line.accept.some(function (kw) { return text.indexOf(kw) > -1; });
  const idx = _spkState.idx;
  if (matched) {
    appendBubble('user', transcript || line.en, line.zh);
    _spkState.recognized++;
    updateProgress();
    vibrate(30);
    setTimeout(function () { playLine(idx + 1); }, 500);
  } else {
    // 识别不匹配：显示用户说的内容（如有）+ 参考答案
    const shown = transcript ? transcript : '(未识别)';
    appendBubble('user', shown, '参考：' + line.en, 'miss');
    if (transcript) _spkState.recognized++; // 有说但不对，也算尝试过
    updateProgress();
    vibrate([40, 30, 40]);
    setTimeout(function () { playLine(idx + 1); }, 1400);
  }
}

// 跳过当前用户行
function skipUserLine() {
  if (!_spkState) return;
  if (_spkState.rec) { try { _spkState.rec.stop(); } catch (e) {} _spkState.rec = null; }
  const idx = _spkState.idx;
  const line = _spkState.scenario.lines[idx];
  if (line && line.side === 'user') {
    appendBubble('user', '(跳过)', '参考：' + line.en, 'miss');
    updateProgress();
    playLine(idx + 1);
  }
}

// 完成场景：结算
function finishScenario() {
  if (!_spkState || _spkState.finished) return;
  _spkState.finished = true;
  const total = _spkState.total;
  const got = _spkState.recognized;
  const stars = total > 0 ? Math.max(1, Math.round((got / total) * 3)) : 1;
  saveSpeakingScore(_spkState.scenario.id, stars);
  let icon, title;
  const acc = total > 0 ? got / total : 0;
  if (acc >= 0.9) { icon = '🏆'; title = '太棒了！口语很流利！'; }
  else if (acc >= 0.6) { icon = '🌟'; title = '不错！继续练习！'; }
  else { icon = '💪'; title = '完成！多练几次更自信！'; }
  let html = '<div class="spk-result">';
  html += '<div class="spk-result-icon">' + icon + '</div>';
  html += '<div class="spk-result-title">' + title + '</div>';
  html += '<div class="spk-result-score">回答 ' + got + '/' + total + ' · ⭐' + stars + '</div>';
  html += '<button class="spk-result-btn" id="spkHome">返回场景列表</button>';
  html += '</div>';
  const chatWrap = document.getElementById('spkChatWrap');
  if (chatWrap) chatWrap.outerHTML = html;
  else speakingContent.innerHTML = html;
  document.getElementById('spkHome').addEventListener('click', function () { _spkState = null; renderSpeakingHome(); });
  showConfetti();
  setTimeout(showConfetti, 600);
}
