(() => {
  document.title = 'LoveTree · Living Character World V2';
  document.querySelector('.brand small').textContent = 'LIVING CHARACTER WORLD · V2';
  document.querySelector('.count').innerHTML = '4 LIVING CAST · 48 EXPRESSION ASSETS<br>RANDOM FACE REACTION · DRAGGABLE LUBT';
  document.getElementById('autoLife').textContent = 'AUTO LIFE · ON';

  const choose = list => list[Math.floor(Math.random() * list.length)];
  const allEmotionNames = emos.map(item => item[0]);
  const effectRoot = document.getElementById('petals');

  const characterLines = {
    neutral: ['잠깐, 네 이야기를 듣고 있어.', '편하게 있어도 괜찮아.'],
    smile: ['네가 와서 조금 기뻐졌어.', '이 표정은 네가 만든 거야.'],
    laugh: ['아, 정말 웃겨!', '이 순간은 꼭 저장해 줘.'],
    wink: ['이건 우리끼리 비밀이야.', '방금 봤지?'],
    shy: ['너무 오래 바라보면 부끄러워.', '조금만 천천히 다가와 줘.'],
    surprise: ['어? 정말?', '그건 생각하지 못했어!'],
    angry: ['잠깐, 지금은 조금 화났어.', '내 마음도 들어줄래?'],
    sing: ['이 부분은 너를 위해 부를게.', '우리의 순간을 노래로 남기자.'],
    talk: ['하고 싶은 이야기가 있어.', '오늘 있었던 일을 들려줄게.'],
    cry: ['조금 울어도 곁에 있어 줘.', '이 눈물도 언젠가 기억이 되겠지.'],
    touched: ['이 순간을 오래 기억할게.', '마음이 따뜻해졌어.'],
    sleepy: ['조금만 더 곁에 있어 줘.', '꿈에서도 다시 만나자.']
  };

  const lubtTalk = {
    greeting: [
      '안녕! 나는 러브트리요정 럽트야.', '오늘은 어떤 마음을 만나러 왔어?',
      '네가 고른 순간을 따라왔어.', '럽트가 옆에서 도와줄게.',
      '반가워. 오늘의 기억을 시작해 볼까?'
    ],
    idle: [
      '가만히 있어도 마음은 계속 움직여.', '얼굴을 눌러 보면 다른 감정이 깨어나.',
      '나를 잡아서 원하는 곳으로 옮겨 봐!', '좋아하는 표정은 꼭 저장해 둬.',
      '방금 작은 감정 하나가 피어났어.', '오늘의 마음은 무슨 색일까?',
      '모든 표정에는 다음 이야기가 숨어 있어.', '오래 누르면 비밀 반응이 나타나.',
      '더블클릭하면 특별한 순간이 열려.', '네가 바라보면 캐릭터도 널 바라봐.'
    ],
    drag: [
      '와, 날 직접 옮겨 줬네!', '여기서 보는 풍경도 예쁘다.',
      '잠시 여기 있다가 다시 날아갈게.', '살살 옮겨 줘. 간지러워!',
      '새로운 자리를 찾았어!', '네 곁으로 더 가까이 왔어.'
    ],
    save: [
      '새로운 기억 가지가 피어났어!', '이 순간은 러브트리에 안전하게 보관했어.',
      '좋아하는 마음이 꽃 한 송이가 됐어.', '저장 완료! 다음 순간도 만나 보자.',
      '기억의 빛이 하나 더 늘어났어.', '네 러브트리가 조금 더 자랐어.'
    ],
    scan: [
      '럽트가 지금 감정을 스캔하고 있어!', '두근거림이 아주 선명하게 보여.',
      '웃음과 설렘이 함께 발견됐어.', '이 마음은 오래 남을 것 같아.',
      '감정 파장을 따라가 볼게.', '새로운 표정 신호를 찾았어!'
    ],
    special: [
      '비밀 순간을 발견했어!', '아주 깊은 감정이 깨어났어.',
      '이건 특별한 러브트리 반응이야.', '마음속 꽃이 한꺼번에 피어났어!',
      '오래 바라본 사람만 만날 수 있는 순간이야.', '숨겨진 기억 문이 열렸어.'
    ],
    reply: [
      '그 말을 기억 가지에 걸어 둘게.', '캐릭터도 네 말을 들은 것 같아.',
      '따뜻한 문장이야. 오래 간직하자.', '그 마음에 어울리는 빛을 찾아볼게.',
      '이 대사는 오늘의 장면이 되었어.', '다음에는 어떤 말을 들려줄 거야?',
      '네 문장이 캐릭터의 표정을 바꿨어.', '럽트도 그 말이 마음에 들어.',
      '방금 새로운 이야기 한 줄이 생겼어.', '이 순간을 나무에 연결해 둘게.'
    ],
    emotion: {
      neutral: ['조용한 마음도 소중해.', '잠시 숨을 고르는 중이야.'],
      smile: ['웃음의 빛이 켜졌어!', '이 미소는 꼭 기억하자.'],
      laugh: ['행복 에너지가 넘치고 있어!', '웃음이 꽃가루처럼 번지고 있어.'],
      wink: ['비밀 신호를 받았어!', '둘만 아는 순간이 생겼네.'],
      shy: ['수줍은 분홍빛이 보여.', '마음이 살짝 숨어 버렸어.'],
      surprise: ['새로운 감정이 번쩍 나타났어!', '놀라움 신호가 아주 커!'],
      angry: ['뜨거운 마음이 느껴져.', '화난 마음도 소중히 들어 줘.'],
      sing: ['노래의 파동이 퍼지고 있어!', '이 순간에 멜로디를 연결할게.'],
      talk: ['이야기가 시작됐어.', '캐릭터의 목소리에 귀 기울여 봐.'],
      cry: ['눈물도 기억을 반짝이게 해.', '슬픈 마음 곁에 내가 있을게.'],
      touched: ['마음속 꽃이 피어났어.', '아주 따뜻한 감정이야.'],
      sleepy: ['꿈의 문이 천천히 열려.', '포근한 기억 속으로 들어가 볼까?']
    }
  };

  const poseForEmotion = {
    neutral: 'idle', smile: 'heart', laugh: 'bloom', wink: 'magic',
    shy: 'heart', surprise: 'scan', angry: 'magic', sing: 'guide',
    talk: 'guide', cry: 'heart', touched: 'bloom', sleepy: 'idle'
  };

  const fxMap = {
    neutral: ['star', '·', 6], smile: ['heart', '♥', 10],
    laugh: ['star', '✦', 20], wink: ['star', '✧', 12],
    shy: ['heart', '♡', 12], surprise: ['ring', '◉', 14],
    angry: ['fire', '◆', 16], sing: ['note', '♪', 14],
    talk: ['dot', '…', 8], cry: ['tear', '◆', 15],
    touched: ['heart', '♥', 22], sleepy: ['sleep', 'Z', 10]
  };

  function burstEmotion(name, multiplier = 1) {
    const spec = fxMap[name] || fxMap.neutral;
    const total = Math.round(spec[2] * multiplier);
    for (let i = 0; i < total; i++) {
      const particle = document.createElement('i');
      particle.className = `fx fx-${spec[0]}`;
      particle.textContent = spec[1];
      particle.style.left = `${38 + Math.random() * 28}%`;
      particle.style.top = `${38 + Math.random() * 28}%`;
      particle.style.setProperty('--dx', `${Math.random() * 520 - 260}px`);
      const down = name === 'cry' ? 230 + Math.random() * 150 : Math.random() * 330 - 230;
      particle.style.setProperty('--dy', `${down}px`);
      particle.style.setProperty('--rot', `${Math.random() * 620 - 310}deg`);
      particle.style.setProperty('--scale', `${.75 + Math.random() * 1.2}`);
      particle.style.setProperty('--dur', `${1.5 + Math.random() * 1.2}s`);
      particle.style.setProperty('--delay', `${Math.random() * .18}s`);
      effectRoot.appendChild(particle);
      setTimeout(() => particle.remove(), 3100);
    }
  }

  const originalSetEmotion = setEmotion;
  setEmotion = function livingSetEmotion(name, user = false) {
    originalSetEmotion(name, user);
    if (user) burstEmotion(name);
  };

  let lubtActionTimer;
  let lubtResumeTimer;
  let specialActive = false;
  const dragState = { active: false, moved: false, skipClick: false, x: 0, y: 0 };

  function setLubtBubble(pose, message) {
    const pool = Array.isArray(message) ? message : [message];
    lubtImg.src = `assets/lubt/${lubtPoses[pose] || lubtPoses.idle}`;
    document.getElementById('lubtBubble').textContent = choose(pool.filter(Boolean));
    lubt.classList.add('talk');
  }

  function resumeLubtFlight(delay = 2200) {
    clearTimeout(lubtResumeTimer);
    lubtResumeTimer = setTimeout(() => {
      if (dragState.active) return;
      lubt.classList.add('follow');
      lubt.style.left = '300px';
      lubt.style.top = '95px';
      setTimeout(() => lubt.classList.remove('follow'), 1050);
    }, delay);
  }

  callLubt = function livingCallLubt(pose = 'idle', message = lubtTalk.idle) {
    if (specialActive && pose === 'idle') return;
    clearTimeout(lubtActionTimer);
    clearTimeout(lubtResumeTimer);
    if (!dragState.active) {
      lubt.classList.add('follow');
      lubt.style.left = `${18 + Math.random() * 28}vw`;
      lubt.style.top = `${9 + Math.random() * 46}vh`;
    }
    setLubtBubble(pose, message);
    lubtActionTimer = setTimeout(() => {
      lubt.classList.remove('talk');
      lubtImg.src = 'assets/lubt/lubt-idle.png';
      resumeLubtFlight(500);
    }, 3600);
  };

  const dragHint = document.createElement('div');
  dragHint.className = 'lubt-drag-hint';
  dragHint.textContent = 'DRAG LUBT';
  lubt.appendChild(dragHint);
  lubtImg.draggable = false;

  lubt.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    const rect = lubt.getBoundingClientRect();
    clearTimeout(lubtActionTimer);
    clearTimeout(lubtResumeTimer);
    dragState.active = true;
    dragState.moved = false;
    dragState.x = event.clientX - rect.left;
    dragState.y = event.clientY - rect.top;
    lubt.classList.add('follow', 'dragging');
    lubt.style.left = `${rect.left}px`;
    lubt.style.top = `${rect.top}px`;
    lubt.setPointerCapture(event.pointerId);
  });

  lubt.addEventListener('pointermove', event => {
    if (!dragState.active) return;
    dragState.moved = true;
    const left = Math.max(0, Math.min(window.innerWidth - lubt.offsetWidth, event.clientX - dragState.x));
    const top = Math.max(74, Math.min(window.innerHeight - lubt.offsetHeight, event.clientY - dragState.y));
    lubt.style.left = `${left}px`;
    lubt.style.top = `${top}px`;
  });

  function finishLubtDrag(event) {
    if (!dragState.active) return;
    dragState.active = false;
    lubt.classList.remove('dragging');
    if (lubt.hasPointerCapture?.(event.pointerId)) lubt.releasePointerCapture(event.pointerId);
    if (dragState.moved) {
      dragState.skipClick = true;
      setLubtBubble('guide', lubtTalk.drag);
      setTimeout(() => lubt.classList.remove('talk'), 2600);
      resumeLubtFlight(2400);
    }
  }

  lubt.addEventListener('pointerup', finishLubtDrag);
  lubt.addEventListener('pointercancel', finishLubtDrag);
  lubt.onclick = () => {
    if (dragState.skipClick) {
      dragState.skipClick = false;
      return;
    }
    callLubt('magic', lubtTalk.idle);
  };

  const gestureTip = document.createElement('div');
  gestureTip.className = 'gesture-tip';
  gestureTip.textContent = 'FACE · CLICK RANDOM  /  HOLD OR DOUBLE CLICK · SECRET MOMENT';
  stage.appendChild(gestureTip);

  const faceHit = document.createElement('div');
  faceHit.className = 'face-hit';
  faceHit.setAttribute('aria-label', 'Interactive character face');
  stage.appendChild(faceHit);
  wrap.onclick = null;
  wrap.ondblclick = null;
  wrap.onmouseenter = null;

  let faceClickTimer;
  let holdTimer;
  let held = false;
  let lastFaceClickAt = 0;

  function randomFaceReaction() {
    const pool = allEmotionNames.filter(name => name !== emotion);
    const next = choose(pool);
    setEmotion(next, true);
    showSpeech(choose(characterLines[next]));
    setTimeout(() => callLubt(poseForEmotion[next], lubtTalk.emotion[next]), 180);
  }

  function specialMoment() {
    clearTimeout(faceClickTimer);
    clearTimeout(hoverTimer);
    hoverSmile = false;
    specialActive = true;
    setEmotion('touched', true);
    burstEmotion('touched', 2.2);
    burstEmotion('star', 1.4);
    showSpeech('이 순간은 오래 기억할게.');
    stage.classList.add('special');
    document.getElementById('log').textContent = 'SECRET MOMENT · deep connection · full bloom';
    callLubt('bloom', lubtTalk.special);
    setTimeout(() => {
      stage.classList.remove('special');
      specialActive = false;
    }, 1800);
  }

  faceHit.onmouseenter = () => {
    clearTimeout(hoverTimer);
    hoverTimer = setTimeout(() => {
      if (!specialActive && !talkTimer && !singTimer) {
        hoverSmile = true;
        setEmotion('smile');
      }
    }, 280);
  };
  faceHit.onclick = () => {
    if (held) {
      held = false;
      return;
    }
    if (specialActive) return;
    const now = Date.now();
    if (now - lastFaceClickAt < 360) {
      lastFaceClickAt = 0;
      clearTimeout(faceClickTimer);
      specialMoment();
      return;
    }
    lastFaceClickAt = now;
    clearTimeout(faceClickTimer);
    faceClickTimer = setTimeout(randomFaceReaction, 220);
  };
  faceHit.ondblclick = event => {
    event.preventDefault();
    clearTimeout(faceClickTimer);
    if (!specialActive) specialMoment();
  };
  faceHit.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    held = false;
    clearTimeout(holdTimer);
    holdTimer = setTimeout(() => {
      held = true;
      specialMoment();
    }, 680);
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(type => {
    faceHit.addEventListener(type, () => clearTimeout(holdTimer));
  });

  document.getElementById('heartBtn').onclick = () => {
    setEmotion('touched', true);
    showSpeech(choose(characterLines.touched));
    callLubt('heart', lubtTalk.emotion.touched);
  };
  document.getElementById('surpriseBtn').onclick = () => {
    setEmotion('surprise', true);
    showSpeech(choose(characterLines.surprise));
    callLubt('scan', lubtTalk.emotion.surprise);
  };
  document.getElementById('lubtBtn').onclick = () => callLubt('scan', lubtTalk.scan);

  const sayButton = document.getElementById('sayBtn');
  const phraseInput = document.getElementById('phrase');
  sayButton.onclick = () => {
    const text = phraseInput.value.trim() || '오늘도 네 순간을 기억할게.';
    showSpeech(text);
    setEmotion('talk', true);
    setTimeout(() => callLubt('guide', lubtTalk.reply), 850);
  };
  phraseInput.addEventListener('keydown', event => {
    if (event.key === 'Enter') sayButton.click();
  });

  document.getElementById('saveBtn').onclick = event => {
    burstEmotion('touched', 1.7);
    event.currentTarget.textContent = '✓ LIVING MOMENT SAVED';
    callLubt('bloom', lubtTalk.save);
    setTimeout(() => { event.currentTarget.textContent = '♡ SAVE THIS LIVING MOMENT'; }, 3200);
  };

  setInterval(() => {
    if (!specialActive && !dragState.active && !lubt.classList.contains('talk') && Math.random() > .22) {
      callLubt('idle', lubtTalk.idle);
    }
  }, 12000);

  setTimeout(() => callLubt('idle', lubtTalk.greeting), 900);
})();
