// ========== 统计（按当前级别过滤）==========
// 词汇数 = 词汇主题(VOCAB_THEME_IDS)内按 en 去重后的数量，与闯关题库/我的页保持一致
// 短句/对话按 id 前缀判断（phrases* / dialogue*），适配各级别新增主题
let currentLevel = null; // 当前目录展示的词汇级别（与 settings.vocabLevel 同步；null 时从设置读取）
function calcStats(level) {
  const lv = level || currentLevel || getVocabLevel();
  let words = 0, phrases = 0, dialogues = 0;
  const seen = {};
  THEMES.forEach(t => {
    if ((t.level || 'starter') !== lv) return;
    if (VOCAB_THEME_IDS.indexOf(t.id) >= 0) {
      t.items.forEach(it => {
        if (it.en) { const k = String(it.en).toLowerCase(); if (!seen[k]) { seen[k] = true; words++; } }
      });
    } else if (t.id.indexOf('phrases') === 0) phrases += t.items.length;
    else if (t.id.indexOf('dialogue') === 0) dialogues += t.items.length;
  });
  totalWords.textContent = `${words} 个词汇`;
  totalPhrases.textContent = `${phrases} 个短句`;
  totalDialogues.textContent = `${dialogues} 组对话`;
}

// ========== 主题掌握进度（C1）==========
function themeMastery(theme) {
  if (VOCAB_THEME_IDS.indexOf(theme.id) < 0) return null; // 非词汇主题不统计
  const total = theme.items.length;
  let mastered = 0;
  theme.items.forEach(function (it) { if (it.en && isMastered(it.en)) mastered++; });
  return { mastered: mastered, total: total, pct: total > 0 ? mastered / total : 0 };
}

// ========== 主题分组（用于目录分隔符）==========
// 按主题类型分组：音标 / 词汇 / 短句 / 对话 / 故事 / 听力
// 用 id 前缀判断，适配各级别新增主题（phrases-primary / dialogue-middle / stories-middle 等）
function themeSection(theme) {
  if (theme.group === 'phonetics') return 'phonetics';
  if (theme.id.indexOf('phrases') === 0) return 'phrases';
  if (theme.id.indexOf('dialogue') === 0) return 'dialogue';
  if (theme.id.indexOf('stories') === 0) return 'stories';
  if (theme.id.indexOf('listening') === 0) return 'listening';
  return 'vocab';
}
function groupLabel(section) {
  switch (section) {
    case 'phonetics': return '🔤 音标启蒙';
    case 'vocab':     return '📚 词汇';
    case 'phrases':   return '💬 实用短句';
    case 'dialogue':  return '👥 情景对话';
    case 'stories':   return '📖 寓言故事';
    case 'listening': return '👂 听力练习';
    default:          return '📚 学习内容';
  }
}

// ========== 推荐下一个主题（C2，级别感知）==========
// 优先推荐"已开始且最接近完成"的主题，其次推荐第一个未开始主题（仅当前级别）
function recommendTheme() {
  let started = null;
  let fresh = null;
  let allDone = true;
  let hasVocab = false;
  THEMES.forEach(function (t, ti) {
    if ((t.level || 'starter') !== currentLevel) return;
    const m = themeMastery(t);
    if (!m) return;
    hasVocab = true;
    if (m.pct < 1) {
      allDone = false;
      if (m.pct > 0) {
        if (!started || m.pct > started.pct) started = { theme: t, idx: ti, mastered: m.mastered, total: m.total, pct: m.pct };
      } else if (!fresh) {
        fresh = { theme: t, idx: ti, mastered: 0, total: m.total, pct: 0 };
      }
    }
  });
  if (!hasVocab) return null;
  if (allDone) return { allDone: true };
  return started || fresh;
}

function cleanThemeName(name) {
  return String(name).replace(/[^一-龥A-Za-z0-9\s]/g, '').trim();
}

