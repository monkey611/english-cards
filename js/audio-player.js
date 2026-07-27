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

// 预生成音频清单
// 优先用内联的 window._audioManifest（audio-manifest.js 同步加载，无 fetch 延迟）
// 兜底 fetch audio/manifest.json（未加载内联文件时）
let _audioManifest = null;
let _manifestLoading = null;
function loadAudioManifest() {
  if (_audioManifest) return Promise.resolve(_audioManifest);
  // 优先用内联清单（同步可用，零延迟）
  if (typeof window !== 'undefined' && window._audioManifest) {
    _audioManifest = window._audioManifest;
    return Promise.resolve(_audioManifest);
  }
  if (_manifestLoading) return _manifestLoading;
  _manifestLoading = new Promise(function (resolve) {
    fetch('audio/manifest.json', { cache: 'force-cache' })
      .then(function (r) { return r.json(); })
      .then(function (m) { _audioManifest = m || {}; resolve(_audioManifest); })
      .catch(function () { _audioManifest = {}; resolve({}); });
  });
  return _manifestLoading;
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

// 文本归一化为 manifest key（与 gen-audio.js 生成逻辑保持一致）
// 关键：lang 取语种前缀（en-US→en, zh-CN→zh, zh-HK→zh），否则与 manifest key 不匹配
function normalizeAudioKey(text, lang) {
  const t = String(text || '').trim().toLowerCase();
  const l = String(lang || 'en').toLowerCase().split('-')[0];
  return l + '|' + t;
}

// 播放本地预生成音频
// 返回 Promise<bool>：是否成功播放
// 优化：下载阶段超时 2s（开始播放前），一旦开始播放取消超时等 onended；避免慢下载导致重叠播放
function playLocalAudio(text, lang) {
  return loadAudioManifest().then(function (manifest) {
    const key = normalizeAudioKey(text, lang);
    const entry = manifest[key];
    if (!entry || !entry.path) return false;
    return new Promise(function (resolve) {
      stopAudioPlayback();
      let audio;
      try { audio = new Audio(entry.path); } catch (e) { resolve(false); return; }
      audio.preload = 'auto';
      _currentAudio = audio;
      let resolved = false;
      let downloadTimer = null;
      const finish = function (ok) {
        if (resolved) return;
        resolved = true;
        if (downloadTimer) { clearTimeout(downloadTimer); downloadTimer = null; }
        audio.onended = null; audio.onerror = null;
        resolve(ok);
      };
      audio.onended = function () { finish(true); };
      audio.onerror = function () { finish(false); };
      // 下载阶段超时 2 秒：本地音频应秒播，超时说明 GitHub Pages 下载慢，让 remote 接管
      downloadTimer = setTimeout(function () { finish(false); }, 2000);
      try {
        const p = audio.play();
        if (p && p.then) {
          p.then(function () {
            // 已开始播放：取消下载超时，等 onended 自然结束（播放阶段不再有超时）
            if (downloadTimer) { clearTimeout(downloadTimer); downloadTimer = null; }
          }).catch(function () { finish(false); });
        }
      } catch (e) { finish(false); }
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
    const elapsed = now - _lastRemoteTime;
    const doPlay = function () {
      _lastRemoteTime = Date.now();
      const url = buildRemoteTTSUrl(text, lang);
      let audio;
      try { audio = new Audio(url); } catch (e) { resolve(false); return; }
      stopAudioPlayback();
      _currentAudio = audio;
      let resolved = false;
      let downloadTimer = null;
      const finish = function (ok) {
        if (resolved) return;
        resolved = true;
        if (downloadTimer) { clearTimeout(downloadTimer); downloadTimer = null; }
        audio.onended = null; audio.onerror = null;
        resolve(ok);
      };
      audio.onended = function () { finish(true); };
      audio.onerror = function () { finish(false); };
      // 下载阶段超时 4 秒（在线 TTS 首包较慢，超过则让 native 接管）
      downloadTimer = setTimeout(function () { finish(false); }, 4000);
      try {
        const p = audio.play();
        if (p && p.then) {
          p.then(function () {
            // 已开始播放：取消下载超时，等 onended
            if (downloadTimer) { clearTimeout(downloadTimer); downloadTimer = null; }
          }).catch(function () { finish(false); });
        }
      } catch (e) { finish(false); }
    };
    // 节流：距离上次 < 300ms 时等待剩余时间再发，不直接失败（避免多段朗读丢词）
    if (elapsed < 300) setTimeout(doPlay, 300 - elapsed);
    else doPlay();
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
      // 超时兜底 5s
      setTimeout(function () { if (!done) { done = true; resolve(true); } }, 5000);
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

// 启动时立即读取内联 manifest（同步，零延迟）
if (typeof window !== 'undefined' && window._audioManifest) {
  _audioManifest = window._audioManifest;
}

// ========== 音频预加载（消除首次播放下载延迟）==========
// 用户进入主题/翻页时，后台预下载当前词和下一个词的 MP3，点击朗读时秒播
const _preloadedSet = {};
const _preloadPool = []; // 保留引用避免被 GC 回收导致下载取消
function preloadOne(text, lang) {
  if (!text) return;
  if (!_audioManifest) return;
  const key = normalizeAudioKey(text, lang);
  if (_preloadedSet[key]) return; // 已预加载
  _preloadedSet[key] = true;
  const entry = _audioManifest[key];
  if (!entry || !entry.path) return;
  try {
    const a = new Audio(entry.path);
    a.preload = 'auto';
    a.volume = 0; // 静音，防止预加载触发播放
    _preloadPool.push(a);
  } catch (e) {}
}
// 预加载一个词的所有朗读片段（与 speak() 的 parts 逻辑一致）
function preloadItemAudio(item, themeId, zhDialect) {
  if (!item || !_audioManifest) return;
  const zh = zhDialect === 'cantonese' ? 'zh-HK' : 'zh-CN';
  preloadOne(item.zh, zh);
  preloadOne(item.en, 'en-US');
  if (item.sentence) {
    preloadOne(item.sentenceZh, zh);
    preloadOne(item.sentence, 'en-US');
  }
}
