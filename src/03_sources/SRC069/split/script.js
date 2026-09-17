
  const templates={
    '01':{track:'02',title:'FIRST JOURNEY',sub:'Landing · first Moment · first connection',path:'../../02_첫여정통합-3개html합본/02_러브트리_첫여정통합_v1.html',copy:'Track 02 · the integrated first journey from naming a tree to planting the first emotional path.'},
    '02':{track:'65',title:'CINEMATIC CLUE',sub:'H3 extended motion editorial',path:'../../65_입덕단서_시네마틱에디토리얼/V18_디자인팀장15기_H3_EXTENDED_MOTION_EDITING_후보_선택/★_현재후보_65_V2.2.5_H3_EXTENDED_MOTION_EDITING_CINEMATIC.html',copy:'Track 65 · cinematic entry where a small clue begins the path into fandom.'},
    '03':{track:'66',title:'FIRST TREE',sub:'Interactive first-tree guide',path:'../../66_첫트리만들기_인터랙티브스크롤가이드/버전1.2_제품목적·실제Moment체험강화_후보/현재후보.html',copy:'Track 66 · interactive first-tree guide with an actual Moment, next reason and first branch.'},
    '04':{track:'61',title:'CONNECTION REVIEW',sub:'Emotion-path review room',path:'../../61_감정경로_연결검토실/현재후보.html',copy:'Track 61 · review and compare why one Moment led to another.'},
    '05':{track:'55',title:'FREE CONNECTION',sub:'Direct route editing',path:'../../55_자유연결_경로편집/★_최종선택_55_LUPT_자유연결_V1.2_바로보기.html',copy:'Track 55 · direct manipulation for building and editing free emotional routes.'},
    '06':{track:'67',title:'MEMORY TAPE',sub:'V2.4.2 persistent world + WORKS',path:'../../67_메모리테이프_인터랙티브롤/07_V2.4.2_WORKS_COMPARE_MENU/track67_v2.4.2_works_compare_menu.html',copy:'Track 67 · persistent interactive memory tape with its original internal WORKS comparison menu intact.'},
    '07':{track:'68',title:'MOTION ARCHIVE',sub:'V3.3.1 A/B launcher',path:'../../68_인물감정경로_모션아카이브/V7_C14_ASSET_PATH_FIX/68_V3.3.1_COMPARE_LAUNCHER.html',copy:'Track 68 · verified A/B launcher for two person-centered emotional-path motion archive candidates.'},
    '08':{track:'12',title:'GLOBAL DISCOVERY',sub:'Public path discovery home',path:'../../12_글로벌디스커버리_탐색홈/01_글로벌디스커버리_탐색홈.html',copy:'Track 12 · public discovery surface for finding other people’s routes and beginning a new exploration.'},
    '09':{track:'59',title:'MEMORY STORYBOOK',sub:'Page journey + story autoplay',path:'../../59_메모리스케치북_페이지여정/버전5_스토리자동재생·인라인편집·시네마틱배경_최신후보/현재후보.html',copy:'Track 59 · a page-based memory journey with story playback and inline editing.'},
    '10':{track:'06',title:'300 MOMENT FINALE',sub:'Replay · celebration · transformation',path:'../../06_300모먼트_피날레/01_300모먼트_피날레.html',copy:'Track 06 · replay and celebrate a full season of 300 Moments without turning the milestone into a paywall.'},
    '11':{track:'44',title:'MOMENT COMPOSER',sub:'Hand-opened memory window',path:'../../44_손으로여는기억창_컴포저/01_손으로여는기억창_컴포저_v2.html',copy:'Track 44 · a direct composer for opening and shaping a memory window by hand.'}
  };
  const menuOverlay=document.getElementById('menuOverlay');
  const menuItems=[...document.querySelectorAll('.menu-nav button')];
  const worksOverlay=document.getElementById('worksOverlay');
  const worksList=document.getElementById('worksList');
  const worksClose=document.getElementById('worksClose');
  const previewNo=document.getElementById('previewNo');
  const previewTitle=document.getElementById('previewTitle');
  const previewCopy=document.getElementById('previewCopy');
  const viewer=document.getElementById('viewer');
  const viewerFrame=document.getElementById('viewerFrame');
  const viewerIndex=document.getElementById('viewerIndex');
  const viewerTitle=document.getElementById('viewerTitle');
  const viewerSource=document.getElementById('viewerSource');
  const viewerLoading=document.getElementById('viewerLoading');
  const viewerOpenExternal=document.getElementById('viewerOpenExternal');
  let currentTemplate=null,lastFocus=null;

  function setMenu(open){menuOverlay.classList.toggle('open',open);menuOverlay.setAttribute('aria-hidden',String(!open));menuItems.forEach((item,i)=>item.style.transitionDelay=open?`${100+i*55}ms`:'0ms');if(open)document.getElementById('menuClose').focus()}
  function setPreview(key){const item=templates[key];if(!item)return;previewNo.textContent=item.track;previewTitle.textContent=item.title;previewCopy.textContent=item.copy}
  function renderWorks(){worksList.innerHTML='<div class="works-row current" tabindex="-1"><div class="works-no">69</div><div class="works-name"><strong>FULL VIEWPORT PORTAL</strong><span>Current · exact source multi-template navigation</span></div><div class="works-state">CURRENT</div></div>'+Object.entries(templates).map(([key,item])=>`<button class="works-row" type="button" data-template="${key}"><div class="works-no">${item.track}</div><div class="works-name"><strong>${item.title}</strong><span>${item.sub}</span></div><div class="works-state">OPEN →</div></button>`).join('');worksList.querySelectorAll('[data-template]').forEach(row=>{row.addEventListener('mouseenter',()=>setPreview(row.dataset.template));row.addEventListener('focus',()=>setPreview(row.dataset.template));row.addEventListener('click',()=>openTemplate(row.dataset.template))})}
  function openWorks(){lastFocus=document.activeElement;setMenu(false);worksOverlay.hidden=false;previewNo.textContent='69';previewTitle.textContent='FULL VIEWPORT PORTAL';previewCopy.textContent='Track 69 V3 · all navigation repaired and each action mapped to a different adopted LoveTree template.';worksClose.focus()}
  function closeWorks(){if(worksOverlay.hidden)return;worksOverlay.hidden=true;if(lastFocus?.focus)lastFocus.focus()}
  function openTemplate(key){const item=templates[key];if(!item)return;currentTemplate=item;lastFocus=document.activeElement;setMenu(false);worksOverlay.hidden=true;viewerIndex.textContent=item.track;viewerTitle.textContent=item.title;viewerSource.textContent=`Track ${item.track} · ${item.sub}`;viewerLoading.classList.remove('done');viewerFrame.src=item.path;viewer.hidden=false;viewerClose.focus()}
  function closeViewer(){if(viewer.hidden)return;viewer.hidden=true;viewerFrame.src='about:blank';currentTemplate=null;if(lastFocus?.focus)lastFocus.focus()}
  document.getElementById('menuOpen').addEventListener('click',()=>setMenu(true));document.getElementById('menuClose').addEventListener('click',()=>setMenu(false));document.getElementById('homeLogo').addEventListener('click',()=>{closeViewer();closeWorks();setMenu(false)});
  document.querySelectorAll('[data-template]').forEach(btn=>btn.addEventListener('click',()=>openTemplate(btn.dataset.template)));
  document.querySelectorAll('[data-open-works]').forEach(btn=>btn.addEventListener('click',openWorks));worksClose.addEventListener('click',closeWorks);document.getElementById('viewerClose').addEventListener('click',closeViewer);
  viewerFrame.addEventListener('load',()=>viewerLoading.classList.add('done'));viewerOpenExternal.addEventListener('click',()=>{if(currentTemplate)window.open(currentTemplate.path,'_blank','noopener')});
  window.addEventListener('keydown',e=>{if(e.key!=='Escape')return;if(!viewer.hidden){e.preventDefault();closeViewer();return}if(!worksOverlay.hidden){e.preventDefault();closeWorks();return}if(menuOverlay.classList.contains('open')){e.preventDefault();setMenu(false)}});
  renderWorks();
  window.lovetreePortal={templates,openTemplate,openWorks,closeWorks,closeViewer,targets:()=>Object.entries(templates).map(([key,v])=>({key,...v}))};
