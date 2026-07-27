// ========== 统一音频播放层（微信内置浏览器兼容）==========
// 微信 X5 内核禁用 Web Speech API，本模块用 HTML5 <audio> 播放预生成 MP3 或在线 TTS 兜底
// 三层策略：原生 TTS（调用方先试）→ 预生成音频 → 在线百度翻译 TTS
// 关键：<audio> 元素跨域播放不受 CORS 限制，微信内置浏览器可直接播放在线 TTS URL

// 微信环境检测
function isWeChatBrowser() {
  try {
    return /MicroMessenger/i.test(navigator.userAgent || '');
  } catch (e) { return false; }
}

// 预生成音频清单（启动时 fetch audio/manifest.json 加载）
let _audioManifest = null;
let _manifestLoading = null;
function loadAudioManifest() {
  if (_audioManifest) return Promise.resolve(_audioManifest);
  if (_manifestLoading) return _manifestLoading;
  _manifestLoading = new Promise(function (resolve) {
    fetch('audio/manifest.json', { cache: 'force-cache' })
      .then(function (r) { return r.json(); })
      .then(function (m) { _audioManifest = m || {}; resolve(_audioManifest); })
      .catch(function () { _audioManifest = {}; resolve({}); });
  });
  return _manifestLoading;
}

// 音频缓存（避免重复创建 Audio 对象）
const _audioCache = {};
function getAudioEl(src) {
  if (_audioCache[src]) return _audioCache[src];
  try {
    const a = new Audio(src);
    a.preload = 'auto';
    _audioCache[src] = a;
    return a;
  } catch (e) { return null; }
}

// 当前正在播放的 Audio 元素（用于 cancel）
let _currentAudio = null;

// 停止当前音频播放
function stopAudioPlayback() {
  if (_currentAudio) {
    try { _currentAudio.pause(); _currentAudio.currentTime = 0; } catch (e) {}
    _currentAudio = null;
  }
}

// 文本归一化为文件名安全字符串（用于匹配 manifest key）
function normalizeAudioKey(text, lang) {
  const t = String(text || '').trim().toLowerCase();
  const l = String(lang || 'en').toLowerCase();
  return l + '|' + t;
}

// 播放本地预生成音频
// 返回 Promise<bool>：是否成功播放
function playLocalAudio(text, lang) {
  return loadAudioManifest().then(function (manifest) {
    const key = normalizeAudioKey(text, lang);
    const entry = manifest[key];
    if (!entry || !entry.path) return false;
    return new Promise(function (resolve) {
      const audio = getAudioEl(entry.path);
      if (!audio) { resolve(false); return; }
      stopAudioPlayback();
      _currentAudio = audio;
      audio.currentTime = 0;
      audio.onended = function () { resolve(true); };
      audio.onerror = function () { resolve(false); };
      const p = audio.play();
      if (p && p.then) {
        p.then(function () {}).catch(function () { resolve(false); });
      }
      // 超时兜底（10秒）
      setTimeout(function () { resolve(true); }, 10000);
    });
  });
}

// 在线 TTS URL 构造（百度翻译 TTS，国内可访问，无需 API key）
// lan=en 英文 / lan=zh 中文；spd=3 常速；source=web 固定
function buildRemoteTTSUrl(text, lang) {
  const lan = (lang || 'en').indexOf('zh') === 0 ? 'zh' : 'en';
  const q = encodeURIComponent(String(text || '').slice(0, 200)); // TTS 限长
  return 'https://fanyi.baidu.com/gettts?lan=' + lan + '&text=' + q + '&spd=3&source=web';
}

