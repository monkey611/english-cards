// ========== 测试模块（URL 加 ?test=1 触发）==========
function runTests() {
  const log = [];
  let pass = 0, fail = 0;
  function ok(name, cond, info) {
    if (cond) { pass++; log.push('  ✅ PASS | ' + name + (info ? ' | ' + info : '')); }
    else { fail++; log.push('  ❌ FAIL | ' + name + (info ? ' | ' + info : '')); }
  }
  // 备份真实进度与设置，测试后恢复
  const backupRaw = localStorage.getItem(STORAGE_KEY);
  const backupSetRaw = localStorage.getItem(SETTINGS_KEY);
  const backupProg = _progress ? JSON.parse(JSON.stringify(_progress)) : null;
  const backupSet = _settings ? JSON.parse(JSON.stringify(_settings)) : null;
  try {
    _progress = null; resetProgress();
    log.push('[1] seededRandom 确定性');
    const r1 = seededRandom('2026-07-24'), r2 = seededRandom('2026-07-24');
    const seq1 = [r1(), r1(), r1(), r1(), r1()];
    const seq2 = [r2(), r2(), r2(), r2(), r2()];
    ok('同种子产生相同序列', JSON.stringify(seq1) === JSON.stringify(seq2), 'seq1[0]=' + seq1[0]);
    const r3 = seededRandom('2026-07-25');
    ok('不同种子产生不同序列', seq1[0] !== r3(), 'seq1[0]=' + seq1[0] + ', r3[0]≠');
    ok('随机值落在 [0,1)', seq1[0] >= 0 && seq1[0] < 1, 'val=' + seq1[0]);

    log.push('[2] buildQuestionPool 题库（按级别分层）');
    const poolStarter = buildQuestionPool('starter');
    const poolPrimary = buildQuestionPool('primary');
    const poolMiddle = buildQuestionPool('middle');
    const totalWords = poolStarter.words.length + poolPrimary.words.length + poolMiddle.words.length;
    ok('三级词汇总量 >= 800', totalWords >= 800, 'total=' + totalWords);
    ok('启蒙级词汇 >= 200', poolStarter.words.length >= 200, 'starter=' + poolStarter.words.length);
    ok('小学级词汇 >= 200', poolPrimary.words.length >= 200, 'primary=' + poolPrimary.words.length);
    ok('中学级词汇 >= 200', poolMiddle.words.length >= 200, 'middle=' + poolMiddle.words.length);
    // 词汇量递增规律：启蒙 < 小学 < 中学（启蒙最简单最少，中学最多）
    ok('词汇量 启蒙 < 小学', poolStarter.words.length < poolPrimary.words.length, 'starter=' + poolStarter.words.length + ' primary=' + poolPrimary.words.length);
    ok('词汇量 小学 < 中学', poolPrimary.words.length < poolMiddle.words.length, 'primary=' + poolPrimary.words.length + ' middle=' + poolMiddle.words.length);
    // 各级别句子题库均不为空（phrases / phrases-primary / phrases-middle）
    ok('启蒙句子题库 >= 20', poolStarter.sentences.length >= 20, 'starter sent=' + poolStarter.sentences.length);
    ok('小学句子题库 >= 15', poolPrimary.sentences.length >= 15, 'primary sent=' + poolPrimary.sentences.length);
    ok('中学句子题库 >= 15', poolMiddle.sentences.length >= 15, 'middle sent=' + poolMiddle.sentences.length);
    // 验证级别过滤生效：中学题库的词来自 ms-* 中学主题，不含启蒙/小学主题词
    ok('中学题库仅含 ms-* 主题', poolMiddle.words.every(function (w) { return w.themeId.indexOf('ms-') === 0; }), '非ms主题数=' + poolMiddle.words.filter(function(w){return w.themeId.indexOf('ms-')!==0;}).length);
    ok('启蒙题库不含 ms-* 主题', !poolStarter.words.some(function (w) { return w.themeId.indexOf('ms-') === 0; }), '');
    const pool = poolStarter;
    ok('词汇按 en 去重', new Set(pool.words.map(function (w) { return w.en.toLowerCase(); })).size === pool.words.length, 'distinct=' + new Set(pool.words.map(function (w) { return w.en.toLowerCase(); })).size);
    ok('句子题库 > 20 (启蒙)', pool.sentences.length > 20, 'sentences=' + pool.sentences.length);
    ok('词汇项含 en/zh 字段', pool.words.every(function (w) { return w.en && w.zh; }), 'sample=' + pool.words[0].en + '/' + pool.words[0].zh);
    ok('排除 stories/listening/dialogue/phonetics', !pool.words.some(function (w) { return w.themeId === 'stories' || w.themeId === 'listening'; }) && !pool.sentences.some(function (s) { return s.themeId === 'dialogue'; }), '');

    log.push('[2b] 各级别短句/对话/朗读主题完整性');
    // 启蒙：phrases + dialogue
    ok('启蒙有 phrases 主题', !!THEMES.find(function (t) { return t.id === 'phrases' && t.level === 'starter'; }), '');
    ok('启蒙有 dialogue 主题', !!THEMES.find(function (t) { return t.id === 'dialogue' && t.level === 'starter'; }), '');
    // 小学：phrases-primary + dialogue-primary + stories + listening
    ok('小学有 phrases-primary', !!THEMES.find(function (t) { return t.id === 'phrases-primary' && t.level === 'primary'; }), '');
    ok('小学有 dialogue-primary', !!THEMES.find(function (t) { return t.id === 'dialogue-primary' && t.level === 'primary'; }), '');
    ok('小学有 stories 主题', !!THEMES.find(function (t) { return t.id === 'stories' && t.level === 'primary'; }), '');
    ok('小学有 listening 主题', !!THEMES.find(function (t) { return t.id === 'listening' && t.level === 'primary'; }), '');
    // 中学：phrases-middle + dialogue-middle + stories-middle
    ok('中学有 phrases-middle', !!THEMES.find(function (t) { return t.id === 'phrases-middle' && t.level === 'middle'; }), '');
    ok('中学有 dialogue-middle', !!THEMES.find(function (t) { return t.id === 'dialogue-middle' && t.level === 'middle'; }), '');
    ok('中学有 stories-middle 长篇朗读', !!THEMES.find(function (t) { return t.id === 'stories-middle' && t.level === 'middle'; }), '');

    log.push('[3] generateDailyQuestions 题数与题型分布');
    const qs = generateDailyQuestions('2026-07-24');
    ok('题目总数 = 15', qs.length === 15, 'len=' + qs.length);
    const counts = { choice: 0, spell: 0, listen: 0 };
    qs.forEach(function (q) { counts[q.type]++; });
    ok('选择题 = 8 (≈50%)', counts.choice === 8, 'choice=' + counts.choice);
    ok('拼词题 = 4 (≈27%)', counts.spell === 4, 'spell=' + counts.spell);
    ok('听力题 = 3 (≈20%)', counts.listen === 3, 'listen=' + counts.listen);
    const wordN = qs.filter(function (q) { return q.kind === 'word'; }).length;
    const sentN = qs.filter(function (q) { return q.kind === 'sentence'; }).length;
    ok('词汇题 = 10', wordN === 10, 'word=' + wordN);
    ok('句子题 = 5', sentN === 5, 'sentence=' + sentN);
    const qs2 = generateDailyQuestions('2026-07-24');
    const same = qs.every(function (q, i) { return q.type === qs2[i].type && q.item.en === qs2[i].item.en && q.answer === qs2[i].answer; });
    ok('同种子题目确定性', same, 'first=' + qs[0].item.en + ' / ' + qs[0].type);

    log.push('[4] makeOptions 选项生成');
    const opts = makeOptions('苹果', pool.words, seededRandom('opt'), 4);
    ok('选项数 = 4', opts.length === 4, 'len=' + opts.length);
    ok('含正确答案', opts.indexOf('苹果') >= 0, 'opts=' + opts.join(','));
    ok('选项去重', new Set(opts).size === 4, 'unique=' + new Set(opts).size);

    log.push('[5] Storage 读写一致性');
    resetProgress();
    addMastered('test_word_1');
    ok('addMastered 后 isMastered=true', isMastered('test_word_1'), '');
    ok('未添加词 isMastered=false', !isMastered('not_added'), '');
    _progress = null; // 强制从 localStorage 重载
    ok('重载后 masteredWords 持久化', isMastered('test_word_1'), 'reload ok');

    log.push('[6] streak 连续打卡判定');
    // A: 首次完成 -> current=1
    _progress = null; resetProgress();
    const resA = markTodayDone({ stars: 10, correct: 10, total: 15 });
    ok('首次完成 current=1', resA.streak.current === 1, 'current=' + resA.streak.current);
    ok('首次完成得 first_complete', resA.newTrophies.indexOf('first_complete') >= 0, 'trophies=' + resA.newTrophies.join(','));
    // B: 昨日已完成 + 今日完成 -> current=2
    _progress = null; resetProgress();
    _progress = loadProgress();
    _progress.streak = { current: 1, longest: 1, lastDate: getYesterday() };
    _progress.daily[getYesterday()] = { completed: true, stars: 8, correct: 8, total: 15 };
    saveProgress(); _progress = null;
    const resB = markTodayDone({ stars: 12, correct: 12, total: 15 });
    ok('昨日+今日 current=2', resB.streak.current === 2, 'current=' + resB.streak.current);
    // C: 断卡（lastDate=前天）-> 重置为 1
    _progress = null; resetProgress();
    _progress = loadProgress();
    _progress.streak = { current: 5, longest: 5, lastDate: dateAddDays(getToday(), -2) };
    saveProgress(); _progress = null;
    const resC = markTodayDone({ stars: 5, correct: 5, total: 15 });
    ok('断卡后 current 重置为 1', resC.streak.current === 1, 'current=' + resC.streak.current);
    // D: 同日重试 -> alreadyDone + isRetry，且 attemptCount 递增、best 更新
    _progress = null; resetProgress();
    markTodayDone({ stars: 10, correct: 10, total: 15 });
    _progress = null;
    const resD = markTodayDone({ stars: 15, correct: 15, total: 15 });
    ok('同日重试 alreadyDone=true', resD.alreadyDone === true, '');
    ok('同日重试 isRetry=true', resD.isRetry === true, '');
    ok('重试 attemptCount=2', resD.attemptCount === 2, 'attemptCount=' + resD.attemptCount);
    ok('重试 best 取较优(15星)', resD.best && resD.best.stars === 15, 'best.stars=' + (resD.best ? resD.best.stars : '?'));
    // 第三次重试成绩更差，best 不变
    _progress = null;
    const resD2 = markTodayDone({ stars: 5, correct: 5, total: 15 });
    ok('第三次重试 attemptCount=3', resD2.attemptCount === 3, 'attemptCount=' + resD2.attemptCount);
    ok('成绩更差时 best 不变(仍15星)', resD2.best && resD2.best.stars === 15, 'best.stars=' + (resD2.best ? resD2.best.stars : '?'));
    // 重试不重复计算 streak
    ok('重试不重复计算 streak（仍=1）', resD.streak.current === 1, 'current=' + resD.streak.current);

    log.push('[7] checkTrophies 奖杯触发 + 重试全对');
    // master_10
    _progress = null; resetProgress();
    for (let i = 0; i < 10; i++) addMastered('mword' + i);
    const resT = markTodayDone({ stars: 10, correct: 10, total: 15 });
    ok('掌握 10 词得 master_10', resT.newTrophies.indexOf('master_10') >= 0, 'trophies=' + resT.newTrophies.join(','));
    // streak_3：构造已连 2 天，今日完成 -> current=3
    _progress = null; resetProgress();
    _progress = loadProgress();
    _progress.streak = { current: 2, longest: 2, lastDate: getYesterday() };
    _progress.daily[getYesterday()] = { completed: true, stars: 8, correct: 8, total: 15 };
    saveProgress(); _progress = null;
    const resS3 = markTodayDone({ stars: 12, correct: 12, total: 15 });
    ok('连续 3 天得 streak_3', resS3.newTrophies.indexOf('streak_3') >= 0, 'current=' + resS3.streak.current + ' trophies=' + resS3.newTrophies.join(','));
    // all_correct：首次未全对，重试全对也能触发
    _progress = null; resetProgress();
    markTodayDone({ stars: 10, correct: 10, total: 15 });
    _progress = null;
    const resRetry = markTodayDone({ stars: 15, correct: 15, total: 15 });
    ok('重试全对得 all_correct', resRetry.newTrophies.indexOf('all_correct') >= 0, 'trophies=' + resRetry.newTrophies.join(','));
    // 首次全对
    _progress = null; resetProgress();
    const resAll = markTodayDone({ stars: 15, correct: 15, total: 15 });
    ok('首次全对得 all_correct', resAll.newTrophies.indexOf('all_correct') >= 0, 'trophies=' + resAll.newTrophies.join(','));

    log.push('[8] 未掌握优先抽取');
    _progress = null; resetProgress();
    // 标记大量词为已掌握，验证未掌握优先
    pool.words.slice(0, 50).forEach(function (w) { addMastered(w.en); });
    _progress = null;
    const qs3 = generateDailyQuestions('2026-07-24');
    const wordQs = qs3.filter(function (q) { return q.kind === 'word'; });
    const unmasteredInQuiz = wordQs.filter(function (q) { return !isMastered(q.item.en); }).length;
    ok('未掌握优先（未掌握词占比高）', unmasteredInQuiz >= 5, '未掌握=' + unmasteredInQuiz + '/10');

    log.push('[9] 词汇级别设置');
    _settings = null;
    setVocabLevel('middle');
    ok('setVocabLevel 后 getVocabLevel=middle', getVocabLevel() === 'middle', 'level=' + getVocabLevel());
    ok('levelName(middle)=中学', levelName('middle') === '中学', 'name=' + levelName('middle'));
    ok('levelName(starter)=启蒙', levelName('starter') === '启蒙', '');
    ok('levelName(primary)=小学', levelName('primary') === '小学', '');
    ok('VOCAB_LEVELS 含 3 个级别', VOCAB_LEVELS.length === 3, 'len=' + VOCAB_LEVELS.length);
    // buildQuestionPool 默认取设置中的级别
    _settings = null;
    setVocabLevel('primary');
    const poolBySetting = buildQuestionPool();
    ok('buildQuestionPool 默认按设置级别', poolBySetting.words.length === poolPrimary.words.length, '默认=' + poolBySetting.words.length + ' primary=' + poolPrimary.words.length);
    // 恢复默认设置
    _settings = null;
    setVocabLevel('starter');

    log.push('[9b] 语音音质设置（标准/高清）');
    const defaultStt = loadSettings();
    ok('默认 voiceQuality=standard', defaultStt.voiceQuality === 'standard', 'val=' + defaultStt.voiceQuality);
    // 切换到高清模式
    defaultStt.voiceQuality = 'hd';
    saveSettings();
    _settings = null;
    ok('切换后 voiceQuality=hd', loadSettings().voiceQuality === 'hd', 'val=' + loadSettings().voiceQuality);
    // 切回标准
    loadSettings().voiceQuality = 'standard';
    saveSettings();
    _settings = null;
    ok('切回 voiceQuality=standard', loadSettings().voiceQuality === 'standard', 'val=' + loadSettings().voiceQuality);
    // 持久化检查：重新加载仍为 standard
    _settings = null;
    const rawStt = JSON.parse(localStorage.getItem(SETTINGS_KEY));
    ok('音质设置已持久化', rawStt && rawStt.voiceQuality === 'standard', 'raw=' + (rawStt ? rawStt.voiceQuality : 'null'));

    log.push('[10] 音标模块完整性（26字母）');
    const lettersTheme = THEMES.find(function (t) { return t.id === 'phonetics-letters'; });
    ok('存在 phonetics-letters 主题', !!lettersTheme, '');
    ok('字母条目数 = 26', lettersTheme && lettersTheme.items.length === 26, 'count=' + (lettersTheme ? lettersTheme.items.length : 0));
    const letters = lettersTheme ? lettersTheme.items.map(function (it) { return it.en; }).join('') : '';
    ok('26 字母 A-Z 齐全', letters === 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'letters=' + letters);
    const vowelsTheme = THEMES.find(function (t) { return t.id === 'phonetics-vowels'; });
    const consTheme = THEMES.find(function (t) { return t.id === 'phonetics-consonants'; });
    ok('元音主题条目 >= 20', vowelsTheme && vowelsTheme.items.length >= 20, 'vowels=' + (vowelsTheme ? vowelsTheme.items.length : 0));
    ok('辅音主题条目 >= 24', consTheme && consTheme.items.length >= 24, 'consonants=' + (consTheme ? consTheme.items.length : 0));
    ok('音标主题 level=starter', lettersTheme && lettersTheme.level === 'starter', '');
    ok('音标主题 group=phonetics', lettersTheme && lettersTheme.group === 'phonetics', '');

    log.push('[11] 口语练习场景数据');
    ok('SPEAKING_SCENARIOS 数量 >= 6', SPEAKING_SCENARIOS.length >= 6, 'count=' + SPEAKING_SCENARIOS.length);
    let speakingOk = true, speakingErr = '';
    SPEAKING_SCENARIOS.forEach(function (sc) {
      if (!sc.id || !sc.title || !sc.lines || !sc.lines.length) { speakingOk = false; speakingErr = sc.id || '?'; }
      // 至少含 1 个 bot 行 + 1 个 user 行
      const hasBot = sc.lines.some(function (l) { return l.side === 'bot'; });
      const hasUser = sc.lines.some(function (l) { return l.side === 'user'; });
      if (!hasBot || !hasUser) { speakingOk = false; speakingErr = sc.id; }
      // user 行必须有 accept 数组
      sc.lines.forEach(function (l) {
        if (l.side === 'user' && (!l.accept || !l.accept.length)) { speakingOk = false; speakingErr = sc.id; }
      });
    });
    ok('所有场景含 bot+user 行且 user 行有 accept', speakingOk, speakingErr ? 'err=' + speakingErr : '');
    ok('所有场景行含 en/zh', SPEAKING_SCENARIOS.every(function (sc) { return sc.lines.every(function (l) { return l.en && l.zh; }); }), '');
    // 覆盖各级别
    const lvSet = {};
    SPEAKING_SCENARIOS.forEach(function (sc) { lvSet[sc.level] = true; });
    ok('口语场景覆盖 starter/primary/middle', lvSet.starter && lvSet.primary && lvSet.middle, Object.keys(lvSet).join(','));
  } catch (e) {
    log.push('  ⚠️ 测试异常: ' + e.message);
    fail++;
  } finally {
    // 恢复真实进度与设置
    if (backupRaw !== null) localStorage.setItem(STORAGE_KEY, backupRaw);
    else localStorage.removeItem(STORAGE_KEY);
    if (backupSetRaw !== null) localStorage.setItem(SETTINGS_KEY, backupSetRaw);
    else localStorage.removeItem(SETTINGS_KEY);
    _progress = backupProg;
    _settings = backupSet;
  }
  // 输出
  console.log('%c===== 数据层单元测试 =====', 'color:#C4A882;font-weight:bold;font-size:15px');
  log.forEach(function (l) { console.log(l); });
  console.log('%c通过 ' + pass + ' / ' + (pass + fail) + '，失败 ' + fail, 'color:' + (fail === 0 ? '#B5C9B0' : '#E8B4B8') + ';font-weight:bold;font-size:15px');
  return { pass: pass, fail: fail, log: log };
}

