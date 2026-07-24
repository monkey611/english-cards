// ========== 测试模块（URL 加 ?test=1 触发）==========
function runTests() {
  const log = [];
  let pass = 0, fail = 0;
  function ok(name, cond, info) {
    if (cond) { pass++; log.push('  ✅ PASS | ' + name + (info ? ' | ' + info : '')); }
    else { fail++; log.push('  ❌ FAIL | ' + name + (info ? ' | ' + info : '')); }
  }
  // 备份真实进度，测试后恢复
  const backupRaw = localStorage.getItem(STORAGE_KEY);
  const backupProg = _progress ? JSON.parse(JSON.stringify(_progress)) : null;
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

    log.push('[2] buildQuestionPool 题库');
    const pool = buildQuestionPool();
    ok('词汇量 >= 800', pool.words.length >= 800, 'words=' + pool.words.length);
    ok('词汇按 en 去重', new Set(pool.words.map(function (w) { return w.en.toLowerCase(); })).size === pool.words.length, 'distinct=' + new Set(pool.words.map(function (w) { return w.en.toLowerCase(); })).size);
    ok('句子题库 > 20', pool.sentences.length > 20, 'sentences=' + pool.sentences.length);
    ok('词汇项含 en/zh 字段', pool.words.every(function (w) { return w.en && w.zh; }), 'sample=' + pool.words[0].en + '/' + pool.words[0].zh);
    ok('排除 stories/listening/dialogue/phonetics', !pool.words.some(function (w) { return w.themeId === 'stories' || w.themeId === 'listening'; }) && !pool.sentences.some(function (s) { return s.themeId === 'dialogue'; }), '');

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
    // D: 同日重复 -> alreadyDone
    _progress = null; resetProgress();
    markTodayDone({ stars: 10, correct: 10, total: 15 });
    _progress = null;
    const resD = markTodayDone({ stars: 15, correct: 15, total: 15 });
    ok('同日重复 alreadyDone=true', resD.alreadyDone === true, '');

    log.push('[7] checkTrophies 奖杯触发');
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
    // all_correct
    _progress = null; resetProgress();
    const resAll = markTodayDone({ stars: 15, correct: 15, total: 15 });
    ok('全对得 all_correct', resAll.newTrophies.indexOf('all_correct') >= 0, 'trophies=' + resAll.newTrophies.join(','));

    log.push('[8] 未掌握优先抽取');
    _progress = null; resetProgress();
    // 标记大量词为已掌握，验证未掌握优先
    pool.words.slice(0, 50).forEach(function (w) { addMastered(w.en); });
    _progress = null;
    const qs3 = generateDailyQuestions('2026-07-24');
    const wordQs = qs3.filter(function (q) { return q.kind === 'word'; });
    const unmasteredInQuiz = wordQs.filter(function (q) { return !isMastered(q.item.en); }).length;
    ok('未掌握优先（未掌握词占比高）', unmasteredInQuiz >= 5, '未掌握=' + unmasteredInQuiz + '/10');
  } catch (e) {
    log.push('  ⚠️ 测试异常: ' + e.message);
    fail++;
  } finally {
    // 恢复真实进度
    if (backupRaw !== null) localStorage.setItem(STORAGE_KEY, backupRaw);
    else localStorage.removeItem(STORAGE_KEY);
    _progress = backupProg;
  }
  // 输出
  console.log('%c===== 数据层单元测试 =====', 'color:#C4A882;font-weight:bold;font-size:15px');
  log.forEach(function (l) { console.log(l); });
  console.log('%c通过 ' + pass + ' / ' + (pass + fail) + '，失败 ' + fail, 'color:' + (fail === 0 ? '#B5C9B0' : '#E8B4B8') + ';font-weight:bold;font-size:15px');
  return { pass: pass, fail: fail, log: log };
}