// 在线 TTS 节流（300ms，避免频率限制）
let _lastRemoteTime = 0;
function playRemoteAudio(text, lang) {
  return new Promise(function (resolve) {
    const now = Date.now();
    if (now - _lastRemoteTime < 300) {
      // 节流：稍后重试一次（不直接失败，避免连续点击丢词）
      setTimeout(function () { resolve(false); }, 320);
      return;
    }
    _lastRemoteTime = now;
    const url = buildRemoteTTSUrl(text, lang);
    const audio = new Audio(url);
    stopAudioPlayback();
    _currentAudio = audio;
    let resolved = false;
    const finish = function (ok) {
      if (resolved) return;
      resolved = true;
      resolve(ok);
    };
    audio.onended = function () { finish(true); };
    audio.onerror = function () { finish(false); };
    // 超时 8 秒（在线 TTS 首包较慢）
    setTimeout(function () { finish(false); }, 8000);
    try {
      const p = audio.play();
      if (p && p.then) p.then(function () {}).catch(function () { finish(false); });
    } catch (e) { finish(false); }
  });
}

// 当前播放模式查询（用于诊断）
// 返回: 'hd-local' | 'hd-remote' | 'hd-native-fallback' | 'native' | 'unavailable'
function currentPlayMode() {
  const stt = (typeof loadSettings === 'function') ? loadSettings() : {};
  const status = (typeof speechEngineStatus === 'function') ? speechEngineStatus() : null;
  const nativeOk = status && status.available && status.voiceCount > 0;
  // 高清模式：预生成 → 在线百度 → 原生兜底
  if (stt.voiceQuality === 'hd') {
    if (_audioManifest && Object.keys(_audioManifest).length > 0) return 'hd-local';
    if (nativeOk) return 'hd-native-fallback';
    return 'hd-remote';
  }
  // 标准模式：原生优先，audio-player 兜底
  if (nativeOk) return 'native';
  if (_audioManifest && Object.keys(_audioManifest).length > 0) return 'hd-local';
  return 'unavailable';
}

// 原生 TTS 兜底（高清模式下预生成+在线都失败时使用，避免无声）
// 返回 Promise<bool>：是否成功排队播放（不保证播完，仅表示已提交）
function playNativeTTS(text, lang) {
  return new Promise(function (resolve) {
    if (typeof window === 'undefined' || !window.speechSynthesis || typeof SpeechSynthesisUtterance === 'undefined') {
      resolve(false); return;
    }
    let voices = [];
    try { voices = window.speechSynthesis.getVoices() || []; } catch (e) {}
    if (!voices.length) { resolve(false); return; }
    try {
      const u = new SpeechSynthesisUtterance(text);
      const stt = (typeof loadSettings === 'function') ? loadSettings() : {};
      u.rate = stt.speechRate || 0.85;
      u.volume = 1.0;
      if (typeof applyVoice === 'function') applyVoice(u, lang || 'en-US');
      let done = false;
      u.onend = function () { if (!done) { done = true; resolve(true); } };
      u.onerror = function () { if (!done) { done = true; resolve(false); } };
      // 超时兜底 8s
      setTimeout(function () { if (!done) { done = true; resolve(true); } }, 8000);
      window.speechSynthesis.speak(u);
      try { window.speechSynthesis.resume(); } catch (e) {}
    } catch (e) { resolve(false); }
  });
}

// 统一播放入口（调用方在原生 TTS 失败/不可用时调用）
// opts: { onUnavailable: fn, onPlayed: fn }
// 返回 Promise<bool>：是否通过 audio-player 播放成功
function playAudio(text, lang, opts) {
  opts = opts || {};
  if (!text) return Promise.resolve(false);
  // 第2层：预生成音频
  return playLocalAudio(text, lang).then(function (ok) {
    if (ok) {
      if (opts.onPlayed) opts.onPlayed('local');
      return true;
    }
    // 第3层：在线 TTS 兜底
    return playRemoteAudio(text, lang).then(function (ok2) {
      if (ok2) {
        if (opts.onPlayed) opts.onPlayed('remote');
        return true;
      }
      // 第4层：原生 TTS 兜底（避免无网络时无声）
      return playNativeTTS(text, lang).then(function (ok3) {
        if (ok3) { if (opts.onPlayed) opts.onPlayed('native'); return true; }
        if (opts.onUnavailable) opts.onUnavailable();
        return false;
      });
    });
  });
}

// 启动时预加载 manifest（非阻塞）
if (typeof window !== 'undefined') {
  setTimeout(loadAudioManifest, 500);
}
