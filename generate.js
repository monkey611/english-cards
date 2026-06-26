const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// ============================================================
// 卡片数据定义（含音标 + 中文翻译）
// 单词系列每组12张，口语系列24句，共18个系列 = 216张卡片
// ============================================================
const series = [
  {
    name: '动物',
    nameEn: 'Animals',
    icon: '🐾',
    bgColor: '#e8f5e9',
    accent: '#4caf50',
    cards: [
      { emoji: '🐱', word: 'cat', phonetic: '/kæt/', cn: '猫' },
      { emoji: '🐶', word: 'dog', phonetic: '/dɒɡ/', cn: '狗' },
      { emoji: '🐟', word: 'fish', phonetic: '/fɪʃ/', cn: '鱼' },
      { emoji: '🐦', word: 'bird', phonetic: '/bɜːd/', cn: '鸟' },
      { emoji: '🐰', word: 'rabbit', phonetic: '/ˈræbɪt/', cn: '兔子' },
      { emoji: '🐻', word: 'bear', phonetic: '/beə/', cn: '熊' },
      { emoji: '🐘', word: 'elephant', phonetic: '/ˈelɪfənt/', cn: '大象' },
      { emoji: '🐵', word: 'monkey', phonetic: '/ˈmʌŋki/', cn: '猴子' },
      { emoji: '🦁', word: 'lion', phonetic: '/ˈlaɪən/', cn: '狮子' },
      { emoji: '🐯', word: 'tiger', phonetic: '/ˈtaɪɡə/', cn: '老虎' },
      { emoji: '🐸', word: 'frog', phonetic: '/frɒɡ/', cn: '青蛙' },
      { emoji: '🦆', word: 'duck', phonetic: '/dʌk/', cn: '鸭子' },
    ],
  },
  {
    name: '颜色',
    nameEn: 'Colors',
    icon: '🎨',
    bgColor: '#fff8e1',
    accent: '#ff9800',
    cards: [
      { emoji: '🔴', word: 'red', phonetic: '/red/', cn: '红色' },
      { emoji: '🔵', word: 'blue', phonetic: '/bluː/', cn: '蓝色' },
      { emoji: '🟡', word: 'yellow', phonetic: '/ˈjeləʊ/', cn: '黄色' },
      { emoji: '🟢', word: 'green', phonetic: '/ɡriːn/', cn: '绿色' },
      { emoji: '🟠', word: 'orange', phonetic: '/ˈɒrɪndʒ/', cn: '橙色' },
      { emoji: '🩷', word: 'pink', phonetic: '/pɪŋk/', cn: '粉色' },
      { emoji: '🟣', word: 'purple', phonetic: '/ˈpɜːpl/', cn: '紫色' },
      { emoji: '⚪', word: 'white', phonetic: '/waɪt/', cn: '白色' },
      { emoji: '⚫', word: 'black', phonetic: '/blæk/', cn: '黑色' },
      { emoji: '🤎', word: 'brown', phonetic: '/braʊn/', cn: '棕色' },
      { emoji: '🩶', word: 'gray', phonetic: '/ɡreɪ/', cn: '灰色' },
      { emoji: '❤️', word: 'heart', phonetic: '/hɑːt/', cn: '爱心' },
    ],
  },
  {
    name: '数字',
    nameEn: 'Numbers',
    icon: '🔢',
    bgColor: '#e3f2fd',
    accent: '#2196f3',
    cards: [
      { emoji: '1️⃣', word: 'one', phonetic: '/wʌn/', cn: '一' },
      { emoji: '2️⃣', word: 'two', phonetic: '/tuː/', cn: '二' },
      { emoji: '3️⃣', word: 'three', phonetic: '/θriː/', cn: '三' },
      { emoji: '4️⃣', word: 'four', phonetic: '/fɔː/', cn: '四' },
      { emoji: '5️⃣', word: 'five', phonetic: '/faɪv/', cn: '五' },
      { emoji: '6️⃣', word: 'six', phonetic: '/sɪks/', cn: '六' },
      { emoji: '7️⃣', word: 'seven', phonetic: '/ˈsevn/', cn: '七' },
      { emoji: '8️⃣', word: 'eight', phonetic: '/eɪt/', cn: '八' },
      { emoji: '9️⃣', word: 'nine', phonetic: '/naɪn/', cn: '九' },
      { emoji: '🔟', word: 'ten', phonetic: '/ten/', cn: '十' },
      { emoji: '💯', word: 'hundred', phonetic: '/ˈhʌndrəd/', cn: '一百' },
      { emoji: '🔢', word: 'number', phonetic: '/ˈnʌmbə/', cn: '数字' },
    ],
  },
  {
    name: '水果',
    nameEn: 'Fruits',
    icon: '🍎',
    bgColor: '#fce4ec',
    accent: '#e91e63',
    cards: [
      { emoji: '🍎', word: 'apple', phonetic: '/ˈæpl/', cn: '苹果' },
      { emoji: '🍌', word: 'banana', phonetic: '/bəˈnɑːnə/', cn: '香蕉' },
      { emoji: '🍊', word: 'orange', phonetic: '/ˈɒrɪndʒ/', cn: '橘子' },
      { emoji: '🍇', word: 'grape', phonetic: '/ɡreɪp/', cn: '葡萄' },
      { emoji: '🍓', word: 'strawberry', phonetic: '/ˈstrɔːbəri/', cn: '草莓' },
      { emoji: '🍉', word: 'watermelon', phonetic: '/ˈwɔːtəmelən/', cn: '西瓜' },
      { emoji: '🍑', word: 'peach', phonetic: '/piːtʃ/', cn: '桃子' },
      { emoji: '🍐', word: 'pear', phonetic: '/peə/', cn: '梨' },
      { emoji: '🍒', word: 'cherry', phonetic: '/ˈtʃeri/', cn: '樱桃' },
      { emoji: '🍋', word: 'lemon', phonetic: '/ˈlemən/', cn: '柠檬' },
      { emoji: '🥭', word: 'mango', phonetic: '/ˈmæŋɡəʊ/', cn: '芒果' },
      { emoji: '🍍', word: 'pineapple', phonetic: '/ˈpaɪnæpl/', cn: '菠萝' },
    ],
  },
  {
    name: '家庭',
    nameEn: 'Family',
    icon: '👨‍👩‍👧',
    bgColor: '#f3e5f5',
    accent: '#9c27b0',
    cards: [
      { emoji: '👩', word: 'mom', phonetic: '/mɒm/', cn: '妈妈' },
      { emoji: '👨', word: 'dad', phonetic: '/dæd/', cn: '爸爸' },
      { emoji: '👦', word: 'brother', phonetic: '/ˈbrʌðə/', cn: '兄弟' },
      { emoji: '👧', word: 'sister', phonetic: '/ˈsɪstə/', cn: '姐妹' },
      { emoji: '👶', word: 'baby', phonetic: '/ˈbeɪbi/', cn: '宝宝' },
      { emoji: '👵', word: 'grandma', phonetic: '/ˈɡrænmɑː/', cn: '奶奶/外婆' },
      { emoji: '👴', word: 'grandpa', phonetic: '/ˈɡrænpɑː/', cn: '爷爷/外公' },
      { emoji: '🧑‍🤝‍🧑', word: 'friend', phonetic: '/frend/', cn: '朋友' },
      { emoji: '👨‍👩‍👦', word: 'family', phonetic: '/ˈfæməli/', cn: '家庭' },
      { emoji: '🧑', word: 'people', phonetic: '/ˈpiːpl/', cn: '人们' },
      { emoji: '👩‍🏫', word: 'teacher', phonetic: '/ˈtiːtʃə/', cn: '老师' },
      { emoji: '🧒', word: 'child', phonetic: '/tʃaɪld/', cn: '孩子' },
    ],
  },
  {
    name: '食物',
    nameEn: 'Food',
    icon: '🍕',
    bgColor: '#fff3e0',
    accent: '#ff5722',
    cards: [
      { emoji: '🍞', word: 'bread', phonetic: '/bred/', cn: '面包' },
      { emoji: '🥛', word: 'milk', phonetic: '/mɪlk/', cn: '牛奶' },
      { emoji: '🥚', word: 'egg', phonetic: '/eɡ/', cn: '鸡蛋' },
      { emoji: '🍚', word: 'rice', phonetic: '/raɪs/', cn: '米饭' },
      { emoji: '🎂', word: 'cake', phonetic: '/keɪk/', cn: '蛋糕' },
      { emoji: '🍪', word: 'cookie', phonetic: '/ˈkʊki/', cn: '饼干' },
      { emoji: '🧃', word: 'juice', phonetic: '/dʒuːs/', cn: '果汁' },
      { emoji: '💧', word: 'water', phonetic: '/ˈwɔːtə/', cn: '水' },
      { emoji: '🍕', word: 'pizza', phonetic: '/ˈpiːtsə/', cn: '披萨' },
      { emoji: '🍜', word: 'noodle', phonetic: '/ˈnuːdl/', cn: '面条' },
      { emoji: '🍦', word: 'ice cream', phonetic: '/aɪs kriːm/', cn: '冰淇淋' },
      { emoji: '🍫', word: 'chocolate', phonetic: '/ˈtʃɒklət/', cn: '巧克力' },
    ],
  },
  {
    name: '身体',
    nameEn: 'Body',
    icon: '🧒',
    bgColor: '#e0f7fa',
    accent: '#00bcd4',
    cards: [
      { emoji: '👀', word: 'eye', phonetic: '/aɪ/', cn: '眼睛' },
      { emoji: '👂', word: 'ear', phonetic: '/ɪə/', cn: '耳朵' },
      { emoji: '👃', word: 'nose', phonetic: '/nəʊz/', cn: '鼻子' },
      { emoji: '👄', word: 'mouth', phonetic: '/maʊθ/', cn: '嘴巴' },
      { emoji: '🖐️', word: 'hand', phonetic: '/hænd/', cn: '手' },
      { emoji: '🦶', word: 'foot', phonetic: '/fʊt/', cn: '脚' },
      { emoji: '💪', word: 'arm', phonetic: '/ɑːm/', cn: '胳膊' },
      { emoji: '🦵', word: 'leg', phonetic: '/leɡ/', cn: '腿' },
      { emoji: '😊', word: 'face', phonetic: '/feɪs/', cn: '脸' },
      { emoji: '🦷', word: 'tooth', phonetic: '/tuːθ/', cn: '牙齿' },
      { emoji: '👅', word: 'tongue', phonetic: '/tʌŋ/', cn: '舌头' },
      { emoji: '🫀', word: 'heart', phonetic: '/hɑːt/', cn: '心脏' },
    ],
  },
  {
    name: '衣物',
    nameEn: 'Clothes',
    icon: '👕',
    bgColor: '#fce4ec',
    accent: '#ad1457',
    cards: [
      { emoji: '👕', word: 'shirt', phonetic: '/ʃɜːt/', cn: '衬衫' },
      { emoji: '👖', word: 'pants', phonetic: '/pænts/', cn: '裤子' },
      { emoji: '👗', word: 'dress', phonetic: '/dres/', cn: '连衣裙' },
      { emoji: '👟', word: 'shoe', phonetic: '/ʃuː/', cn: '鞋子' },
      { emoji: '🧦', word: 'sock', phonetic: '/sɒk/', cn: '袜子' },
      { emoji: '🧥', word: 'coat', phonetic: '/kəʊt/', cn: '外套' },
      { emoji: '🧢', word: 'hat', phonetic: '/hæt/', cn: '帽子' },
      { emoji: '🧣', word: 'scarf', phonetic: '/skɑːf/', cn: '围巾' },
      { emoji: '🧤', word: 'glove', phonetic: '/ɡlʌv/', cn: '手套' },
      { emoji: '👙', word: 'shorts', phonetic: '/ʃɔːts/', cn: '短裤' },
      { emoji: '👔', word: 'tie', phonetic: '/taɪ/', cn: '领带' },
      { emoji: '🩴', word: 'slipper', phonetic: '/ˈslɪpə/', cn: '拖鞋' },
    ],
  },
  {
    name: '自然',
    nameEn: 'Nature',
    icon: '🌿',
    bgColor: '#f1f8e9',
    accent: '#558b2f',
    cards: [
      { emoji: '☀️', word: 'sun', phonetic: '/sʌn/', cn: '太阳' },
      { emoji: '🌙', word: 'moon', phonetic: '/muːn/', cn: '月亮' },
      { emoji: '⭐', word: 'star', phonetic: '/stɑː/', cn: '星星' },
      { emoji: '🌸', word: 'flower', phonetic: '/ˈflaʊə/', cn: '花' },
      { emoji: '🌳', word: 'tree', phonetic: '/triː/', cn: '树' },
      { emoji: '☁️', word: 'cloud', phonetic: '/klaʊd/', cn: '云' },
      { emoji: '🌈', word: 'rainbow', phonetic: '/ˈreɪnbəʊ/', cn: '彩虹' },
      { emoji: '🌧️', word: 'rain', phonetic: '/reɪn/', cn: '雨' },
      { emoji: '❄️', word: 'snow', phonetic: '/snəʊ/', cn: '雪' },
      { emoji: '🌊', word: 'sea', phonetic: '/siː/', cn: '大海' },
      { emoji: '🏔️', word: 'mountain', phonetic: '/ˈmaʊntɪn/', cn: '山' },
      { emoji: '🍃', word: 'leaf', phonetic: '/liːf/', cn: '树叶' },
    ],
  },
  {
    name: '动作',
    nameEn: 'Actions',
    icon: '🏃',
    bgColor: '#fff9c4',
    accent: '#f9a825',
    cards: [
      { emoji: '🏃', word: 'run', phonetic: '/rʌn/', cn: '跑' },
      { emoji: '🚶', word: 'walk', phonetic: '/wɔːk/', cn: '走' },
      { emoji: '🤸', word: 'jump', phonetic: '/dʒʌmp/', cn: '跳' },
      { emoji: '🏊', word: 'swim', phonetic: '/swɪm/', cn: '游泳' },
      { emoji: '😴', word: 'sleep', phonetic: '/sliːp/', cn: '睡觉' },
      { emoji: '😋', word: 'eat', phonetic: '/iːt/', cn: '吃' },
      { emoji: '🥤', word: 'drink', phonetic: '/drɪŋk/', cn: '喝' },
      { emoji: '📖', word: 'read', phonetic: '/riːd/', cn: '读' },
      { emoji: '✍️', word: 'write', phonetic: '/raɪt/', cn: '写' },
      { emoji: '🎵', word: 'sing', phonetic: '/sɪŋ/', cn: '唱歌' },
      { emoji: '💃', word: 'dance', phonetic: '/dɑːns/', cn: '跳舞' },
      { emoji: '🎨', word: 'draw', phonetic: '/drɔː/', cn: '画画' },
    ],
  },
  {
    name: '日常口语',
    nameEn: 'Daily Talk',
    icon: '💬',
    bgColor: '#e8eaf6',
    accent: '#3f51b5',
    cards: [
      { emoji: '👋', word: 'Hello!', phonetic: '/həˈləʊ/', cn: '你好！' },
      { emoji: '🌅', word: 'Good morning!', phonetic: '/ɡʊd ˈmɔːnɪŋ/', cn: '早上好！' },
      { emoji: '🌙', word: 'Good night!', phonetic: '/ɡʊd naɪt/', cn: '晚安！' },
      { emoji: '👋', word: 'Goodbye!', phonetic: '/ɡʊdˈbaɪ/', cn: '再见！' },
      { emoji: '🙏', word: 'Thank you!', phonetic: '/θæŋk juː/', cn: '谢谢你！' },
      { emoji: '😊', word: 'Sorry!', phonetic: '/ˈsɒri/', cn: '对不起！' },
      { emoji: '🥺', word: 'Please!', phonetic: '/pliːz/', cn: '拜托！/请！' },
      { emoji: '👍', word: 'Yes!', phonetic: '/jes/', cn: '是的！' },
      { emoji: '🙅', word: 'No!', phonetic: '/nəʊ/', cn: '不！' },
      { emoji: '❤️', word: 'I love you!', phonetic: '/aɪ lʌv juː/', cn: '我爱你！' },
      { emoji: '😄', word: 'I\'m happy!', phonetic: '/aɪm ˈhæpi/', cn: '我很开心！' },
      { emoji: '🤗', word: 'How are you?', phonetic: '/haʊ ɑː juː/', cn: '你好吗？' },
      { emoji: '😊', word: 'I\'m fine!', phonetic: '/aɪm faɪn/', cn: '我很好！' },
      { emoji: '🆘', word: 'Help me!', phonetic: '/help miː/', cn: '帮帮我！' },
      { emoji: '🆕', word: 'What\'s this?', phonetic: '/wɒts ðɪs/', cn: '这是什么？' },
      { emoji: '🙋', word: 'Let\'s go!', phonetic: '/lets ɡəʊ/', cn: '我们走吧！' },
      { emoji: '⏸️', word: 'Wait for me!', phonetic: '/weɪt fɔː miː/', cn: '等等我！' },
      { emoji: '🤗', word: 'Give me a hug!', phonetic: '/ɡɪv miː ə hʌɡ/', cn: '抱抱我！' },
      { emoji: '👏', word: 'Good job!', phonetic: '/ɡʊd dʒɒb/', cn: '做得好！' },
      { emoji: '🤔', word: 'I don\'t know.', phonetic: '/aɪ dəʊnt nəʊ/', cn: '我不知道。' },
      { emoji: '😋', word: 'Yummy!', phonetic: '/ˈjʌmi/', cn: '好吃！' },
      { emoji: '😱', word: 'Oh no!', phonetic: '/əʊ nəʊ/', cn: '不好了！' },
      { emoji: '🚾', word: 'I need the potty.', phonetic: '/aɪ niːðə ˈpɒti/', cn: '我要上厕所。' },
      { emoji: '😴', word: 'I\'m sleepy.', phonetic: '/aɪm ˈsliːpi/', cn: '我困了。' },
    ],
  },
  {
    name: '交通工具',
    nameEn: 'Vehicles',
    icon: '🚗',
    bgColor: '#e3f2fd',
    accent: '#1565c0',
    cards: [
      { emoji: '🚗', word: 'car', phonetic: '/kɑː/', cn: '汽车' },
      { emoji: '🚌', word: 'bus', phonetic: '/bʌs/', cn: '公交车' },
      { emoji: '🚂', word: 'train', phonetic: '/treɪn/', cn: '火车' },
      { emoji: '✈️', word: 'plane', phonetic: '/pleɪn/', cn: '飞机' },
      { emoji: '🚢', word: 'ship', phonetic: '/ʃɪp/', cn: '轮船' },
      { emoji: '🚲', word: 'bike', phonetic: '/baɪk/', cn: '自行车' },
      { emoji: '🚒', word: 'fire truck', phonetic: '/ˈfaɪə trʌk/', cn: '消防车' },
      { emoji: '🚑', word: 'ambulance', phonetic: '/ˈæmbjələns/', cn: '救护车' },
      { emoji: '🚕', word: 'taxi', phonetic: '/ˈtæksi/', cn: '出租车' },
      { emoji: '🚀', word: 'rocket', phonetic: '/ˈrɒkɪt/', cn: '火箭' },
      { emoji: '🚁', word: 'helicopter', phonetic: '/ˈhelɪkɒptə/', cn: '直升机' },
      { emoji: '🛵', word: 'motorcycle', phonetic: '/ˈməʊtəsaɪkl/', cn: '摩托车' },
    ],
  },
  {
    name: '形状',
    nameEn: 'Shapes',
    icon: '🔷',
    bgColor: '#fce4ec',
    accent: '#c62828',
    cards: [
      { emoji: '⭕', word: 'circle', phonetic: '/ˈsɜːkl/', cn: '圆形' },
      { emoji: '⬜', word: 'square', phonetic: '/skweə/', cn: '正方形' },
      { emoji: '🔺', word: 'triangle', phonetic: '/ˈtraɪæŋɡl/', cn: '三角形' },
      { emoji: '⭐', word: 'star', phonetic: '/stɑː/', cn: '星星形' },
      { emoji: '❤️', word: 'heart', phonetic: '/hɑːt/', cn: '心形' },
      { emoji: '🔷', word: 'diamond', phonetic: '/ˈdaɪəmənd/', cn: '菱形' },
      { emoji: '▬', word: 'rectangle', phonetic: '/ˈrektæŋɡl/', cn: '长方形' },
      { emoji: '🥚', word: 'oval', phonetic: '/ˈəʊvl/', cn: '椭圆形' },
      { emoji: '➡️', word: 'arrow', phonetic: '/ˈærəʊ/', cn: '箭头形' },
      { emoji: '🌙', word: 'crescent', phonetic: '/ˈkresnt/', cn: '月牙形' },
      { emoji: '💠', word: 'ring', phonetic: '/rɪŋ/', cn: '环形' },
      { emoji: '➕', word: 'cross', phonetic: '/krɒs/', cn: '十字形' },
    ],
  },
  {
    name: '职业',
    nameEn: 'Jobs',
    icon: '👨‍⚕️',
    bgColor: '#fff3e0',
    accent: '#e65100',
    cards: [
      { emoji: '👨‍⚕️', word: 'doctor', phonetic: '/ˈdɒktə/', cn: '医生' },
      { emoji: '👩‍🏫', word: 'teacher', phonetic: '/ˈtiːtʃə/', cn: '老师' },
      { emoji: '👮', word: 'police', phonetic: '/pəˈliːs/', cn: '警察' },
      { emoji: '🧑‍🚒', word: 'firefighter', phonetic: '/ˈfaɪəfaɪtə/', cn: '消防员' },
      { emoji: '👨‍🍳', word: 'chef', phonetic: '/ʃef/', cn: '厨师' },
      { emoji: '👩‍⚕️', word: 'nurse', phonetic: '/nɜːs/', cn: '护士' },
      { emoji: '👨‍🌾', word: 'farmer', phonetic: '/ˈfɑːmə/', cn: '农民' },
      { emoji: '👨‍✈️', word: 'pilot', phonetic: '/ˈpaɪlət/', cn: '飞行员' },
      { emoji: '🧑‍🎨', word: 'artist', phonetic: '/ˈɑːtɪst/', cn: '画家' },
      { emoji: '🧑‍🎤', word: 'singer', phonetic: '/ˈsɪŋə/', cn: '歌手' },
      { emoji: '👷', word: 'worker', phonetic: '/ˈwɜːkə/', cn: '工人' },
      { emoji: '🧑‍💻', word: 'coder', phonetic: '/ˈkəʊdə/', cn: '程序员' },
    ],
  },
  {
    name: '季节天气',
    nameEn: 'Seasons',
    icon: '🌤️',
    bgColor: '#e0f2f1',
    accent: '#00695c',
    cards: [
      { emoji: '🌸', word: 'spring', phonetic: '/sprɪŋ/', cn: '春天' },
      { emoji: '☀️', word: 'summer', phonetic: '/ˈsʌmə/', cn: '夏天' },
      { emoji: '🍂', word: 'autumn', phonetic: '/ˈɔːtəm/', cn: '秋天' },
      { emoji: '❄️', word: 'winter', phonetic: '/ˈwɪntə/', cn: '冬天' },
      { emoji: '☀️', word: 'sunny', phonetic: '/ˈsʌni/', cn: '晴天' },
      { emoji: '☁️', word: 'cloudy', phonetic: '/ˈklaʊdi/', cn: '多云' },
      { emoji: '🌧️', word: 'rainy', phonetic: '/ˈreɪni/', cn: '下雨' },
      { emoji: '💨', word: 'windy', phonetic: '/ˈwɪndi/', cn: '刮风' },
      { emoji: '🌨️', word: 'snowy', phonetic: '/ˈsnəʊi/', cn: '下雪' },
      { emoji: '🌡️', word: 'hot', phonetic: '/hɒt/', cn: '热' },
      { emoji: '🧊', word: 'cold', phonetic: '/kəʊld/', cn: '冷' },
      { emoji: '🌡️', word: 'warm', phonetic: '/wɔːm/', cn: '温暖' },
    ],
  },
  {
    name: '反义词',
    nameEn: 'Opposites',
    icon: '🔀',
    bgColor: '#f3e5f5',
    accent: '#6a1b9a',
    cards: [
      { emoji: '🐘🐁', word: 'big — small', phonetic: '/bɪɡ — smɔːl/', cn: '大 — 小' },
      { emoji: '📏✂️', word: 'long — short', phonetic: '/lɒŋ — ʃɔːt/', cn: '长 — 短' },
      { emoji: '🔥🧊', word: 'hot — cold', phonetic: '/hɒt — kəʊld/', cn: '热 — 冷' },
      { emoji: '🐇🐢', word: 'fast — slow', phonetic: '/fɑːst — sləʊ/', cn: '快 — 慢' },
      { emoji: '⬇️⬆️', word: 'up — down', phonetic: '/ʌp — daʊn/', cn: '上 — 下' },
      { emoji: '🚪🔒', word: 'open — close', phonetic: '/ˈəʊpən — kləʊz/', cn: '开 — 关' },
      { emoji: '😊😢', word: 'happy — sad', phonetic: '/ˈhæpi — sæd/', cn: '开心 — 难过' },
      { emoji: '👴👶', word: 'old — young', phonetic: '/əʊld — jʌŋ/', cn: '老 — 年轻' },
      { emoji: '📏🤏', word: 'tall — short', phonetic: '/tɔːl — ʃɔːt/', cn: '高 — 矮' },
      { emoji: '☀️🌙', word: 'day — night', phonetic: '/deɪ — naɪt/', cn: '白天 — 黑夜' },
      { emoji: '💧🏜️', word: 'wet — dry', phonetic: '/wet — draɪ/', cn: '湿 — 干' },
      { emoji: '🔄', word: 'in — out', phonetic: '/ɪn — aʊt/', cn: '里 — 外' },
    ],
  },
  {
    name: '社交用语',
    nameEn: 'Making Friends',
    icon: '🤝',
    bgColor: '#e8f5e9',
    accent: '#2e7d32',
    cards: [
      { emoji: '❓', word: 'What\'s your name?', phonetic: '/wɒts jɔː neɪm/', cn: '你叫什么名字？' },
      { emoji: '😊', word: 'My name is...', phonetic: '/maɪ neɪm ɪz/', cn: '我叫……' },
      { emoji: '🤝', word: 'Nice to meet you!', phonetic: '/naɪs tə miːt juː/', cn: '认识你很高兴！' },
      { emoji: '🎮', word: 'Let\'s play together!', phonetic: '/lets pleɪ təˈɡeðə/', cn: '一起玩吧！' },
      { emoji: '🙋', word: 'Can I join?', phonetic: '/kæn aɪ dʒɔɪn/', cn: '我可以加入吗？' },
      { emoji: '💖', word: 'You\'re my best friend!', phonetic: '/jɔː maɪ best frend/', cn: '你是我最好的朋友！' },
      { emoji: '👋', word: 'See you tomorrow!', phonetic: '/siː juː təˈmɒrəʊ/', cn: '明天见！' },
      { emoji: '👉', word: 'Come with me!', phonetic: '/kʌm wɪð miː/', cn: '跟我来！' },
      { emoji: '🤲', word: 'Share with me!', phonetic: '/ʃeə wɪð miː/', cn: '和我分享！' },
      { emoji: '🔄', word: 'Take turns!', phonetic: '/teɪk tɜːnz/', cn: '轮流来！' },
      { emoji: '🤗', word: 'You\'re so kind!', phonetic: '/jɔː səʊ kaɪnd/', cn: '你真好！' },
      { emoji: '💪', word: 'Let\'s help each other!', phonetic: '/lets help iːtʃ ˈʌðə/', cn: '我们互相帮助！' },
    ],
  },
  {
    name: '教室用语',
    nameEn: 'Classroom',
    icon: '🏫',
    bgColor: '#fffde7',
    accent: '#f57f17',
    cards: [
      { emoji: '🧍', word: 'Stand up!', phonetic: '/stænd ʌp/', cn: '站起来！' },
      { emoji: '🪑', word: 'Sit down!', phonetic: '/sɪt daʊn/', cn: '坐下！' },
      { emoji: '👂', word: 'Listen to me!', phonetic: '/ˈlɪsn tə miː/', cn: '听我说！' },
      { emoji: '👀', word: 'Look at me!', phonetic: '/lʊk æt miː/', cn: '看我！' },
      { emoji: '✋', word: 'Raise your hand!', phonetic: '/reɪz jɔː hænd/', cn: '举手！' },
      { emoji: '🤫', word: 'Be quiet!', phonetic: '/biː ˈkwaɪət/', cn: '安静！' },
      { emoji: '👏', word: 'Well done!', phonetic: '/wel dʌn/', cn: '做得好！' },
      { emoji: '📖', word: 'Open your book!', phonetic: '/ˈəʊpən jɔː bʊk/', cn: '打开书！' },
      { emoji: '📏', word: 'Line up!', phonetic: '/laɪn ʌp/', cn: '排队！' },
      { emoji: '🧹', word: 'Clean up!', phonetic: '/kliːn ʌp/', cn: '打扫！' },
      { emoji: '❓', word: 'Ready?', phonetic: '/ˈredi/', cn: '准备好了吗？' },
      { emoji: '🔔', word: 'Class begins!', phonetic: '/klɑːs bɪˈɡɪnz/', cn: '上课了！' },
    ],
  },
];