function recommendBannerHtml() {
  const rec = recommendTheme();
  if (!rec) return '';
  if (rec.allDone) {
    return '<div class="catalog-recommend done"><span class="cr-icon">🏆</span><span class="cr-text">太棒了！' + esc(levelName(currentLevel)) + '级主题都掌握啦！</span></div>';
  }
  const ti = (rec.idx !== undefined) ? rec.idx : THEMES.indexOf(rec.theme);
  const remain = rec.total - rec.mastered;
  const name = cleanThemeName(rec.theme.name);
  let h = '<div class="catalog-recommend" data-theme="' + ti + '">';
  h += '<span class="cr-icon">' + (rec.theme.icon || '👉') + '</span>';
  if (rec.mastered > 0) {
    h += '<span class="cr-text">继续学习<b>' + esc(name) + '</b>，再掌握 ' + remain + ' 个就通关！</span>';
  } else {
    h += '<span class="cr-text">推荐开始学习<b>' + esc(name) + '</b> ✨</span>';
  }
  h += '<span class="cr-go">去学习 ▶</span>';
  h += '</div>';
  return h;
}

function bindRecommendBanner() {
  const el = catalogContent.querySelector('.catalog-recommend[data-theme]');
  if (!el) return;
  el.addEventListener('click', function () {
    const ti = parseInt(el.dataset.theme);
    const group = catalogContent.querySelector('.catalog-group[data-theme-idx="' + ti + '"]');
    if (!group) return;
    const navHeight = document.getElementById('catalogNav').offsetHeight;
    const top = group.getBoundingClientRect().top + catalog.scrollTop - navHeight - 10;
    catalog.scrollTo({ top: top, behavior: 'smooth' });
    group.classList.add('highlight');
    setTimeout(function () { group.classList.remove('highlight'); }, 1600);
  });
}

// 局部刷新目录的进度数据（不重建 DOM，保留滚动位置）—— 学习进度变化后调用
// 通过 data-theme-idx 定位每个分组（避免过滤后索引错位）
function refreshCatalogProgress() {
  const groups = catalogContent.querySelectorAll('.catalog-group');
  if (!groups.length) return;
  groups.forEach(function (group) {
    const ti = parseInt(group.dataset.themeIdx);
    if (isNaN(ti)) return;
    const theme = THEMES[ti];
    if (!theme) return;
    const m = themeMastery(theme);
    if (!m) return;
    const bar = group.querySelector('.catalog-progress-fill');
    if (bar) bar.style.width = (m.pct * 100) + '%';
    const cnt = group.querySelector('.catalog-group-mastered');
    if (cnt) cnt.textContent = m.mastered + '/' + m.total;
    const items = group.querySelectorAll('.catalog-item');
    theme.items.forEach(function (it, ii) {
      const el = items[ii];
      if (!el) return;
      const got = !!(it.en && isMastered(it.en));
      el.classList.toggle('mastered', got);
      let mark = el.querySelector('.mastered-mark');
      if (got && !mark) {
        mark = document.createElement('span');
        mark.className = 'mastered-mark';
        mark.textContent = '✓';
        el.appendChild(mark);
      } else if (!got && mark) {
        mark.remove();
      }
    });
  });
  // 刷新推荐横幅（类型可能变化）
  const oldBanner = catalogContent.querySelector('.catalog-recommend');
  const nextHtml = recommendBannerHtml();
  if (oldBanner) {
    if (nextHtml) {
      const wrap = document.createElement('div');
      wrap.innerHTML = nextHtml;
      const newBanner = wrap.firstChild;
      if (newBanner) oldBanner.parentNode.replaceChild(newBanner, oldBanner);
      else oldBanner.remove();
    } else {
      oldBanner.remove();
    }
    bindRecommendBanner();
  } else if (nextHtml) {
    const wrap = document.createElement('div');
    wrap.innerHTML = nextHtml;
    const newBanner = wrap.firstChild;
    if (newBanner) catalogContent.insertBefore(newBanner, catalogContent.firstChild);
    bindRecommendBanner();
  }
}

