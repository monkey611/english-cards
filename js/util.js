function getPhonetic(word) {
  const key = word.toLowerCase().replace(/[^a-z]/g, '');
  return PHONETICS_MAP[key] || '';
}

// ============================================================
// ============================================================
let currentTheme = null;
let currentIndex = 0;
let isAutoPlaying = false;
let autoTimer = null;
let isSpeaking = false;

const $ = id => document.getElementById(id);
const splash = $('splash');
const loadingBar = $('loadingBar');
const catalog = $('catalog');
const catalogContent = $('catalogContent');
const reader = $('reader');
const card = $('card');
const cardImage = $('cardImage');
const cardEnglish = $('cardEnglish');
const cardChinese = $('cardChinese');
const cardContent = $('cardContent');
const dialogueArea = $('dialogueArea');
const readerTitle = $('readerTitle');
const pageIndicator = $('pageIndicator');
const progressFill = $('progressFill');
const btnBack = $('btnBack');
const btnPrev = $('btnPrev');
const btnNext = $('btnNext');
const btnSpeak = $('btnSpeak');
const btnAuto = $('btnAuto');
const particles = $('particles');
const totalWords = $('totalWords');
const totalPhrases = $('totalPhrases');
const totalDialogues = $('totalDialogues');
const confettiContainer = $('confettiContainer');
const tabBar = $('tabBar');
const pageChallenge = $('pageChallenge');
const pageProfile = $('pageProfile');
const pageSpeaking = $('pageSpeaking');
const challengeContent = $('challengeContent');
const profileContent = $('profileContent');
const speakingContent = $('speakingContent');
let currentTab = 'home';

