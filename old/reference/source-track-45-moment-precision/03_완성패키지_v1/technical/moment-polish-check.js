
const COPY={
  hero:{eyebrow:'A LIVE LAB FOR MEMORY INTERACTIONS',headline:'Moments that <em>feel alive</em>,<br>by design —<br>not by accident.',description:'Twelve small decisions that make every save, revisit and connection feel intentional.'},
  apply:{label:'APPLY TO',target:'Felix · Season 03 · Shared Course',button:'Apply polish',toast:'Presentation polish applied.'},
  playground:'THE PLAYGROUND · <b>12 LIVE PRINCIPLES</b>',
  footer:{left:'<b>Save first.</b> Polish later.',right:'Every detail feels intentional.'},
  cards:[
    {id:'nestedRadius',title:'Nested Radius',description:'Every layer follows the same curve.',note:'outer = inner + padding'},
    {id:'emotionalFocus',title:'Emotional Focus',description:'Visual center beats geometric center.',note:'geometric center → visual center'},
    {id:'thumbnailDepth',title:'Thumbnail Depth',description:'A subtle edge keeps every memory visible.',note:'none · tinted · pure'},
    {id:'softDepth',title:'Soft Memory Depth',description:'Depth adapts better than a hard border.',note:'border vs layered shadow'},
    {id:'hitArea',title:'Easy to Revisit',description:'Small icon. Generous invisible target.',note:'22px glyph · 44px target'},
    {id:'stableTime',title:'Stable Time',description:'Dates and counts should never shift the layout.',note:'proportional vs tabular'},
    {id:'interruptible',title:'Interruptible Motion',description:'A new action should retarget, not restart.',note:'click rapidly'},
    {id:'tactileSave',title:'Tactile Save',description:'A gentle press feels responsive, not dramatic.',note:'.96 feels intentional'},
    {id:'saveStates',title:'Save States',description:'One icon. Clear emotional states.',note:'outline · pressed · saved · removed'},
    {id:'memoryTags',title:'Memory Tags',description:'Staggered entry. Soft, graceful exit.',note:'in 100ms · out -12px + blur'},
    {id:'balancedTitles',title:'Balanced Titles',description:'Balanced wrapping makes meaning easier to scan.',note:'default vs text-wrap: balance'},
    {id:'preciseTransitions',title:'Precise Transitions',description:'Animate only what the interaction intends.',note:'never transition: all'}
  ],
  cues:[
    ['01 / 12','NESTED RADIUS','outer and inner curves stay physically related'],
    ['02 / 12','EMOTIONAL FOCUS','optic correction moves the icon by only two pixels'],
    ['03 / 12','THUMBNAIL DEPTH','a one-pixel edge protects the image on any background'],
    ['04 / 12','SOFT MEMORY DEPTH','shadow adapts where a border feels rigid'],
    ['05 / 12','EASY TO REVISIT','small glyph, generous invisible target'],
    ['06 / 12','STABLE TIME','tabular figures keep the layout still'],
    ['07 / 12','INTERRUPTIBLE MOTION','new input retargets motion in flight'],
    ['08 / 12','TACTILE SAVE','gentle pressure, no dramatic bounce'],
    ['09 / 12','SAVE STATES','one heart carries four clear states'],
    ['10 / 12','MEMORY TAGS · STAGGER & SOFT EXIT','in: 100ms stagger · out: -12px, blur, 150ms'],
    ['11 / 12','BALANCED TITLES · TEXT WRAPPING','balance distributes lines without changing the card'],
    ['12 / 12','PRECISE TRANSITIONS · NEVER “ALL”','the left card animates what you never intended']
  ]
};
const state={active:9,playing:false,timer:null,demoMode:new URLSearchParams(location.search).get('demo')||'reference',settings:{nestedRadius:'12+12',emotionalFocus:'optic',thumbnailDepth:'tinted',softDepth:'shadow',hitArea:'show',stableTime:'tab',interruptible:'transition',tactileSave:'0.96',saveState:'outline',balancedTitle:true,preciseTransition:true}};
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const grid=$('#grid'),lab=$('#lab'),shell=$('#shell'),stage=$('#stage');
function fitBoard(){if(innerWidth<=700){document.documentElement.style.setProperty('--scale',1);shell.style.height='auto';return}const scale=Math.min(1,(innerHeight-20)/1048,(innerWidth-30)/810);document.documentElement.style.setProperty('--scale',scale.toFixed(4));shell.style.width=(810*scale)+'px';shell.style.height=(1048*scale)+'px'}
addEventListener('resize',fitBoard);fitBoard();
function controls(id){
 const toggle=(opts,current)=>`<div class="mini-toggle">${opts.map(v=>`<button type="button" data-value="${v}" class="${v===current?'on':''}">${v}</button>`).join('')}</div>`;
 if(id==='nestedRadius')return toggle(['12+12','12+8'],state.settings.nestedRadius);
 if(id==='emotionalFocus')return toggle(['geom','optic'],state.settings.emotionalFocus);
 if(id==='thumbnailDepth')return toggle(['none','tinted','pure'],state.settings.thumbnailDepth);
 if(id==='softDepth')return toggle(['border','shadow'],state.settings.softDepth);
 if(id==='hitArea')return toggle(['hide','show'],state.settings.hitArea);
 if(id==='stableTime')return toggle(['prop','tab'],state.settings.stableTime);
 if(id==='interruptible')return `<span style="font:600 7px var(--mono);color:#777">click rapidly</span>`;
 if(id==='tactileSave')return `<span style="font:600 7px var(--mono);color:#777">press & hold</span>`;
 if(id==='saveStates')return `<span style="font:600 7px var(--mono);color:#777">click</span>`;
 if(id==='memoryTags')return `<button type="button" class="replay-btn" data-action="replay-tags">↻ replay</button>`;
 if(id==='balancedTitles')return toggle(['default','balance'],state.settings.balancedTitle?'balance':'default');
 if(id==='preciseTransitions')return `<span style="font:600 7px var(--mono);color:#777">hover</span>`;
 return '';
}
function demoMarkup(id){
 if(id==='nestedRadius')return `<div class="radius-shell"><div class="radius-inner"></div></div>`;
 if(id==='emotionalFocus')return `<div class="focus-disc"><i class="focus-play"></i></div>`;
 if(id==='thumbnailDepth')return `<div class="depth-thumb tinted"></div>`;
 if(id==='softDepth')return `<div class="note-card shadow"><i></i><span></span><span></span></div>`;
 if(id==='hitArea')return `<div class="hit-row show"><button class="hit-button" aria-label="Close"><span class="hit-icon">×</span></button><button class="hit-button" aria-label="Confirm"><span class="hit-icon">✓</span></button></div>`;
 if(id==='stableTime')return `<div class="time-demo"><span class="time-number tab">52,508</span><i class="time-anchor"></i></div>`;
 if(id==='interruptible')return `<div class="interrupt-demo"><div><div class="motion-track transition-track" data-motion="transition"><i class="motion-dot"></i></div><div class="track-label">transition</div></div><div><div class="motion-track keyframe-track" data-motion="keyframes"><i class="motion-dot"></i></div><div class="track-label">keyframes</div></div></div>`;
 if(id==='tactileSave')return `<div class="press-row"><button class="press-button good">0.96</button><button class="press-button bad">0.90</button></div>`;
 if(id==='saveStates')return `<button class="heart-button" aria-label="Cycle save state"><svg viewBox="0 0 24 24"><path class="heart-shape" d="M12 20.2 4.7 13C1.6 9.8 3.3 4.8 7.7 4.8c1.8 0 3.2.9 4.3 2.2 1.1-1.3 2.5-2.2 4.3-2.2 4.4 0 6.1 5 3 8.2L12 20.2Z"/></svg></button><div class="state-label">outline</div>`;
 if(id==='memoryTags')return `<div class="tags-demo"><span class="memory-tag">First spark</span><span class="memory-tag">Voice</span><span class="memory-tag">Next video</span></div>`;
 if(id==='balancedTitles')return `<div class="wrap-demo balance">The moment that made me look again.</div>`;
 if(id==='preciseTransitions')return `<div class="precise-demo"><div class="transition-case all-case"><div class="demo-bar"></div><small>transition: all</small></div><div class="transition-case specific-case"><div class="demo-bar"></div><small>specific only</small></div></div><div class="precise-note">Only the intended handle should move.</div>`;
 return '';
}
function render(){
 $('#heroEyebrow').textContent=COPY.hero.eyebrow;$('#heroHeadline').innerHTML=COPY.hero.headline;$('#heroDescription').textContent=COPY.hero.description;
 $('#applyLabel').textContent=COPY.apply.label;$('#applyTarget').textContent=COPY.apply.target;$('#applyButton').textContent=COPY.apply.button;
 $('#playgroundTitle').innerHTML=COPY.playground;$('#footerLeft').innerHTML=COPY.footer.left;$('#footerRight').textContent=COPY.footer.right;
 grid.innerHTML=COPY.cards.map((c,i)=>`<article class="principle-card ${i===state.active?'active':''}" data-index="${i}" data-id="${c.id}" tabindex="0"><div class="card-head"><span class="card-num">${String(i+1).padStart(2,'0')}</span><span class="card-title">${c.title}</span><div class="card-control">${controls(c.id)}</div></div><div class="demo">${demoMarkup(c.id)}</div><div class="card-desc">${c.note}</div></article>`).join('');
 bindCards();applySettings();setActive(state.active,false);
}
function bindCards(){
 $$('.principle-card').forEach(card=>{
  card.addEventListener('click',e=>{stopDemo();const button=e.target.closest('button');if(button){handleControl(card,button);e.stopPropagation();return}setActive(+card.dataset.index,true)});
  card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();stopDemo();setActive(+card.dataset.index,true)}});
 });
 $$('[data-motion]').forEach(track=>track.addEventListener('click',e=>{e.stopPropagation();stopDemo();runMotion(track)}));
 $('.heart-button').addEventListener('click',e=>{e.stopPropagation();stopDemo();cycleHeart()});
 const pcard=$('[data-id="preciseTransitions"]');pcard.addEventListener('mouseenter',()=>runPrecise());pcard.addEventListener('mouseleave',()=>resetPrecise());
}
function handleControl(card,button){const id=card.dataset.id,v=button.dataset.value,action=button.dataset.action;setActive(+card.dataset.index,false);if(action==='replay-tags'){runTags();return}if(!v)return;
 if(id==='balancedTitles')state.settings.balancedTitle=v==='balance';else state.settings[id]=v;updateToggle(card,v);applySettings();runPrinciple(+card.dataset.index);
}
function updateToggle(card,v){card.querySelectorAll('.mini-toggle button').forEach(b=>b.classList.toggle('on',b.dataset.value===v))}
function applySettings(){
 const r=$('.radius-inner');if(r)r.classList.toggle('awkward',state.settings.nestedRadius==='12+8');
 const f=$('.focus-play');if(f)f.classList.toggle('geom',state.settings.emotionalFocus==='geom');
 const d=$('.depth-thumb');if(d)d.className='depth-thumb '+state.settings.thumbnailDepth;
 const n=$('.note-card');if(n)n.classList.toggle('shadow',state.settings.softDepth==='shadow');
 const h=$('.hit-row');if(h)h.classList.toggle('show',state.settings.hitArea==='show');
 const t=$('.time-number');if(t)t.className='time-number '+state.settings.stableTime;
 const w=$('.wrap-demo');if(w)w.classList.toggle('balance',state.settings.balancedTitle);
}
function setCue(index,custom){const cue=custom||COPY.cues[index];$('#cueCount').textContent=cue[0];$('#cueTitle').textContent=cue[1];$('#cueNote').textContent=cue[2];$('#progressFill').style.width=custom?'100%':(((index+1)/12)*100)+'%'}
function setActive(index,scroll=true){state.active=Math.max(0,Math.min(11,index));$$('.principle-card').forEach((c,i)=>c.classList.toggle('active',i===state.active));setCue(state.active);if(scroll&&innerWidth<=700){setTimeout(()=>$$('.principle-card')[state.active].scrollIntoView({behavior:'smooth',block:'start'}),30)}runPrinciple(state.active)}
function runPrinciple(i){
 if(i===0){const r=$('.radius-inner');r.animate([{transform:'scale(.96)'},{transform:'scale(1)'}],{duration:420,easing:'cubic-bezier(.2,.8,.2,1)'})}
 if(i===1){const p=$('.focus-play');p.animate([{opacity:.45},{opacity:1}],{duration:340})}
 if(i===2){const d=$('.depth-thumb');d.animate([{filter:'brightness(.9)'},{filter:'brightness(1.05)'},{filter:'brightness(1)'}],{duration:560})}
 if(i===3){const n=$('.note-card');n.animate([{transform:'translateY(4px)'},{transform:'translateY(0)'}],{duration:460,easing:'ease-out'})}
 if(i===4){const h=$('.hit-row');h.animate([{transform:'scale(.94)'},{transform:'scale(1)'}],{duration:420})}
 if(i===5){pulseTime()}
 if(i===6){runMotion($('.transition-track'));setTimeout(()=>runMotion($('.keyframe-track')),170)}
 if(i===7){$('.press-button.good').animate([{transform:'scale(1)'},{transform:'scale(.96)'},{transform:'scale(1)'}],{duration:480})}
 if(i===8){cycleHeart()}
 if(i===9)runTags();
 if(i===10)runWrap();
 if(i===11)runPrecise();
}
let timeInterval=setInterval(()=>{const el=$('.time-number');if(!el)return;const vals=['52,508','52,600','52,577','52,646','52,421'];el.textContent=vals[Math.floor(Date.now()/900)%vals.length]},900);
function pulseTime(){const el=$('.time-number');if(el)el.animate([{opacity:.35},{opacity:1}],{duration:420})}
function runMotion(track){if(!track)return;const dot=track.querySelector('.motion-dot');if(track.dataset.motion==='transition'){track.classList.toggle('target')}else{const to=track.classList.toggle('target')?48:0;dot.animate([{transform:'translateX(0)'},{transform:`translateX(${to}px)`}],{duration:420,easing:'ease',fill:'forwards'})}}
function cycleHeart(){const btn=$('.heart-button'),label=$('.state-label');if(!btn)return;const states=['outline','pressed','saved','removed'];let idx=(states.indexOf(state.settings.saveState)+1)%states.length;state.settings.saveState=states[idx];btn.className='heart-button '+states[idx];label.textContent=states[idx];if(states[idx]==='pressed')setTimeout(()=>{if(state.settings.saveState==='pressed'){state.settings.saveState='saved';btn.className='heart-button saved';label.textContent='saved'}},260)}
function runTags(){const tags=$$('.memory-tag');tags.forEach((tag,i)=>{tag.getAnimations().forEach(a=>a.cancel());tag.animate([{opacity:0,transform:'translateY(8px)',filter:'blur(3px)'},{opacity:1,transform:'translateY(0)',filter:'blur(0)'}],{duration:340,delay:i*100,easing:'cubic-bezier(.2,.8,.2,1)',fill:'both'});setTimeout(()=>tag.animate([{opacity:1,transform:'translateY(0)',filter:'blur(0)'},{opacity:0,transform:'translateY(-12px)',filter:'blur(5px)'}],{duration:180,delay:i*75,easing:'ease-in',fill:'both'}),900)})}
function runWrap(){const w=$('.wrap-demo');if(!w)return;const next=!w.classList.contains('balance');setTimeout(()=>{w.classList.toggle('balance',next);state.settings.balancedTitle=next;const c=$('[data-id="balancedTitles"]');updateToggle(c,next?'balance':'default')},320)}
function runPrecise(){const all=$('.all-case'),specific=$('.specific-case'),note=$('.precise-note');if(!all)return;resetPrecise();setTimeout(()=>all.classList.add('run'),100);setTimeout(()=>specific.classList.add('run'),780);setTimeout(()=>note.classList.add('show'),1050)}
function resetPrecise(){const all=$('.all-case'),specific=$('.specific-case'),note=$('.precise-note');if(all)all.classList.remove('run');if(specific)specific.classList.remove('run');if(note)note.classList.remove('show')}
function stopDemo(){if(!state.playing)return;state.playing=false;clearTimeout(state.timer);lab.classList.add('demo-paused')}
function wait(ms){return new Promise(resolve=>state.timer=setTimeout(resolve,ms))}
async function playReference(){state.playing=true;lab.classList.remove('demo-paused');$('#applyBar').classList.remove('final-active');
 setActive(9,false);await wait(2100);if(!state.playing)return;
 setActive(10,false);await wait(1900);if(!state.playing)return;
 setActive(11,false);await wait(2300);if(!state.playing)return;
 setCue(11,['12 / 12','APPLY THE POLISH','presentation changes; the memory itself stays untouched']);$('#applyBar').classList.add('final-active');$('#applyButton').classList.add('pulse');await wait(1300);$('#applyButton').classList.remove('pulse');state.playing=false;
}
async function playFull(){state.playing=true;lab.classList.remove('demo-paused');$('#applyBar').classList.remove('final-active');for(let i=0;i<12;i++){if(!state.playing)return;setActive(i,false);await wait(i>=9?2000:1650)}if(!state.playing)return;setCue(11,['12 / 12','APPLY THE POLISH','presentation changes; the memory itself stays untouched']);$('#applyBar').classList.add('final-active');$('#applyButton').classList.add('pulse');await wait(1300);$('#applyButton').classList.remove('pulse');state.playing=false}
function restartDemo(){clearTimeout(state.timer);state.playing=false;state.demoMode==='full'?playFull():playReference()}
function showToast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1600)}
$('#applyButton').addEventListener('click',()=>{stopDemo();const payload={targetType:'course',targetId:'season-03',enabledPrinciples:COPY.cards.map(c=>c.id),settings:state.settings,appliedAt:new Date().toISOString()};localStorage.setItem('lovetree-moment-polish-lab-v1',JSON.stringify(payload));$('#applyBar').classList.add('final-active');$('#applyButton').classList.add('pulse');setTimeout(()=>$('#applyButton').classList.remove('pulse'),720);showToast(COPY.apply.toast)});
addEventListener('keydown',e=>{if(['INPUT','TEXTAREA'].includes(document.activeElement.tagName))return;if(e.key===' '){e.preventDefault();state.playing?stopDemo():restartDemo()}if(e.key.toLowerCase()==='r')restartDemo();if(e.key==='ArrowRight'){stopDemo();setActive((state.active+1)%12,true)}if(e.key==='ArrowLeft'){stopDemo();setActive((state.active+11)%12,true)}if(/^[1-9]$/.test(e.key)){stopDemo();setActive(+e.key-1,true)}if(e.key==='0'){stopDemo();setActive(9,true)}});
['pointerdown','wheel','touchstart'].forEach(type=>stage.addEventListener(type,e=>{if(e.target.closest('.apply-button'))return;if(state.playing&&e.isTrusted)stopDemo()},{passive:true}));
render();setTimeout(()=>restartDemo(),500);
