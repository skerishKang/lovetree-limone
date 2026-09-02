
(() => {
  'use strict';
  const stage = document.getElementById('stage');
  const video = document.getElementById('film');
  const source = document.getElementById('filmSource');
  const scrim = document.getElementById('scrim');
  const stateChip = document.getElementById('stateChip');
  const progressCount = document.getElementById('progressCount');
  const progressLabel = document.getElementById('progressLabel');
  const progressRail = document.getElementById('progressRail');
  const playPause = document.getElementById('playPause');
  const muteBtn = document.getElementById('muteBtn');
  const reducedPlay = document.getElementById('reducedPlay');
  const modal = document.getElementById('modal');
  const closeModal = document.getElementById('closeModal');
  const routeNotice = document.getElementById('routeNotice');
  const demoPlant = document.getElementById('demoPlant');
  const demoStatus = document.getElementById('demoStatus');
  const composer = modal.querySelector('.composer');
  const composerTitle = document.getElementById('composerTitle');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const params = new URLSearchParams(location.search);

  const ROUTES = Object.freeze({
    firstMoment: {
      track: 'FIRST_JOURNEY',
      path: '../../02_첫여정통합-3개html합본/02_러브트리_첫여정통합_v1.html'
    },
    moment57: {
      track: 57,
      path: '../../57_리빙글라스_모먼트카드/★_최종_버전1.2_리빙글라스_모먼트카드.html'
    },
    moment58: {
      track: 58,
      path: '../../58_리빙메모리_핀보드_시네마틱/★_최종_58_리빙메모리_핀보드.html'
    },
    moment62: {
      track: 62,
      path: '../../62_기억조각상_원형레일전시/현재후보.html'
    },
    moment63: {
      track: 63,
      path: '../../63_모먼트필드_3D뷰스튜디오/버전1.2_프리셋시인성·자동맞춤·실제동작보정_후보/현재후보.html'
    },
    moment64: {
      track: 64,
      path: '../../64_부유모먼트_웰컴오빗_입장포털/현재후보.html'
    },
    connection11: {
      track: 11,
      path: '../../11_메모리그래프_관측소/01_메모리그래프_관측소_용광로코어.html'
    },
    connection16: {
      track: 16,
      path: '../../16_메모리토폴로지_관계망분석실/01_메모리토폴로지_현재채택_관계망분석실_v1.html'
    },
    tree35: {
      track: 35,
      path: '../../35_LP플레이어/01_LP플레이어_영상기억.html'
    },
    tree39: {
      track: 39,
      path: '../../39_LP커버플로우_미디어갤러리/01_LP커버플로우_영상갤러리.html'
    },
    tree46: {
      track: 46,
      path: '../../46_팝업시즌_기억책/01_팝업시즌_기억책.html'
    }
  });
  const HANDOFF_KEY = 'lovetree.frontdoor.handoff';
  let routeNoticeTimer = 0;
  let restorePending = null;

  function resolveLocalRoute(relativePath){
    if (location.protocol !== 'file:') throw new Error('LOCAL_FILE_REQUIRED');
    if (!relativePath.toLowerCase().endsWith('.html')) throw new Error('TARGET_NOT_HTML');
    return new URL(relativePath, location.href).href;
  }

  function readHandoff(){
    try{
      const raw = sessionStorage.getItem(HANDOFF_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed?.source !== 'track47-frontdoor' || parsed?.sourceVersion !== 'V4.2.5') return null;
      return parsed;
    }catch(_){ return null; }
  }

  function saveHandoff(target){
    const payload = {
      source: 'track47-frontdoor',
      sourceVersion: 'V4.2.5',
      target,
      videoTime: Number((video.currentTime || 0).toFixed(3)),
      act: +stage.dataset.act || 1,
      scrollY: Math.round(scrollY),
      timestamp: Date.now()
    };
    try{ sessionStorage.setItem(HANDOFF_KEY, JSON.stringify(payload)); }catch(_){}
    return payload;
  }

  function showRouteNotice(){
    clearTimeout(routeNoticeTimer);
    routeNotice.classList.add('show');
    routeNoticeTimer = setTimeout(()=>routeNotice.classList.remove('show'), 2800);
  }

  function setupPinnedNavMenus(){
    const groups = [...document.querySelectorAll('.nav-group')];
    const closeGroup = group => {
      group.classList.remove('is-open');
      group.querySelector('[data-nav-menu]')?.setAttribute('aria-expanded','false');
    };
    const closeAll = except => groups.forEach(group => { if (group !== except) closeGroup(group); });

    groups.forEach(group => {
      const trigger = group.querySelector('[data-nav-menu]');
      if (!trigger) return;
      trigger.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        const willOpen = !group.classList.contains('is-open');
        closeAll(group);
        group.classList.toggle('is-open', willOpen);
        trigger.setAttribute('aria-expanded', String(willOpen));
        if (willOpen) group.querySelector('.nav-option')?.focus({preventScroll:true});
      });
      group.querySelectorAll('.nav-option').forEach(option => {
        option.addEventListener('click', () => closeAll());
      });
    });

    document.addEventListener('pointerdown', e => {
      if (!e.target.closest('.nav-group')) closeAll();
    });
    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape') return;
      const activeGroup = document.activeElement?.closest?.('.nav-group') || groups.find(g=>g.classList.contains('is-open'));
      closeAll();
      activeGroup?.querySelector('[data-nav-menu]')?.focus({preventScroll:true});
    });
  }

  function wireRoutes(){
    document.querySelectorAll('[data-route]').forEach(el=>{
      const key = el.dataset.route;
      const route = ROUTES[key];
      if (!route) return;
      if (location.protocol === 'file:'){
        el.href = resolveLocalRoute(route.path);
      }else{
        el.href = '#';
      }
      el.addEventListener('click', e=>{
        if (key === 'firstMoment' && params.get('demoComposer') === '1'){
          e.preventDefault();
          openComposer();
          return;
        }
        if (location.protocol !== 'file:'){
          e.preventDefault();
          showRouteNotice();
          return;
        }
        saveHandoff(key);
        // Native anchor navigation remains authoritative: same-tab by default,
        // while Ctrl/Cmd click and browser Back semantics stay intact.
      });
      el.addEventListener('auxclick', ()=>{
        if (location.protocol === 'file:') saveHandoff(key);
      });
    });
  }

  function applyRestoredHandoff(payload){
    if (!payload || failure) return false;
    const t = clamp(Number(payload.videoTime) || 0, 0, Math.max(.001,duration-.001));
    const y = clamp(Number(payload.scrollY) || 0, 0, maxScroll());
    video.pause();
    userAuthority = false;
    stillMode = false;
    stage.classList.remove('video-failed');
    setMode(MODES.PAUSED);
    video.currentTime = t;
    targetTime = scrubTime = t;
    scrollTo({top:y,behavior:'auto'});
    applyAct(t);
    return true;
  }

  function navigationIsBackForward(){
    const entry = performance.getEntriesByType?.('navigation')?.[0];
    return entry?.type === 'back_forward';
  }


  const MODES = Object.freeze({
    AUTO:'AUTO_CINEMATIC', USER:'USER_CONTROLLED', PAUSED:'PAUSED', COMPLETED:'COMPLETED', REPLAY:'REPLAY'
  });
  const ACTS = [
    {id:1,start:0,end:2.450,key:0.900,label:'FIRST FEELING'},
    {id:2,start:2.450,end:6.100,key:4.100,label:'MOMENT'},
    {id:3,start:6.100,end:10.650,key:7.500,label:'BLOOM'},
    {id:4,start:10.650,end:12.250,key:11.100,label:'WHY NEXT'},
    {id:5,start:12.250,end:14.187007,key:13.200,label:'LOVETREE'}
  ];
  let mode = MODES.AUTO;
  let priorMode = MODES.AUTO;
  let duration = ACTS[4].end;
  let targetTime = 0;
  let scrubTime = 0;
  let raf = 0;
  let userAuthority = false;
  let stillMode = reduceMotion.matches;
  let dragRail = false;
  let failure = false;

  function setMode(next){
    mode = next;
    stage.dataset.mode = next;
    stateChip.textContent = next;
    playPause.textContent = video.paused ? 'Play' : 'Pause';
  }
  function maxScroll(){ return Math.max(1, document.documentElement.scrollHeight - innerHeight); }
  function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }
  function timeToAct(t){ return ACTS.find(a => t < a.end) || ACTS[ACTS.length-1]; }
  function applyAct(t){
    stage.classList.toggle('cta-ready', t >= 12.900 || mode === MODES.COMPLETED);
    const a = timeToAct(t);
    if (+stage.dataset.act !== a.id){
      stage.dataset.act = a.id;
      scrim.dataset.act = a.id;
      document.querySelectorAll('[data-copy-act]').forEach(el => el.classList.toggle('is-active', +el.dataset.copyAct === a.id));
      progressCount.textContent = String(a.id).padStart(2,'0') + ' / 05';
      progressLabel.textContent = a.label;
    }
    const p = clamp(t / duration,0,1);
    document.documentElement.style.setProperty('--stage-progress', p.toFixed(5));
    progressRail.setAttribute('aria-valuenow', Math.round(p*100));
  }
  function tickVisual(){
    if (mode === MODES.AUTO || mode === MODES.REPLAY || mode === MODES.COMPLETED || mode === MODES.PAUSED) applyAct(video.currentTime || 0);
    requestAnimationFrame(tickVisual);
  }
  function scrubLoop(){
    if (userAuthority && !stillMode && !failure){
      const delta = targetTime - scrubTime;
      scrubTime += delta * 0.16;
      if (Math.abs(delta) < 0.006) scrubTime = targetTime;
      if (Math.abs(video.currentTime - scrubTime) > 0.008) video.currentTime = clamp(scrubTime,0,duration-.001);
      applyAct(scrubTime);
    }
    raf = requestAnimationFrame(scrubLoop);
  }
  function syncScrollToCurrent(extraPx=0){
    const y = clamp((video.currentTime / duration) * maxScroll() + extraPx,0,maxScroll());
    scrollTo({top:y,behavior:'auto'});
    targetTime = (y / maxScroll()) * duration;
    scrubTime = video.currentTime;
  }
  function enterUser(extraPx=0){
    if (failure || stillMode) return;
    if (!userAuthority){
      video.pause();
      userAuthority = true;
      syncScrollToCurrent(extraPx);
      setMode(MODES.USER);
    }
  }
  function onScroll(){
    if (stillMode && reduceMotion.matches){
      const p = clamp(scrollY / maxScroll(),0,1);
      const idx = Math.min(4,Math.floor(p*5));
      const a = ACTS[idx];
      if (Math.abs(video.currentTime-a.key)>.05) video.currentTime = a.key;
      applyAct(a.key);
      return;
    }
    if (!userAuthority) return;
    targetTime = clamp((scrollY / maxScroll()) * duration,0,duration-.001);
  }
  function autoplay(){
    if (reduceMotion.matches || failure) return;
    userAuthority = false;
    stillMode = false;
    video.muted = true;
    video.play().then(() => setMode(MODES.AUTO)).catch(() => { priorMode=MODES.AUTO; setMode(MODES.PAUSED); playPause.textContent='Play'; });
  }
  function replay(){
    failure = false;
    stage.classList.remove('video-failed');
    setMode(MODES.REPLAY);
    userAuthority = false;
    stillMode = false;
    scrollTo({top:0,behavior:'auto'});
    video.currentTime = 0;
    targetTime = 0; scrubTime = 0;
    video.muted = true;
    video.play().then(() => setMode(MODES.AUTO)).catch(() => setMode(MODES.PAUSED));
  }
  function pauseToggle(){
    if (failure) return;
    if (video.paused){
      if (userAuthority){ userAuthority=false; }
      video.play().then(() => setMode(priorMode===MODES.REPLAY?MODES.REPLAY:MODES.AUTO)).catch(()=>setMode(MODES.PAUSED));
    } else {
      priorMode = mode;
      video.pause();
      setMode(MODES.PAUSED);
    }
  }
  function reducedSetup(){
    stage.classList.toggle('reduced-motion', reduceMotion.matches);
    if (reduceMotion.matches){
      stillMode = true; userAuthority = false; video.pause();
      video.currentTime = ACTS[0].key; applyAct(ACTS[0].key); setMode(MODES.PAUSED);
    } else if (!failure){ autoplay(); }
  }
  function failVideo(){
    failure = true; userAuthority=false; stillMode=false; video.pause(); stage.classList.add('video-failed'); setMode(MODES.PAUSED);
  }
  function openComposer(){
    modal.classList.add('open');
    composerTitle.textContent = '어떤 순간이 마음에 남았나요?';
    demoStatus.textContent = '저장 기능은 연결하지 않았습니다.';
    setTimeout(()=> document.getElementById('momentUrl').focus(),0);
  }
  function closeComposer(){ modal.classList.remove('open'); composerTitle.textContent='어떤 순간이 마음에 남았나요?'; }
  function railSeek(clientY){
    const r=progressRail.getBoundingClientRect();
    const p=clamp((clientY-r.top)/r.height,0,1);
    if (reduceMotion.matches){
      const idx=Math.min(4,Math.floor(p*5)); const a=ACTS[idx]; video.currentTime=a.key; applyAct(a.key); scrollTo({top:(idx/4)*maxScroll(),behavior:'auto'}); return;
    }
    enterUser();
    const y=p*maxScroll(); scrollTo({top:y,behavior:'auto'}); targetTime=p*duration; scrubTime=targetTime; video.currentTime=targetTime; applyAct(targetTime);
  }

  video.addEventListener('loadedmetadata',()=>{
    if (Number.isFinite(video.duration)) duration=video.duration;
    targetTime=video.currentTime; scrubTime=video.currentTime; applyAct(video.currentTime);
    if (restorePending){ const pending=restorePending; restorePending=null; applyRestoredHandoff(pending); }
  });
  video.addEventListener('ended',()=>{ applyAct(duration-.001); setMode(MODES.COMPLETED); });
  video.addEventListener('error',failVideo);
  video.addEventListener('play',()=>{ playPause.textContent='Pause'; });
  video.addEventListener('pause',()=>{ playPause.textContent='Play'; });
  addEventListener('scroll',onScroll,{passive:true});
  addEventListener('wheel',e=>{ if (!userAuthority && !reduceMotion.matches && !failure){ e.preventDefault(); enterUser(e.deltaY); } },{passive:false});
  addEventListener('touchstart',()=>{ if (!userAuthority && !reduceMotion.matches && !failure) enterUser(); },{passive:true});
  addEventListener('keydown',e=>{
    if (['ArrowDown','ArrowUp','PageDown','PageUp',' '].includes(e.key) && !reduceMotion.matches && !failure){
      if (!userAuthority){ e.preventDefault(); enterUser(e.key==='ArrowUp'||e.key==='PageUp'?-innerHeight*.55:innerHeight*.55); }
    }
    if (e.key==='Escape') closeComposer();
  });
  progressRail.addEventListener('pointerdown',e=>{ dragRail=true; progressRail.setPointerCapture(e.pointerId); railSeek(e.clientY); });
  progressRail.addEventListener('pointermove',e=>{ if(dragRail) railSeek(e.clientY); });
  progressRail.addEventListener('pointerup',()=>{ dragRail=false; });
  progressRail.addEventListener('keydown',e=>{
    if (!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) return;
    e.preventDefault(); const dir=(e.key==='ArrowUp'||e.key==='ArrowRight')?1:-1;
    const p=clamp((video.currentTime/duration)+(dir*.04),0,1); railSeek(progressRail.getBoundingClientRect().top + p*progressRail.clientHeight);
  });
  playPause.addEventListener('click',pauseToggle);
  muteBtn.addEventListener('click',()=>{ video.muted=!video.muted; muteBtn.textContent=video.muted?'Muted':'Sound'; muteBtn.setAttribute('aria-pressed',String(video.muted)); });
  reducedPlay.addEventListener('click',()=>{ stillMode=false; stage.classList.remove('reduced-motion'); video.currentTime=0; scrollTo({top:0}); video.muted=true; video.play().then(()=>setMode(MODES.AUTO)).catch(()=>setMode(MODES.PAUSED)); });
  document.querySelectorAll('[data-action="replay"]').forEach(el=>el.addEventListener('click',e=>{e.preventDefault();replay();}));
  setupPinnedNavMenus();
  wireRoutes();
  closeModal.addEventListener('click',closeComposer);
  modal.addEventListener('click',e=>{if(e.target===modal)closeComposer();});
  document.querySelectorAll('.emotion').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('.emotion').forEach(x=>x.classList.remove('selected'));btn.classList.add('selected');}));
  demoPlant.addEventListener('click',()=>{demoStatus.textContent='데모 입력만 확인했습니다 · 서버 저장 없음';});
  reduceMotion.addEventListener?.('change',reducedSetup);

  if (params.get('qa')==='failure'){
    source.src='assets/__missing_video__.mp4'; video.load(); setTimeout(failVideo,250);
  } else {
    const backPayload = navigationIsBackForward() ? readHandoff() : null;
    if (backPayload){
      if (video.readyState >= 1) applyRestoredHandoff(backPayload);
      else restorePending = backPayload;
    } else {
      reducedSetup();
    }
  }
  addEventListener('pageshow', e=>{
    if (!e.persisted) return;
    const payload = readHandoff();
    if (payload) applyRestoredHandoff(payload);
  });
  tickVisual(); scrubLoop();

  window.__lovetreeQA = {
    modes:MODES,
    acts:ACTS,
    routes:ROUTES,
    resolveLocalRoute,
    readHandoff,
    saveHandoff,
    getState:()=>({mode,act:+stage.dataset.act,time:video.currentTime,duration,paused:video.paused,userAuthority,stillMode,failure,scrollY,maxScroll:maxScroll(),overflowX:document.documentElement.scrollWidth>innerWidth+1}),
    seek:(t)=>{video.pause();userAuthority=true;stillMode=false;setMode(MODES.USER);targetTime=scrubTime=clamp(t,0,duration-.001);video.currentTime=targetTime;scrollTo({top:(targetTime/duration)*maxScroll()});applyAct(targetTime);},
    complete:()=>{video.pause();userAuthority=false;video.currentTime=Math.max(0,duration-.02);applyAct(video.currentTime);setMode(MODES.COMPLETED);},
    replay,
    fail:failVideo
  };
})();