// ============================================================
// 卡片书 HTML 模板
// ============================================================
function generateHTML(s, totalPages, seriesIndex) {
  const CARDS_PER_PAGE = 6;
  const pages = [];
  for (let i = 0; i < s.cards.length; i += CARDS_PER_PAGE) {
    pages.push(s.cards.slice(i, i + CARDS_PER_PAGE));
  }

  // 封面页
  const coverPage = `
  <div class="page cover-page">
    <div class="cover-icon">${s.icon}</div>
    <div class="cover-title">${s.name}</div>
    <div class="cover-subtitle">${s.nameEn}</div>
    <div class="cover-count">${s.cards.length} ${['Daily Talk', 'Making Friends', 'Classroom'].includes(s.nameEn) ? 'Phrases' : 'Words'}</div>
    <div class="cover-deco">✦ ✦ ✦</div>
    <div class="cover-footer">幼儿趣味英语 · 卡片阅读本</div>
  </div>`;

  // 内容页
  const contentPages = pages
    .map((pageCards, pageIdx) => {
      const cardsHTML = pageCards
        .map(
          (c) => `
      <div class="card">
        <div class="emoji">${c.emoji}</div>
        <div class="word">${c.word}</div>
        <div class="phonetic">${c.phonetic}</div>
        <div class="cn">${c.cn}</div>
      </div>`
        )
        .join('\n');

      return `
  <div class="page">
    <div class="page-header">
      <span class="header-icon">${s.icon}</span>
      <span class="header-title">${s.name} ${s.nameEn}</span>
      <span class="header-page">${pageIdx + 1}/${pages.length}</span>
    </div>
    <div class="grid">
      ${cardsHTML}
    </div>
    <div class="page-footer">幼儿趣味英语 · 卡片阅读本 · 第${seriesIndex + 1}册</div>
  </div>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: 'Microsoft YaHei', 'PingFang SC', 'Noto Sans SC', sans-serif;
    background: #fff;
  }

  /* ---- 页面基础 ---- */
  .page {
    width: 210mm;
    min-height: 297mm;
    padding: 12mm 14mm;
    page-break-after: always;
    position: relative;
    background: ${s.bgColor};
  }

  /* ---- 封面 ---- */
  .cover-page {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, ${s.bgColor} 0%, #fff 100%);
    text-align: center;
  }
  .cover-icon {
    font-size: 100px;
    margin-bottom: 10mm;
  }
  .cover-title {
    font-size: 52px;
    font-weight: 900;
    color: ${s.accent};
    margin-bottom: 4mm;
  }
  .cover-subtitle {
    font-size: 32px;
    font-weight: 700;
    color: #666;
    margin-bottom: 6mm;
  }
  .cover-count {
    font-size: 20px;
    color: #999;
    margin-bottom: 10mm;
    padding: 3mm 8mm;
    border: 2px solid ${s.accent}44;
    border-radius: 20px;
  }
  .cover-deco {
    font-size: 24px;
    color: ${s.accent}88;
    letter-spacing: 8px;
    margin-bottom: 15mm;
  }
  .cover-footer {
    font-size: 14px;
    color: #bbb;
    position: absolute;
    bottom: 15mm;
  }

  /* ---- 内容页头部 ---- */
  .page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 6mm;
    padding-bottom: 3mm;
    border-bottom: 2px solid ${s.accent}33;
  }
  .header-icon { font-size: 22px; }
  .header-title {
    font-size: 18px;
    font-weight: 700;
    color: ${s.accent};
  }
  .header-page {
    font-size: 14px;
    color: #999;
  }

  /* ---- 卡片网格 ---- */
  .grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 6mm;
    padding: 0 2mm;
  }

  .card {
    background: #fff;
    border-radius: 14px;
    border: 2.5px solid ${s.accent}30;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 7mm 4mm;
    min-height: 62mm;
    box-shadow: 0 3px 10px rgba(0,0,0,0.05);
  }

  .emoji {
    font-size: 56px;
    line-height: 1.2;
    margin-bottom: 2mm;
  }

  .word {
    font-size: 26px;
    font-weight: 900;
    color: #333;
    letter-spacing: 1px;
    text-transform: lowercase;
    margin-bottom: 1mm;
  }

  .phonetic {
    font-size: 14px;
    color: #888;
    font-style: italic;
    margin-bottom: 1mm;
  }

  .cn {
    font-size: 18px;
    font-weight: 700;
    color: ${s.accent};
  }

  /* ---- 页脚 ---- */
  .page-footer {
    position: absolute;
    bottom: 10mm;
    left: 0;
    right: 0;
    text-align: center;
    font-size: 12px;
    color: #ccc;
  }
</style>
</head>
<body>
${coverPage}
${contentPages}
</body>
</html>`;
}

// ============================================================
// 主流程
// ============================================================
async function main() {
  const outputDir = path.join(__dirname, 'output');
  // 用临时目录避免文件被占用
  const tmpDir = path.join(__dirname, '.tmp_output');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  console.log('🚀 开始生成幼儿英语卡片阅读本...\n');
  console.log(`📚 共 ${series.length} 个系列，${series.reduce((s, sr) => s + sr.cards.length, 0)} 张卡片\n`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  for (let i = 0; i < series.length; i++) {
    const s = series[i];
    const num = String(i + 1).padStart(2, '0');
    const filename = `${num}-${s.name}${s.nameEn}.pdf`;
    const filepath = path.join(outputDir, filename);

    const tmpPath = path.join(tmpDir, filename);
    const html = generateHTML(s, Math.ceil(s.cards.length / 6) + 1, i);
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.pdf({
      path: tmpPath,
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });
    await page.close();

    // 复制到 output 目录（跳过被占用的）
    try {
      fs.copyFileSync(tmpPath, filepath);
      fs.unlinkSync(tmpPath);
      const size = (fs.statSync(filepath).size / 1024).toFixed(0);
      console.log(`  ✅ ${filename}  (${s.cards.length}张卡片, ${size}KB)`);
    } catch (e) {
      console.log(`  ⚠️  ${filename}  (文件被占用，已跳过)`);
    }
  }

  await browser.close();
  // 清理临时目录
  try { fs.rmdirSync(tmpDir); } catch (e) {}

  // 统计
  const totalSize = (
    fs.readdirSync(outputDir).reduce((sum, f) => sum + fs.statSync(path.join(outputDir, f)).size, 0) /
    1024 /
    1024
  ).toFixed(1);
  console.log(`\n🎉 全部完成！共 ${series.length} 个PDF，总计 ${totalSize}MB`);
  console.log(`📁 输出目录: ${outputDir}`);
}

main().catch((err) => {
  console.error('生成失败:', err);
  process.exit(1);
});