// ========== 渲染目录 ==========
// 切换词汇级别：更新设置 + 重渲染目录与统计
function switchVocabLevel(level) {
  if (level === currentLevel) return;
  currentLevel = level;
  setVocabLevel(level);
  calcStats(level);
  renderCatalog();
  catalog.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderCatalog() {
  // 同步当前级别（首次渲染 / 从设置恢复）
  currentLevel = getVocabLevel();

  // 级别切换控件（启蒙 / 小学 / 中学）
  const headerStats = document.querySelector('.catalog-stats');
  let levelSwitch = document.getElementById('catalogLevelSwitch');
  if (!levelSwitch) {
    levelSwitch = document.createElement('div');
    levelSwitch.className = 'catalog-level-switch';
    levelSwitch.id = 'catalogLevelSwitch';
    if (headerStats && headerStats.parentNode) {
      headerStats.parentNode.insertBefore(levelSwitch, headerStats.nextSibling);
    } else {
      catalogContent.parentNode.insertBefore(levelSwitch, catalogContent);
    }
  }
  let lvHtml = '';
  VOCAB_LEVELS.forEach(function (v) {
    const active = v.id === currentLevel ? ' active' : '';
    lvHtml += '<button type="button" class="level-btn' + active + '" data-level="' + v.id + '">' +
      '<span class="lv-icon">' + v.icon + '</span><span>' + v.name + '</span>' +
      '<span class="lv-desc">' + v.desc + '</span></button>';
  });
  levelSwitch.innerHTML = lvHtml;
  levelSwitch.querySelectorAll('.level-btn').forEach(function (b) {
    b.addEventListener('click', function () { switchVocabLevel(b.dataset.level); });
  });

  // 当前级别可见主题（带原 THEMES 索引）
  const visible = [];
  THEMES.forEach(function (theme, ti) {
    if ((theme.level || 'starter') === currentLevel) visible.push({ theme: theme, ti: ti });
  });

  // 渲染导航（仅当前级别）
  const nav = document.getElementById('catalogNav');
  const navInner = document.getElementById('catalogNavInner');
  let navHtml = '';
  visible.forEach(function (v) {
    const theme = v.theme;
    navHtml += '<div class="catalog-nav-item" data-nav-theme="' + v.ti + '">' +
      '<span class="nav-icon">' + (theme.icon || '📚') + '</span>' +
      '<span>' + theme.name.replace(/[^一-龥A-Za-z0-9\s]/g, '').trim() + '</span>' +
    '</div>';
  });
  navInner.innerHTML = navHtml;

  // 导航折叠按钮
  const navToggle = document.getElementById('navToggle');
  let navCollapsed = false;
  if (navToggle) {
    navToggle.onclick = function() {
      navCollapsed = !navCollapsed;
      nav.classList.toggle('collapsed', navCollapsed);
      navToggle.textContent = navCollapsed ? '▶' : '◀';
      navToggle.classList.toggle('collapsed', navCollapsed);
    };
    navInner.querySelectorAll('.catalog-nav-item').forEach(function(el) {
      el.onclick = function() {
        if (navCollapsed) {
          navCollapsed = false;
          nav.classList.remove('collapsed');
          navToggle.textContent = '◀';
          navToggle.classList.remove('collapsed');
        }
        const ti = parseInt(el.dataset.navTheme);
        const group = catalogContent.querySelector('.catalog-group[data-theme-idx="' + ti + '"]');
        if (group) {
          navInner.querySelectorAll('.catalog-nav-item').forEach(function(n) { n.classList.remove('active'); });
          el.classList.add('active');
          const navHeight = document.getElementById('catalogNav').offsetHeight;
          const top = group.getBoundingClientRect().top + catalog.scrollTop - navHeight - 10;
          catalog.scrollTo({ top: top, behavior: 'smooth' });
          setTimeout(function() {
            navInner.querySelectorAll('.catalog-nav-item').forEach(function(n) { n.classList.remove('active'); });
          }, 1500);
        }
      };
    });
  }

  // 滑动自动隐藏导航（只绑一次）
  if (!renderCatalog._scrollBound) {
    let lastScrollTop = 0;
    let _navCollapsed = false;
    catalog.addEventListener('scroll', function() {
      _navCollapsed = nav.classList.contains('collapsed');
      const scrollTop = catalog.scrollTop;
      if (scrollTop > 60 && scrollTop > lastScrollTop + 10 && !_navCollapsed) {
        nav.classList.add('hide-nav');
      } else if (scrollTop < lastScrollTop - 10 || scrollTop < 60) {
        nav.classList.remove('hide-nav');
      }
      lastScrollTop = scrollTop;
    });
    renderCatalog._scrollBound = true;
  }

  let html = '';
  // 推荐下一个主题横幅（C2）
  html += recommendBannerHtml();
  // 按分组渲染主题，分组切换时插入分隔符
  let lastSection = '';
  visible.forEach(function (v) {
    const theme = v.theme;
    const ti = v.ti;
    const section = themeSection(theme);
    if (section !== lastSection) {
      html += '<div class="catalog-group-divider">' + groupLabel(section) + '</div>';
      lastSection = section;
    }
    const m = themeMastery(theme);
    html += `<div class="catalog-group" data-theme-idx="${ti}">`;
    let titleHtml = esc(theme.name);
    if (m) titleHtml += ` <span class="catalog-group-mastered">${m.mastered}/${m.total}</span>`;
    html += `<div class="catalog-group-title">${titleHtml}</div>`;
    if (m) {
      html += `<div class="catalog-progress"><div class="catalog-progress-fill" style="width:${m.pct * 100}%"></div></div>`;
    }
    html += `<div class="catalog-grid">`;
    theme.items.forEach((item, ii) => {
      const delay = (ii % 12) * 0.05;
      const got = m && isMastered(item.en);
      html += `<div class="catalog-item${got ? ' mastered' : ''}" data-theme="${ti}" data-index="${ii}" style="animation-delay:${delay}s">
        <span class="icon">${item.emoji || '📚'}</span>
        <div class="name">${esc(String(item.en))}</div>
        <div class="count">${esc(String(item.zh))}</div>
        ${got ? '<span class="mastered-mark">✓</span>' : ''}
      </div>`;
    });
    html += `</div></div>`;
  });
  if (!visible.length) {
    html += '<div class="catalog-empty">该级别暂无内容</div>';
  }
  catalogContent.innerHTML = html;

  // 推荐横幅点击：滚动到对应主题并高亮
  bindRecommendBanner();

  catalogContent.querySelectorAll('.catalog-item').forEach(el => {
    el.addEventListener('click', () => {
      const ti = parseInt(el.dataset.theme);
      const ii = parseInt(el.dataset.index);
      openReader(THEMES[ti], ii);
    });
  });
}

// ========== 打开阅读器 ==========
function openReader(theme, index) {
  currentTheme = theme;
  currentIndex = index;
  readerTitle.textContent = theme.name;
  reader.classList.add('active');
  tabBar.classList.add('hide');
  showCard(false);
  // 预加载当前词和下一个词的音频（消除首次点击朗读的下载延迟）
  preloadCurrentAndNext();
}

// ========== 显示卡片 ==========
function showCard(animate) {
  if (!currentTheme) return;
  const items = currentTheme.items;
  const item = items[currentIndex];
  // 用 id 前缀判断，适配各级别新增主题（dialogue-primary / stories-middle 等）
  const isDialogue = currentTheme.id.indexOf('dialogue') === 0;
  const isPhonetics = currentTheme.group === 'phonetics';
  const isStories = currentTheme.id.indexOf('stories') === 0;
  const isListening = currentTheme.id.indexOf('listening') === 0;

  pageIndicator.textContent = `${currentIndex + 1}/${items.length}`;
  progressFill.style.width = `${((currentIndex + 1) / items.length) * 100}%`;

  // 粒子效果
  if (animate) spawnParticles();

  // 重置卡片
  card.classList.remove('show', 'hide-out', 'shine');

  // 显示蒙层 — 卡片出现时页面加蒙层，一直保持到关闭阅读器
  document.getElementById('cardContainer').classList.add('overlay');

  if (isDialogue) {
    // 对话模式
    cardContent.style.display = 'none';
    dialogueArea.style.display = 'flex';
    cardImage.style.fontSize = '60px';
    cardImage.innerHTML = '💬';

    const d = item;
    dialogueArea.innerHTML = `
      <div class="dialogue-bubble left" id="bubbleA">
        <div class="role-tag">${d.roleA || 'A'}</div>
        <div class="en-text">${d.en}</div>
        <div class="zh-text">${d.zh}</div>
      </div>
      <div class="dialogue-bubble right" id="bubbleB">
        <div class="role-tag">${d.roleB || 'B'}</div>
        <div class="en-text">${d.sentence}</div>
        <div class="zh-text">${d.sentenceZh}</div>
      </div>
    `;

    // 对话气泡动画：依次弹出
    setTimeout(() => {
      const bA = document.getElementById('bubbleA');
      if (bA) bA.classList.add('show');
    }, animate ? 300 : 50);
    setTimeout(() => {
      const bB = document.getElementById('bubbleB');
      if (bB) bB.classList.add('show');
    }, animate ? 800 : 200);

  } else {
    // 普通模式
    cardContent.style.display = 'block';
    dialogueArea.style.display = 'none';
    cardImage.style.fontSize = '';
    cardImage.innerHTML = item.emoji;

    cardEnglish.textContent = item.en;
    cardEnglish.className = 'card-english' + (item.sentence ? ' sentence' : '');

    // 显示音标（非音标模块的单词也显示）
    const phonetic = item.phonetic || getPhonetic(item.en);
    if (phonetic && !isPhonetics) {
      cardEnglish.innerHTML = `${item.en} <span style="font-size:0.5em;font-weight:600;color:var(--text-light);display:block;margin-top:2px">${phonetic}</span>`;
    } else if (isPhonetics) {
      cardEnglish.innerHTML = `${item.en} <span style="font-size:0.55em;font-weight:600;color:var(--text-light);display:block;margin-top:2px">${item.phonetic || ''}</span>`;
    }

    cardChinese.textContent = item.zh;
    cardChinese.className = 'card-chinese' + (item.sentence ? ' sentence' : '');

    // 如果有句子，显示
    if (item.sentence) {
      cardChinese.innerHTML = `${item.zh}<br><span style="font-size:0.85em;color:var(--text-light)">${item.sentenceZh}</span>`;
    }
  }

  // 音标模块特别处理
  if (isPhonetics) {
    cardImage.style.fontSize = '72px';
    cardImage.innerHTML = item.emoji;
    cardEnglish.className = 'card-english';
    cardEnglish.innerHTML = `${item.en} <span style="font-size:0.55em;font-weight:600;color:var(--text-light);display:block;margin-top:2px">${item.phonetic || ''}</span>`;
    cardChinese.innerHTML = `${item.zh}<br><span style="font-size:0.85em;color:var(--text-light)">${item.sentenceZh}</span>`;
    const mouthHint = document.createElement('div');
    mouthHint.style.cssText = 'font-size:13px;color:var(--text-light);margin-top:4px;padding:4px 12px;background:var(--primary-light);border-radius:12px;';
    mouthHint.textContent = '👄 ' + (item.sentenceZh || '');
    cardChinese.appendChild(mouthHint);
  }

  // 寓言故事模块特别处理（适配 stories / stories-middle 等）
  if (isStories) {
    cardContent.style.display = 'block';
    dialogueArea.style.display = 'none';
    cardImage.style.fontSize = '60px';
    cardImage.innerHTML = item.emoji;
    cardEnglish.className = 'card-english sentence';
    cardEnglish.textContent = item.en;
    cardChinese.innerHTML = '<div style="font-size:15px;line-height:1.6;margin-bottom:4px">' + (item.storyZh || '') + '</div>' +
      '<div style="font-size:13px;line-height:1.5;color:var(--text-light);border-top:1px solid var(--primary-light);padding-top:6px;margin-top:4px">' + (item.story || '') + '</div>';
  }

  // 听力练习模块特别处理
  if (isListening) {
    cardContent.style.display = 'block';
    dialogueArea.style.display = 'none';
    cardImage.style.fontSize = '60px';
    cardImage.innerHTML = item.emoji;
    cardEnglish.className = 'card-english sentence';
    cardEnglish.textContent = item.en;
    cardChinese.innerHTML = `<div style="font-size:16px;line-height:1.6;margin-bottom:6px">${item.storyZh}</div>
      <div style="font-size:14px;line-height:1.5;color:var(--text-light);border-top:1px solid var(--primary-light);padding-top:6px;margin-top:4px">${item.story}</div>`;
    // 显示时长标签
    const durationTag = document.createElement('div');
    durationTag.style.cssText = 'font-size:12px;color:var(--text-light);background:var(--primary-light);padding:2px 12px;border-radius:12px;display:inline-block;margin-top:4px;';
    durationTag.textContent = `⏱ ${item.duration || '3分钟'}`;
    cardChinese.appendChild(durationTag);
  }

  // 卡片主题色
  card.className = 'card';
  card.classList.add(`card-theme-${currentTheme.id}`);

  // 卡片动画
  if (animate) {
    card.classList.add('hide-out');
    setTimeout(() => {
      card.classList.remove('hide-out');
      card.classList.add('show');
      // 英文文字弹出
      setTimeout(() => {
        if (!isDialogue) cardEnglish.classList.add('pop');
      }, 300);
    }, 50);
  } else {
    card.classList.add('show');
    if (!isDialogue) cardEnglish.classList.add('pop');
  }

  // 按钮状态
  btnPrev.disabled = currentIndex === 0;
  btnNext.disabled = currentIndex >= items.length - 1;
}

// ========== 导航 ==========
function goPrev() {
  if (currentIndex > 0) {
    window.speechSynthesis.cancel();
    finishSpeak();
    currentIndex--;
    showCard(true);
    preloadCurrentAndNext();
  }
}

function goNext() {
  if (currentTheme && currentIndex < currentTheme.items.length - 1) {
    window.speechSynthesis.cancel();
    finishSpeak();
    currentIndex++;
    showCard(true);
    preloadCurrentAndNext();
    // 最后一个卡片时触发彩纸
    if (currentIndex === currentTheme.items.length - 1) {
      setTimeout(showConfetti, 500);
    }
  } else {
    closeReader();
  }
}

// 预加载当前词和下一个词的音频（消除点击朗读时的下载延迟）
// 仅在需要走 audio-player 时预加载（高清模式 或 原生TTS不可用如微信X5）
// 标准模式 + 原生可用时走原生TTS秒播，无需预加载，避免无用网络下载
function preloadCurrentAndNext() {
  if (!currentTheme || typeof preloadItemAudio !== 'function') return;
  const stt = (typeof loadSettings === 'function') ? loadSettings() : {};
  const status = (typeof speechEngineStatus === 'function') ? speechEngineStatus() : null;
  const nativeAvailable = status && status.available && status.voiceCount > 0;
  // 标准模式 + 原生可用 → 走原生TTS，不预加载
  if (stt.voiceQuality !== 'hd' && nativeAvailable) return;
  // 高清模式 或 原生不可用 → 预加载（走 audio-player 路径）
  preloadItemAudio(currentTheme.items[currentIndex], currentTheme.id, stt.zhDialect);
  if (currentIndex < currentTheme.items.length - 1) {
    preloadItemAudio(currentTheme.items[currentIndex + 1], currentTheme.id, stt.zhDialect);
  }
}

function closeReader() {
  stopAutoPlay();
  window.speechSynthesis.cancel();
  finishSpeak();
  reader.classList.remove('active');
  tabBar.classList.remove('hide');
  document.getElementById('cardContainer').classList.remove('overlay');
  currentTheme = null;
  currentIndex = 0;
}

// ========== 自动播放 ==========
function toggleAutoPlay() {
  isAutoPlaying = !isAutoPlaying;
  if (isAutoPlaying) {
    btnAuto.classList.add('active');
    btnAuto.textContent = '⏸ 暂停';
    startAutoPlay();
  } else {
    stopAutoPlay();
  }
}

function startAutoPlay() {
  if (autoTimer) clearTimeout(autoTimer);
  if (!isAutoPlaying || !currentTheme) return;

  // 自动播放：先朗读，朗读结束后自动翻页（在 speak 的 finishSpeak 里处理翻页）
  speak();
}

function stopAutoPlay() {
  isAutoPlaying = false;
  btnAuto.classList.remove('active');
  btnAuto.textContent = '▶ 自动';
  if (autoTimer) {
    clearTimeout(autoTimer);
    autoTimer = null;
  }
  // 停止朗读
  window.speechSynthesis.cancel();
  finishSpeak();
}

// ========== 鼠标悬浮光效 ==========
card.addEventListener('mousemove', (e) => {
  const rect = card.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * 100;
  const y = ((e.clientY - rect.top) / rect.height) * 100;
  card.style.setProperty('--mx', `${x}%`);
  card.style.setProperty('--my', `${y}%`);
  card.classList.add('shine');
});
card.addEventListener('mouseleave', () => {
  card.classList.remove('shine');
});

// ========== 键盘 ==========
document.addEventListener('keydown', (e) => {
  if (!currentTheme) return;
  if (e.key === 'ArrowLeft') goPrev();
  else if (e.key === 'ArrowRight') goNext();
  else if (e.key === ' ') { e.preventDefault(); speak(); }
  else if (e.key === 'Escape') closeReader();
  else if (e.key === 'a' || e.key === 'A') toggleAutoPlay();
});

// ========== 触摸滑动 ==========
// 安卓 WebView 兼容：用 clientX，记录时间戳防抖，阈值 40px
let touchStartX = 0;
let touchStartY = 0;
let touchStartTime = 0;
let touchTracking = false;
document.addEventListener('touchstart', (e) => {
  if (!currentTheme) { touchTracking = false; return; }
  const t = e.changedTouches[0];
  touchStartX = t.clientX;
  touchStartY = t.clientY;
  touchStartTime = Date.now();
  touchTracking = true;
}, { passive: true });
document.addEventListener('touchend', (e) => {
  if (!currentTheme || !touchTracking) return;
  touchTracking = false;
  const t = e.changedTouches[0];
  const dx = t.clientX - touchStartX;
  const dy = t.clientY - touchStartY;
  const dt = Date.now() - touchStartTime;
  // 水平滑动为主 + 距离>40px + 时间<1s（避免长按误触）
  if (Math.abs(dx) > Math.abs(dy) * 1.5 && Math.abs(dx) > 40 && dt < 1000) {
    if (dx > 0) goPrev();
    else goNext();
  }
}, { passive: true });
// touchcancel 也清理状态（安卓偶发）
document.addEventListener('touchcancel', () => { touchTracking = false; }, { passive: true });

