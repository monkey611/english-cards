// ========== 朗读（修复版：方言感知 + 安卓兼容）==========
// 中文目标语言：按设置切换普通话(zh-CN)/粤语(zh-HK)
function zhTargetLang() {
  return loadSettings().zhDialect === 'cantonese' ? 'zh-HK' : 'zh-CN';
}

// 朗读音高：男声偏低、女声偏高。多数设备仅一个中文音色，音高是可感知差异的主要手段。
function speechPitch() {
  return loadSettings().voiceGender === 'male' ? 0.8 : 1.2;
}

// 为 utterance 设置语言(方言感知)与音色(性别匹配)
// - 始终设置 utterance.lang 为目标语言（粤语→zh-HK，让支持粤语的引擎自动路由）
// - 优先选择目标语种前缀匹配的 voice，再按性别关键词猜测
// - 同语系兜底（如粤语无专用 voice 时退回任意 zh voice）确保安卓也能发声
function applyVoice(utterance, baseLang) {
  const stt = loadSettings();
  let targetLang = baseLang || 'en-US';
  if (baseLang && baseLang.indexOf('zh') === 0) targetLang = zhTargetLang();
  utterance.lang = targetLang;

  let voices = [];
  try { voices = window.speechSynthesis.getVoices() || []; } catch (e) {}
  if (!voices.length) return;

  // 统一分隔符：voice.lang 可能是 'zh-CN' / 'zh_CN' / 'zh' 等多种格式
  const norm = function (s) { return String(s || '').toLowerCase().replace(/_/g, '-'); };
  const low = norm(targetLang);                          // 'zh-hk' / 'zh-cn' / 'en-us'
  const fam = low.split('-')[0];                         // 'zh' / 'en'

  // 1) 精确前缀匹配（统一分隔符后比较）
  let candidates = voices.filter(function (v) { return norm(v.lang).indexOf(low) === 0; });
  // 2) 粤语扩展匹配：yue / 名字含 cantonese/hk
  if (low === 'zh-hk' && !candidates.length) {
    candidates = voices.filter(function (v) {
      return /yue|zh-hk|cantonese|\bhk\b|hong\s*kong/i.test((v.lang || '') + ' ' + (v.name || ''));
    });
  }
  // 3) 同语系兜底（确保有候选 voice 可用，避免安卓无声）
  if (!candidates.length) {
    candidates = voices.filter(function (v) { return norm(v.lang).indexOf(fam) === 0; });
  }
  if (!candidates.length) return;

  // 性别关键词猜测（Web Speech API 无标准性别字段，靠 voice 名称）
  const femaleKw = ['female','woman','zira','samantha','victoria','karen','moira','tessa','fiona','aria','jenny','hazel','clara','sara','linda','heather','catherine','susan','allison','ava','zoe','emma','amy','serena','michelle','julia','huihui','yaoyao','xiaoxiao','xiaoyi','xiaochen','xiaohan','xiaomeng','xiaoqiu','xiaoshuang','xiaoyan','xiaorui','hiumaan','tracy','sinji','ting-ting','mei','yue'];
  const maleKw = ['male','man','david','mark','daniel','alex','fred','guy','eric','george','james','liam','ryan','tom','oliver','arthur','kangkang','yunyang','yunye','yunfeng','yunhao','yunjian','yunxia','yunze','danny','wanlung','shuo','kang'];
  const kw = stt.voiceGender === 'male' ? maleKw : femaleKw;
  let hit = null;
  for (let i = 0; i < kw.length; i++) {
    hit = candidates.find(function (v) { return (v.name || '').toLowerCase().indexOf(kw[i]) >= 0; });
    if (hit) break;
  }
  const v = hit || candidates[0];
  // 指定 voice（同语系即可，保证发声；引擎按 voice 自身 lang 发音）
  utterance.voice = v;
}

// 查询当前设备是否真正支持目标方言的专用 voice（用于给用户明确提示，避免静默兜底困惑）
// 返回: { supported: bool, voiceName: string|null, fallback: bool }
function zhDialectSupport() {
  let voices = [];
  try { voices = window.speechSynthesis.getVoices() || []; } catch (e) {}
  const dialect = loadSettings().zhDialect;
  const want = dialect === 'cantonese' ? 'zh-HK' : 'zh-CN';
  const norm = function (s) { return String(s || '').toLowerCase().replace(/_/g, '-'); };
  const low = norm(want);
  // 精确前缀匹配
  let hit = voices.filter(function (v) { return norm(v.lang).indexOf(low) === 0; })[0];
  if (hit) return { supported: true, voiceName: hit.name, fallback: false };
  // 粤语扩展匹配
  if (low === 'zh-hk') {
    hit = voices.filter(function (v) { return /yue|cantonese|\bhk\b|hong\s*kong/i.test((v.lang || '') + ' ' + (v.name || '')); })[0];
    if (hit) return { supported: true, voiceName: hit.name, fallback: false };
  }
  return { supported: false, voiceName: null, fallback: true };
}

