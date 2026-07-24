// ========== 朗读（修复版）==========
// 根据语言、设置(音色男/女 + 中文方言普通话/粤语)挑选最合适的 voice
function selectVoice(lang) {
  const stt = loadSettings();
  let voices = [];
  try { voices = window.speechSynthesis.getVoices() || []; } catch (e) {}
  if (!voices.length) return null;
  // 确定目标语言前缀：中文按方言切换，粤语用 zh-HK，普通话用 zh-CN
  let prefix;
  if (lang && lang.indexOf('zh') === 0) {
    prefix = stt.zhDialect === 'cantonese' ? 'zh-hk' : 'zh-cn';
  } else {
    prefix = 'en';
  }
  // 按前缀筛选候选
  let candidates = voices.filter(function (v) { return v.lang && v.lang.toLowerCase().indexOf(prefix) === 0; });
  // 粤语兜底：zh-HK 无，尝试 yue 或名字含 cantonese/hk
  if (prefix === 'zh-hk' && !candidates.length) {
    candidates = voices.filter(function (v) {
      const l = (v.lang || '').toLowerCase();
      return l.indexOf('yue') === 0 || l.indexOf('zh-hk') === 0 || /cantonese|hk|hong\s*kong/i.test(v.name || '');
    });
  }
  // 普通话兜底：zh-CN 无，用任意 zh
  if (prefix === 'zh-cn' && !candidates.length) {
    candidates = voices.filter(function (v) { return (v.lang || '').toLowerCase().indexOf('zh') === 0; });
  }
  // 英文兜底
  if (prefix === 'en' && !candidates.length) {
    candidates = voices.filter(function (v) { return (v.lang || '').toLowerCase().indexOf('en') === 0; });
  }
  if (!candidates.length) return null;
  // 性别筛选：通过 voice 名称关键词猜测（Web Speech API 无标准性别字段）
  const femaleKw = ['female','woman','zira','samantha','victoria','karen','moira','tessa','fiona','aria','jenny','hazel','clara','sara','linda','heather','catherine','susan','allison','ava','zoe','emma','amy','serena','michelle','julia','huihui','yaoyao','xiaoxiao','xiaoyi','xiaochen','xiaohan','xiaomeng','xiaoqiu','xiaoshuang','xiaoyan','xiaorui','hiumaan','tracy','sinji'];
  const maleKw = ['male','man','david','mark','daniel','alex','fred','guy','eric','george','james','liam','ryan','tom','oliver','arthur','kangkang','yunyang','yunye','yunfeng','yunhao','yunjian','yunxia','yunze','danny','wanlung'];
  const kw = stt.voiceGender === 'male' ? maleKw : femaleKw;
  for (let i = 0; i < kw.length; i++) {
    const hit = candidates.find(function (v) { return (v.name || '').toLowerCase().indexOf(kw[i]) >= 0; });
    if (hit) return hit;
  }
  return candidates[0];
}

// 朗读音高随音色微调，增强男/女声差异
function speechPitch() {
  return loadSettings().voiceGender === 'male' ? 0.85 : 1.15;
}

function speak() {
  if (isSpeaking || !currentTheme) return;
  const stt = loadSettings();
  if (!stt.soundOn) return; // 音效关闭则不朗读

  // 先取消任何正在进行的朗读
  window.speechSynthesis.cancel();

  const item = currentTheme.items[currentIndex];
  var isDialogue = currentTheme.id === 'dialogue';
  var isListening = currentTheme.id === 'listening';
  var isStories = currentTheme.id === 'stories';

  // 先取消任何正在进行的朗读
  window.speechSynthesis.cancel();

  isSpeaking = true;
  btnSpeak.classList.add('speaking');
  btnSpeak.innerHTML = '<span class="icon">🔊</span> 朗读中...';

  // 构建朗读序列
  const parts = [];

  if (isDialogue) {
    parts.push({ text: item.zh, lang: 'zh-CN', label: 'A中文' });
    parts.push({ text: item.en, lang: 'en-US', label: 'A英文' });
    parts.push({ text: item.sentenceZh, lang: 'zh-CN', label: 'B中文' });
    parts.push({ text: item.sentence, lang: 'en-US', label: 'B英文' });
  } else if (isListening) {
    // 听力练习：只朗读英文
    parts.push({ text: item.story, lang: 'en-US' });
  } else if (isStories) {
    // 寓言故事：只读英文故事
    if (item.story) parts.push({ text: item.story, lang: 'en-US' });
  } else {
    parts.push({ text: item.zh, lang: 'zh-CN' });
    parts.push({ text: item.en, lang: 'en-US' });
    if (item.sentence) {
      parts.push({ text: item.sentenceZh, lang: 'zh-CN' });
      parts.push({ text: item.sentence, lang: 'en-US' });
    }
  }

  let partIndex = 0;

  function speakNext() {
    if (partIndex >= parts.length) {
      finishSpeak();
      // 自动播放（听力模块自动播放逻辑不变）
      if (isAutoPlaying) {
        const autoDelay = isListening ? 1000 : 800;
        autoTimer = setTimeout(() => {
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
      utterance.lang = part.lang;
      utterance.rate = stt.speechRate;
      utterance.pitch = speechPitch();
      utterance.volume = 1.0;

      // 选择声音（按音色/方言设置）
      try {
        const v = selectVoice(part.lang);
        if (v) { utterance.voice = v; utterance.lang = v.lang; }
      } catch(e) {}

      utterance.onend = () => {
        partIndex++;
        setTimeout(speakNext, isDialogue ? 600 : 300);
      };
      utterance.onerror = (e) => {
        partIndex++;
        setTimeout(speakNext, 200);
      };

      window.speechSynthesis.speak(utterance);
    } catch(e) {
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

