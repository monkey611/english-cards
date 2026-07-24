// ========== 朗读（修复版）==========
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
      utterance.pitch = 1.1;
      utterance.volume = 1.0;

      // 选择声音
      try {
        const voices = window.speechSynthesis.getVoices();
        if (part.lang === 'zh-CN') {
          const zhVoice = voices.find(v => v.lang.startsWith('zh'));
          if (zhVoice) utterance.voice = zhVoice;
        } else {
          const enVoice = voices.find(v => v.lang.startsWith('en'));
          if (enVoice) utterance.voice = enVoice;
        }
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

