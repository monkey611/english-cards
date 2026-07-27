// ========== Tab 切换 ==========
function switchTab(tab) {
  if (tab === currentTab) return;
  window.speechSynthesis.cancel();
  finishSpeak();
  // 离开口语页时清理识别状态
  if (currentTab === 'speaking' && typeof closeScenario === 'function' && _spkState) {
    try { _spkState.rec && _spkState.rec.stop(); } catch (e) {}
    _spkState = null;
  }
  currentTab = tab;
  // 按钮高亮
  tabBar.querySelectorAll('.tab-item').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === tab);
  });
  // 页面切换：home 显示目录页，其余隐藏
  catalog.classList.toggle('hidden', tab !== 'home');
  pageChallenge.classList.toggle('active', tab === 'challenge');
  pageSpeaking.classList.toggle('active', tab === 'speaking');
  pageProfile.classList.toggle('active', tab === 'profile');
  // 非阅读器状态下确保 Tab 栏可见
  tabBar.classList.remove('hide');
  // 切回主页时局部刷新目录掌握进度（学习进度可能已变化）
  if (tab === 'home') refreshCatalogProgress();
  // 首次进入时渲染对应页面
  if (tab === 'challenge') renderChallengeHome();
  if (tab === 'speaking') renderSpeakingHome();
  if (tab === 'profile') renderProfileHome();
}

// ========== 事件绑定 ==========
btnBack.addEventListener('click', closeReader);
btnPrev.addEventListener('click', goPrev);
btnNext.addEventListener('click', goNext);
btnSpeak.addEventListener('click', speak);
btnAuto.addEventListener('click', toggleAutoPlay);
tabBar.querySelectorAll('.tab-item').forEach(b => {
  b.addEventListener('click', () => switchTab(b.dataset.tab));
});

// ========== 初始化 ==========
calcStats();
renderCatalog();

// 启动页：重复访问快速淡出，首次访问完整动画（B2）
const VISITED_KEY = 'ec_visited';
let _hasVisited = false;
try { _hasVisited = !!localStorage.getItem(VISITED_KEY); } catch (e) {}
try { localStorage.setItem(VISITED_KEY, '1'); } catch (e) {}

if (_hasVisited) {
  // 重复访问：跳过进度条动画，快速淡出
  loadingBar.style.width = '100%';
  setTimeout(function () {
    splash.classList.add('hide');
    setTimeout(function () { splash.style.display = 'none'; }, 600);
  }, 300);
} else {
  // 首次访问：完整启动动画
  let progress = 0;
  const loadingInterval = setInterval(() => {
    progress += Math.random() * 15 + 5;
    if (progress > 100) progress = 100;
    loadingBar.style.width = `${progress}%`;
    if (progress >= 100) {
      clearInterval(loadingInterval);
      setTimeout(() => {
        splash.classList.add('hide');
        setTimeout(() => splash.style.display = 'none', 800);
      }, 400);
    }
  }, 200);
}

// 预加载语音
function initSpeech() {
  try {
    window.speechSynthesis.getVoices();
    var silent = new SpeechSynthesisUtterance(' ');
    silent.volume = 0;
    window.speechSynthesis.speak(silent);
    window.speechSynthesis.cancel();
  } catch(e) {}
}
initSpeech();
// 测试入口：URL 加 ?test=1 自动运行数据层单元测试（结果输出到 console）
if (new URLSearchParams(location.search).get('test') === '1') {
  setTimeout(runTests, 600);
}
document.addEventListener('click', function() {
  try { window.speechSynthesis.getVoices(); } catch(e) {}
}, { once: true });
try {
  window.speechSynthesis.onvoiceschanged = function() {
    window.speechSynthesis.getVoices();
  };
} catch(e) {}