// 中文方言可用性提示（用于设置页/朗读时告知用户当前方言是否真正可用）
// 返回提示文案；无问题时返回空串
function zhDialectHint() {
  const s = zhDialectSupport();
  if (s.supported) return '';
  const dialect = loadSettings().zhDialect;
  if (dialect === 'cantonese') return '当前设备无粤语语音引擎，将用普通话朗读。如需粤语，请在系统添加粤语语音或换设备。';
  return '当前设备无普通话语音引擎，将用相近语音朗读。';
}

// Android 兼容：cancel 后延后 100ms 再 speak，并立即 resume() 防止自动暂停
// （Android Chrome 已知问题：cancel 紧接 speak 会被吞掉；长文朗读中途会自动暂停）
function safeSpeak(utterance, onend, onerror) {
  try {
    window.speechSynthesis.cancel();
    setTimeout(function () {
      try {
        utterance.onend = onend || null;
        utterance.onerror = onerror || null;
        window.speechSynthesis.speak(utterance);
        try { window.speechSynthesis.resume(); } catch (e) {}
      } catch (e) {
        if (onerror) onerror(e);
        else if (onend) onend();
      }
    }, 100);
  } catch (e) {
    if (onerror) onerror(e);
    else if (onend) onend();
  }
}

function speak() {
  if (isSpeaking || !currentTheme) return;
  const stt = loadSettings();
  if (!stt.soundOn) return; // 音效关闭则不朗读

  isSpeaking = true;
  btnSpeak.classList.add('speaking');
  btnSpeak.innerHTML = '<span class="icon">🔊</span> 朗读中...';

  const item = currentTheme.items[currentIndex];
  // 用 id 前缀判断，适配各级别新增主题（dialogue-primary / stories-middle 等）
  var isDialogue = currentTheme.id.indexOf('dialogue') === 0;
  var isListening = currentTheme.id.indexOf('listening') === 0;
  var isStories = currentTheme.id.indexOf('stories') === 0;

  // 构建朗读序列（中文部分按方言设置确定 lang）
  const zh = zhTargetLang();
  const parts = [];

  if (isDialogue) {
    parts.push({ text: item.zh, lang: zh });
    parts.push({ text: item.en, lang: 'en-US' });
    parts.push({ text: item.sentenceZh, lang: zh });
    parts.push({ text: item.sentence, lang: 'en-US' });
  } else if (isListening) {
    // 听力练习：只朗读英文
    parts.push({ text: item.story, lang: 'en-US' });
  } else if (isStories) {
    // 寓言故事：只读英文故事
    if (item.story) parts.push({ text: item.story, lang: 'en-US' });
  } else {
    parts.push({ text: item.zh, lang: zh });
    parts.push({ text: item.en, lang: 'en-US' });
    if (item.sentence) {
      parts.push({ text: item.sentenceZh, lang: zh });
      parts.push({ text: item.sentence, lang: 'en-US' });
    }
  }

  let partIndex = 0;

  function speakNext() {
    if (partIndex >= parts.length) {
      finishSpeak();
      // 自动播放（听力模块自动播放逻辑不变）
      if (isAutoPlaying) {
        autoTimer = setTimeout(function () {
          if (currentIndex < currentTheme.items.length - 1) {
            goNext();
            if (isAutoPlaying) startAutoPlay();
          } else {
            stopAutoPlay();
          }
        }, 800);
      }
      return;
    }

    const part = parts[partIndex];
    try {
      const utterance = new SpeechSynthesisUtterance(part.text);
      utterance.rate = stt.speechRate;
      utterance.pitch = speechPitch();
      utterance.volume = 1.0;
      applyVoice(utterance, part.lang);

      safeSpeak(utterance, function () {
        partIndex++;
        setTimeout(speakNext, isDialogue ? 600 : 300);
      }, function () {
        partIndex++;
        setTimeout(speakNext, 200);
      });
    } catch (e) {
      partIndex++;
      setTimeout(speakNext, 100);
    }
  }

  speakNext();
}

function finishSpeak() {
  isSpeaking = false;
  btnSpeak.classList.remove('speaking');
  btnSpeak.innerHTML = '<span class="icon">🔊</span> 听一听';
}

// Android 防自动暂停：朗读中定期 resume()
setInterval(function () {
  try {
    if (window.speechSynthesis && window.speechSynthesis.speaking) window.speechSynthesis.resume();
  } catch (e) {}
}, 5000);
