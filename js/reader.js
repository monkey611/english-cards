// ========== 统计 ==========
function calcStats() {
  let words = 0, phrases = 0, dialogues = 0;
  THEMES.forEach(t => {
    if (t.id === 'phrases') phrases += t.items.length;
    else if (t.id === 'dialogue') dialogues += t.items.length;
    else words += t.items.length;
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

// ========== 推荐下一个主题（C2）==========
// 优先推荐"已开始且最接近完成"的主题，其次推荐第一个未开始主题
function recommendTheme() {
  let started = null;
  let fresh = null;
  let allDone = true;
  let hasVocab = false;
  THEMES.forEach(function (t) {
    const m = themeMastery(t);
    if (!m) return;
    hasVocab = true;
    if (m.pct < 1) {
      allDone = false;
      if (m.pct > 0) {
        if (!started || m.pct > started.pct) started = { theme: t, mastered: m.mastered, total: m.total, pct: m.pct };
      } else if (!fresh) {
        fresh = { theme: t, mastered: 0, total: m.total, pct: 0 };
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
    return '<div class="catalog-recommend done"><span class="cr-icon">🏆</span><span class="cr-text">太棒了！所有主题都掌握啦！</span></div>';
  }
  const ti = THEMES.indexOf(rec.theme);
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
    const group = catalogContent.querySelectorAll('.catalog-group')[ti];
    if (!group) return;
    const navHeight = document.getElementById('catalogNav').offsetHeight;
    const top = group.getBoundingClientRect().top + catalog.scrollTop - navHeight - 10;
    catalog.scrollTo({ top: top, behavior: 'smooth' });
    group.classList.add('highlight');
    setTimeout(function () { group.classList.remove('highlight'); }, 1600);
  });
}

// 局部刷新目录的进度数据（不重建 DOM，保留滚动位置）—— 学习进度变化后调用
function refreshCatalogProgress() {
  const groups = catalogContent.querySelectorAll('.catalog-group');
  if (!groups.length) return;
  THEMES.forEach(function (theme, ti) {
    const group = groups[ti];
    if (!group) return;
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
function renderCatalog() {
  // 渲染导航
  const nav = document.getElementById('catalogNav');
  const navInner = document.getElementById('catalogNavInner');
  let navHtml = '';
  THEMES.forEach((theme, ti) => {
    const icon = theme.icon || theme.name.match(/^\S+/)?.[0] || '📚';
    const iconClean = (icon || '').replace(/[^a-zA-Z0-9À-ɏЀ-ӿ؀-ۿ一-鿿぀-ゟ゠-ヿ☀-⟯\uD800-􏰀-\uDFFF]/g, '').trim() || '📚';
    navHtml += '<div class="catalog-nav-item" data-nav-theme="' + ti + '">' +
      '<span class="nav-icon">' + theme.icon + '</span>' +
      '<span>' + theme.name.replace(/[^一-龥A-Za-z0-9\s]/g, '').trim() + '</span>' +
    '</div>';
  });
  navInner.innerHTML = navHtml;

  // 导航折叠按钮
  const navToggle = document.getElementById('navToggle');
  let navCollapsed = false;
  if (navToggle) {
    // 点击折叠/展开（贴在左侧）
    navToggle.addEventListener('click', function() {
      navCollapsed = !navCollapsed;
      nav.classList.toggle('collapsed', navCollapsed);
      navToggle.textContent = navCollapsed ? '▶' : '◀';
      navToggle.classList.toggle('collapsed', navCollapsed);
    });

    // 点击导航项时展开
    navInner.querySelectorAll('.catalog-nav-item').forEach(function(el) {
      el.addEventListener('click', function() {
        if (navCollapsed) {
          navCollapsed = false;
          nav.classList.remove('collapsed');
          navToggle.textContent = '◀';
          navToggle.classList.remove('collapsed');
        }
        var ti = parseInt(el.dataset.navTheme);
        var group = catalogContent.querySelectorAll('.catalog-group')[ti];
        if (group) {
          navInner.querySelectorAll('.catalog-nav-item').forEach(function(n) { n.classList.remove('active'); });
          el.classList.add('active');
          var navHeight = document.getElementById('catalogNav').offsetHeight;
          var top = group.getBoundingClientRect().top + catalog.scrollTop - navHeight - 10;
          catalog.scrollTo({ top: top, behavior: 'smooth' });
          setTimeout(function() {
            navInner.querySelectorAll('.catalog-nav-item').forEach(function(n) { n.classList.remove('active'); });
          }, 1500);
        }
      });
    });
  }

  // 滑动自动隐藏
  let lastScrollTop = 0;
  catalog.addEventListener('scroll', function() {
    var scrollTop = catalog.scrollTop;
    if (scrollTop > 60 && scrollTop > lastScrollTop + 10 && !navCollapsed) {
      nav.classList.add('hide-nav');
    } else if (scrollTop < lastScrollTop - 10 || scrollTop < 60) {
      nav.classList.remove('hide-nav');
    }
    lastScrollTop = scrollTop;
  });

  let html = '';
  // 推荐下一个主题横幅（C2）
  html += recommendBannerHtml();
  THEMES.forEach((theme, ti) => {
    const m = themeMastery(theme);
    html += `<div class="catalog-group">`;
    let titleHtml = theme.name;
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
        <span class="icon">${item.emoji}</span>
        <div class="name">${item.en}</div>
        <div class="count">${item.zh}</div>
        ${got ? '<span class="mastered-mark">✓</span>' : ''}
      </div>`;
    });
    html += `</div></div>`;
  });
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
}

// ========== 显示卡片 ==========
function showCard(animate) {
  if (!currentTheme) return;
  const items = currentTheme.items;
  const item = items[currentIndex];
  const isDialogue = currentTheme.id === 'dialogue';

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
    if (phonetic && currentTheme.id !== 'phonetics') {
      cardEnglish.innerHTML = `${item.en} <span style="font-size:0.5em;font-weight:600;color:var(--text-light);display:block;margin-top:2px">${phonetic}</span>`;
    } else if (currentTheme.id === 'phonetics') {
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
  if (currentTheme.id === 'phonetics') {
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

  // 寓言故事模块特别处理
  if (currentTheme.id === 'stories') {
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
  if (currentTheme.id === 'listening') {
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
  }
}

function goNext() {
  if (currentTheme && currentIndex < currentTheme.items.length - 1) {
    window.speechSynthesis.cancel();
    finishSpeak();
    currentIndex++;
    showCard(true);
    // 最后一个卡片时触发彩纸
    if (currentIndex === currentTheme.items.length - 1) {
      setTimeout(showConfetti, 500);
    }
  } else {
    closeReader();
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
let touchStartX = 0;
let touchStartY = 0;
document.addEventListener('touchstart', (e) => {
  touchStartX = e.changedTouches[0].screenX;
  touchStartY = e.changedTouches[0].screenY;
}, { passive: true });
document.addEventListener('touchend', (e) => {
  if (!currentTheme) return;
  const dx = e.changedTouches[0].screenX - touchStartX;
  const dy = e.changedTouches[0].screenY - touchStartY;
  if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
    if (dx > 0) goPrev();
    else goNext();
  }
}, { passive: true });

