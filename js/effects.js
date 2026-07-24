// ========== 粒子效果 ==========
function spawnParticles() {
  const colors = ['#E8B4B8', '#C4A8D9', '#A8C5C0', '#E4D5B0', '#E8C9A0', '#B0C4D9'];
  particles.innerHTML = '';
  for (let i = 0; i < 12; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const angle = (Math.PI * 2 / 12) * i + Math.random() * 0.5;
    const dist = 60 + Math.random() * 80;
    p.style.setProperty('--px', `${Math.cos(angle) * dist}px`);
    p.style.setProperty('--py', `${Math.sin(angle) * dist}px`);
    p.style.background = colors[i % colors.length];
    p.style.width = `${4 + Math.random() * 8}px`;
    p.style.height = p.style.width;
    p.style.left = '50%';
    p.style.top = '50%';
    p.style.marginLeft = '-4px';
    p.style.marginTop = '-4px';
    p.style.animationDelay = `${Math.random() * 0.3}s`;
    particles.appendChild(p);
  }
}

// ========== 彩纸庆祝 ==========
function showConfetti() {
  const colors = ['#E8B4B8', '#C4A8D9', '#A8C5C0', '#E4D5B0', '#E8C9A0', '#B0C4D9', '#B5C9B0'];
  confettiContainer.innerHTML = '';
  for (let i = 0; i < 30; i++) {
    const c = document.createElement('div');
    c.className = 'confetti';
    c.style.left = `${Math.random() * 100}%`;
    c.style.top = `${-Math.random() * 20}%`;
    c.style.background = colors[Math.floor(Math.random() * colors.length)];
    c.style.width = `${6 + Math.random() * 8}px`;
    c.style.height = `${6 + Math.random() * 8}px`;
    c.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
    c.style.setProperty('--dur', `${1.5 + Math.random() * 2}s`);
    c.style.animationDelay = `${Math.random() * 1.5}s`;
    confettiContainer.appendChild(c);
  }
  setTimeout(() => confettiContainer.innerHTML = '', 4000);
}

