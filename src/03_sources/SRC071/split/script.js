
(()=>{
'use strict';
const W=1448,H=937;
const stage=document.getElementById('stage');
const paper=document.getElementById('paper');
const canvas=document.getElementById('scene');
const ctx=canvas.getContext('2d',{alpha:true});
const hits=[...document.querySelectorAll('.hit')];
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const typedCopy=document.getElementById('typedCopy');
const portalStatus=document.getElementById('portalStatus');
const fadeCover=document.getElementById('fadeCover');
const themeWhite=document.getElementById('themeWhite');
const themeBlack=document.getElementById('themeBlack');
const cta=document.getElementById('cta');

let dpr=1,last=performance.now(),time=0,paused=new URLSearchParams(location.search).has('paused');
let theme='white';
let selected=-1,activating=-1;
const REEL_CYCLE=940;
let viewY=0,reelVelocity=0,keyDir=0;
let globalX=0,globalY=0,targetGX=0,targetGY=0;
let hovered=-1;
let drag={active:false,id:null,startY:0,lastY:0,startX:0,moved:false,lastT:0};
function copyYs(baseY){
  const ys=[];
  const center=baseY+viewY;
  const k0=Math.floor((-260-center)/REEL_CYCLE)-1;
  for(let k=k0;k<k0+6;k++){
    const y=center+k*REEL_CYCLE;
    if(y>-320&&y<H+320)ys.push({y,k});
  }
  return ys;
}
function nearestCopyY(baseY){
  const ys=copyYs(baseY);
  return ys.reduce((best,v)=>Math.abs(v.y-H*.5)<Math.abs(best.y-H*.5)?v:best,ys[0]||{y:baseY,k:0});
}

const ROUTES=[
  {
    label:'FIRST · FIRST CLUE',
    path:'../../65_입덕단서_시네마틱에디토리얼/V18_디자인팀장15기_H3_EXTENDED_MOTION_EDITING_후보_선택/★_현재후보_65_V2.2.5_H3_EXTENDED_MOTION_EDITING_CINEMATIC.html'
  },
  {
    label:'MOMENTS · MEMORY TAPE',
    path:'../../67_메모리테이프_인터랙티브롤/07_V2.4.2_WORKS_COMPARE_MENU/track67_v2.4.2_works_compare_menu.html'
  },
  {
    label:'CONNECTION · MOTION ARCHIVE',
    path:'../../68_인물감정경로_모션아카이브/V7_C14_ASSET_PATH_FIX/68_V3.3.1_COMPARE_LAUNCHER.html'
  },
  {
    label:'REPLAY · MEMORY ORBIT',
    path:'../../../../코덱스/14_러브트리_로테이팅메모리인덱스_V1/v2/개발본.html'
  },
  {
    label:'MY TREE · BIOSPHERE',
    path:'../../../../코덱스/15_러브트리_메모리바이오스피어_인터랙티브대문_V1/버전2/최종본.html'
  },
  {
    label:'RETURN · TEMPLATE PORTAL',
    path:'../../70_모먼트리빌_퓨처에디토리얼/선택1-70_V2.1_LOVETREE_PORTAL_NAV_RETURN_FIX.html'
  }
];

function fitStage(){
  const w=innerWidth,h=innerHeight;let scale,x=0,y=0;
  if(w<=700){
    scale=w/1050;x=-(236*scale-12);y=Math.max(26,(h-1080*scale)/2);
    stage.style.left='0';stage.style.top='0';stage.style.transformOrigin='0 0';stage.style.transform=`translate(${x}px,${y}px) scale(${scale})`;
  }else{
    scale=Math.min(w/1920,h/1080);stage.style.left='50%';stage.style.top='50%';stage.style.transformOrigin='50% 50%';stage.style.transform=`translate(-50%,-50%) scale(${scale})`;
  }
}
fitStage();addEventListener('resize',fitStage,{passive:true});

const bg=document.createElement('canvas'),bgctx=bg.getContext('2d');
function resizeCanvas(){
  dpr=Math.min(2,devicePixelRatio||1);
  canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);
  bg.width=Math.round(W*dpr);bg.height=Math.round(H*dpr);
  canvas.style.width=W+'px';canvas.style.height=H+'px';
  drawBackground();
}
function palette(){
  return theme==='black'
    ? {paper:'#050505',ink:'#f8f8f4',weak:'rgba(248,248,244,.20)',spec:'rgba(255,255,255,.80)',reflection:'rgba(255,255,255,.20)'}
    : {paper:'#ffffff',ink:'#050505',weak:'rgba(5,5,5,.18)',spec:'rgba(255,255,255,.82)',reflection:'rgba(0,0,0,.26)'};
}
function drawBackground(){
  const p=palette();
  bgctx.setTransform(dpr,0,0,dpr,0,0);bgctx.clearRect(0,0,W,H);
  bgctx.fillStyle=p.paper;bgctx.fillRect(0,0,W,H);
  bgctx.fillStyle=p.ink;bgctx.textBaseline='top';bgctx.font='900 190px Arial Black, Arial, sans-serif';
  const base=((viewY%REEL_CYCLE)+REEL_CYCLE)%REEL_CYCLE;
  const drawSet=(sy)=>{
    bgctx.save();bgctx.translate(590,-39+sy);bgctx.scale(1.03,.98);bgctx.fillText('PATH',0,0);bgctx.restore();
    bgctx.beginPath();bgctx.arc(618,205+sy,25,0,Math.PI*2);bgctx.fill();
    bgctx.save();bgctx.translate(585,215+sy);bgctx.scale(1.02,.99);bgctx.fillText('MOMENT',0,0);bgctx.restore();
    bgctx.save();bgctx.translate(575,465+sy);bgctx.scale(1.01,1.01);bgctx.fillText('MEMORY',0,0);bgctx.restore();
    bgctx.save();bgctx.translate(615,714+sy);bgctx.scale(1.05,1.01);bgctx.fillText('LOVE',0,0);bgctx.restore();
  };
  for(let k=-2;k<=2;k++)drawSet(base+k*REEL_CYCLE);
}
resizeCanvas();addEventListener('resize',resizeCanvas,{passive:true});

const lenses=[
 {label:'FIRST',      x:1032,y:100, rx:210,ry:78,  seed:.65,lobes:[.055,-.035,.025],tilt:7, warp:1.055,shear:.025},
 {label:'MOMENTS',    x:1092,y:258, rx:174,ry:103, seed:1.70,lobes:[-.045,.060,-.025],tilt:-13,warp:1.075,shear:-.030},
 {label:'CONNECTION', x:965, y:428, rx:207,ry:105, seed:2.85,lobes:[.075,.025,-.045],tilt:17,warp:1.090,shear:.055},
 {label:'REPLAY',     x:1136,y:577, rx:188,ry:96,  seed:4.10,lobes:[-.065,.035,.055],tilt:-21,warp:1.065,shear:-.060},
 {label:'MY TREE',    x:1197,y:758, rx:151,ry:122, seed:5.35,lobes:[.045,-.075,.035],tilt:26,warp:1.105,shear:.035},
 {label:'RETURN',     x:1420,y:477, rx:128,ry:181, seed:6.40,lobes:[-.035,.055,.070],tilt:78,warp:1.080,shear:-.035}
].map((o,i)=>({...o,i,hover:false,focus:false,tx:0,ty:0,rx3:0,ry3:0,trx:0,try:0,face:0,targetFace:0,scale:1}));

function blobPath(o){
  const p=new Path2D(),N=72,[a,b,c]=o.lobes;
  for(let k=0;k<=N;k++){
    const t=k/N*Math.PI*2;
    const rad=1+a*Math.sin(3*t+o.seed)+b*Math.sin(5*t-o.seed*.7)+c*Math.cos(2*t+o.seed*1.8);
    const x=Math.cos(t)*o.rx*rad;
    const y=Math.sin(t)*o.ry*(1+.035*Math.sin(4*t+o.seed))*rad;
    if(!k)p.moveTo(x,y);else p.lineTo(x,y);
  }
  p.closePath();return p;
}
const paths=lenses.map(blobPath);

function lensY(o){return nearestCopyY(o.y).y}
function lensMatrix(o,instanceY){
  const face=o.face;
  const idleTilt=Math.sin(time*.21+o.seed)*1.8*(1-face);
  const hoverTilt=(o.hover?o.tx*.9:0)*(1-face);
  const rz=((o.tilt*(1-face))+idleTilt+hoverTilt)*Math.PI/180;
  const rx=o.rx3*(1-face), ry=o.ry3*(1-face);
  const sx=Math.max(.83,Math.cos(ry*Math.PI/180));
  const sy=Math.max(.82,Math.cos(rx*Math.PI/180));
  const shx=Math.sin(ry*Math.PI/180)*.19;
  const shy=-Math.sin(rx*Math.PI/180)*.11;
  const cr=Math.cos(rz),sr=Math.sin(rz),s=o.scale;
  return {a:(cr*sx-sr*shy)*s,b:(sr*sx+cr*shy)*s,c:(cr*shx-sr*sy)*s,d:(sr*shx+cr*sy)*s,e:o.x,f:instanceY,rz};
}
function applyM(m){ctx.transform(m.a,m.b,m.c,m.d,m.e,m.f)}

function paperPoint(e){
  const r=paper.getBoundingClientRect();
  return {x:(e.clientX-r.left)*(W/r.width),y:(e.clientY-r.top)*(H/r.height)};
}
function hitTest(x,y){
  let best=null,bestD=99;
  lenses.forEach((o,i)=>{
    copyYs(o.y).forEach(inst=>{
      const oy=inst.y,angle=-(o.tilt*(1-o.face))*Math.PI/180,ca=Math.cos(angle),sa=Math.sin(angle);
      const dx=x-o.x,dy=y-oy;
      const lx=(dx*ca-dy*sa)/o.rx,ly=(dx*sa+dy*ca)/o.ry,d=lx*lx+ly*ly;
      if(d<1.12&&d<bestD){bestD=d;best={i,instY:oy,k:inst.k}}
    });
  });
  return best;
}
function updateHover(e){
  if(drag.active&&drag.moved)return;
  const {x,y}=paperPoint(e),best=hitTest(x,y);hovered=best?best.i:-1;
  lenses.forEach((o,i)=>{o.hover=(best&&i===best.i)||o.focus;if((!best||i!==best.i)&&!o.focus){o.tx=o.ty=0}});
  if(best){
    const o=lenses[best.i],oy=best.instY;o.tx=Math.max(-1,Math.min(1,(x-o.x)/o.rx));o.ty=Math.max(-1,Math.min(1,(y-oy)/o.ry));
    canvas.style.cursor='pointer';
  }else canvas.style.cursor='grab';
  const r=paper.getBoundingClientRect();
  targetGX=Math.max(-1,Math.min(1,(e.clientX-(r.left+r.width/2))/(r.width/2)));
  targetGY=Math.max(-1,Math.min(1,(e.clientY-(r.top+r.height/2))/(r.height/2)));
}

paper.addEventListener('pointermove',e=>{
  if(drag.active){
    const now=performance.now(),dy=e.clientY-drag.lastY,dx=e.clientX-drag.startX,dt=Math.max(8,now-drag.lastT);
    drag.lastY=e.clientY;drag.lastT=now;
    if(Math.abs(e.clientY-drag.startY)>6||Math.abs(dx)>6)drag.moved=true;
    if(drag.moved){
      viewY+=dy*1.14;
      reelVelocity=(dy*1.14)/(dt/16.67);
      hovered=-1;lenses.forEach(o=>{if(!o.focus){o.hover=false;o.tx=o.ty=0}});
      canvas.style.cursor='grabbing';
    }
    return;
  }
  updateHover(e);
},{passive:true});

paper.addEventListener('pointerdown',e=>{
  if(e.button!==0||e.target.closest('.theme-toggle')||e.target.closest('#cta'))return;
  drag={active:true,id:e.pointerId,startY:e.clientY,lastY:e.clientY,startX:e.clientX,moved:false,lastT:performance.now()};reelVelocity=0;
  paper.classList.add('dragging');
  try{paper.setPointerCapture(e.pointerId)}catch(_){ }
});

paper.addEventListener('pointerup',e=>{
  if(!drag.active)return;
  const wasMoved=drag.moved;
  drag.active=false;paper.classList.remove('dragging');
  try{paper.releasePointerCapture(e.pointerId)}catch(_){ }
  if(!wasMoved&&activating<0){
    const {x,y}=paperPoint(e),hit=hitTest(x,y);if(hit)activateLens(hit.i);
  }
  updateHover(e);
});
paper.addEventListener('pointercancel',()=>{drag.active=false;paper.classList.remove('dragging')});
paper.addEventListener('pointerleave',()=>{if(!drag.active){hovered=-1;lenses.forEach(o=>{if(!o.focus){o.hover=false;o.tx=o.ty=0}});targetGX=targetGY=0;canvas.style.cursor='grab'}});

paper.addEventListener('wheel',e=>{
  if(e.target.closest('.theme-toggle'))return;
  e.preventDefault();reelVelocity+=-e.deltaY*.085;
},{passive:false});

function updateHitPositions(){
  lenses.forEach((o,i)=>{
    const h=hits[i],inst=nearestCopyY(o.y),y=inst.y;
    h.style.left=o.x+'px';h.style.top=y+'px';h.style.width=(o.rx*2.12)+'px';h.style.height=(o.ry*2.15)+'px';
    h.style.transform=`translate(-50%,-50%) rotate(${o.tilt*(1-o.face)}deg) scale(${o.scale})`;
  });
}

hits.forEach((h,i)=>{
  const o=lenses[i];
  h.addEventListener('focus',()=>{o.focus=true;o.hover=true});
  h.addEventListener('blur',()=>{o.focus=false;o.hover=false;o.tx=o.ty=0});
  h.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();activateLens(i)}});
});

function setTheme(next){
  theme=next==='black'?'black':'white';paper.dataset.theme=theme;
  themeWhite.setAttribute('aria-pressed',String(theme==='white'));
  themeBlack.setAttribute('aria-pressed',String(theme==='black'));
  drawBackground();
}
themeWhite.addEventListener('click',()=>setTheme('white'));
themeBlack.addEventListener('click',()=>setTheme('black'));

function typeCopy(){
  const text='Moments that moved your heart,\nconnected into the path\nthat made you a fan.';
  if(reduce||paused){typedCopy.textContent=text;typedCopy.classList.add('done');return}
  let i=0;typedCopy.textContent='';
  const tick=()=>{
    typedCopy.textContent=text.slice(0,i++);
    if(i<=text.length)setTimeout(tick,14+Math.random()*18);else typedCopy.classList.add('done');
  };
  setTimeout(tick,360);
}
typeCopy();

function resolveRoute(i){
  try{return new URL(ROUTES[i].path,location.href).href}catch(_){return ROUTES[i].path}
}
function activateLens(i){
  if(activating>=0)return;
  selected=i;activating=i;
  hits.forEach((h,k)=>h.setAttribute('aria-pressed',String(k===i)));
  lenses.forEach((o,k)=>{o.targetFace=k===i?1:0;o.hover=k===i;o.tx=o.ty=0});
  portalStatus.textContent=`OPENING ${ROUTES[i].label}`;portalStatus.classList.add('show');
  const delay=reduce?120:760;
  setTimeout(()=>{
    fadeCover.classList.add('show');
    setTimeout(()=>{
      if(new URLSearchParams(location.search).has('qa')||window.__LOVE_TREE_QA__===true){
        portalStatus.textContent=`QA ROUTE · ${ROUTES[i].label}`;
        fadeCover.classList.remove('show');
        activating=-1;selected=-1;lenses.forEach(o=>o.targetFace=0);hits.forEach(h=>h.setAttribute('aria-pressed','false'));
        return;
      }
      location.href=resolveRoute(i);
    },reduce?40:260);
  },delay);
}

cta.addEventListener('click',()=>activateLens(4));
addEventListener('keydown',e=>{
  if(e.key==='Escape'&&activating<0){selected=-1;lenses.forEach(o=>o.targetFace=0);hits.forEach(h=>h.setAttribute('aria-pressed','false'));document.activeElement?.blur?.()}
  if((e.key==='ArrowUp'||e.key==='ArrowDown')&&!e.metaKey&&!e.ctrlKey){
    e.preventDefault();keyDir=e.key==='ArrowUp'?1:-1;reelVelocity+=keyDir*5.5;
  }
});
addEventListener('keyup',e=>{if(e.key==='ArrowUp'||e.key==='ArrowDown')keyDir=0});

function drawLens(o,path,instanceY){
  const p=palette(),m=lensMatrix(o,instanceY),sel=selected===o.i,face=o.face;
  ctx.save();applyM(m);ctx.clip(path);
  ctx.setTransform(dpr,0,0,dpr,0,0);
  const oy=instanceY;
  const refrX=o.x + o.ry3*.9*(1-face)+Math.sin(time*.31+o.seed)*2*(1-face);
  const refrY=oy - o.rx3*.65*(1-face)+Math.cos(time*.27+o.seed)*1.5*(1-face);
  const scale=o.warp+(sel?.035:0)+Math.abs(o.ry3)*.0018*(1-face);
  ctx.translate(refrX,refrY);
  ctx.transform(scale,o.shear*(1-face)+o.rx3*.0017,o.shear*.42*(1-face)+o.ry3*.0015,1+(scale-1)*.55,-refrX,-refrY);
  ctx.drawImage(bg,(-o.ry3*1.05)*dpr,(o.rx3*.8)*dpr,bg.width,bg.height,0,0,W,H);
  ctx.globalAlpha=.15;ctx.translate(o.ry3*.28+3,o.rx3*.16-2);ctx.drawImage(bg,0,0,bg.width,bg.height,0,0,W,H);ctx.globalAlpha=1;
  ctx.restore();

  ctx.save();applyM(m);
  const body=ctx.createRadialGradient(-o.rx*.18,-o.ry*.18,5,0,0,Math.max(o.rx,o.ry));
  if(theme==='black'){
    body.addColorStop(0,'rgba(255,255,255,.012)');body.addColorStop(.55,'rgba(255,255,255,.008)');body.addColorStop(1,'rgba(255,255,255,.035)');
  }else{
    body.addColorStop(0,'rgba(255,255,255,.018)');body.addColorStop(.55,'rgba(255,255,255,.010)');body.addColorStop(1,'rgba(255,255,255,.065)');
  }
  ctx.fillStyle=body;ctx.fill(path);
  ctx.lineJoin='round';ctx.lineWidth=1.15;ctx.strokeStyle=theme==='black'?'rgba(255,255,255,.26)':'rgba(0,0,0,.30)';ctx.stroke(path);
  ctx.lineWidth=3.0;ctx.strokeStyle='rgba(255,255,255,.52)';ctx.globalAlpha=theme==='black'?.56:.42;ctx.stroke(path);ctx.globalAlpha=1;

  ctx.save();ctx.clip(path);
  const darkAlpha=theme==='black'?.14:.28;
  let g=ctx.createRadialGradient(o.rx*.45,-o.ry*.14,2,o.rx*.45,-o.ry*.14,o.rx*.64);
  g.addColorStop(0,theme==='black'?`rgba(255,255,255,${darkAlpha})`:`rgba(0,0,0,${darkAlpha})`);g.addColorStop(.28,theme==='black'?'rgba(255,255,255,.05)':'rgba(0,0,0,.08)');g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(-o.rx,-o.ry,o.rx*2,o.ry*2);
  ctx.restore();

  const drift=o.ry3*.010*(1-face);ctx.lineCap='round';ctx.lineWidth=1.25;ctx.strokeStyle='rgba(255,255,255,.78)';
  ctx.beginPath();ctx.ellipse(0,0,o.rx*.965,o.ry*.945,0,Math.PI*(1.055+drift),Math.PI*(1.165+drift));ctx.stroke();
  ctx.lineWidth=.75;ctx.strokeStyle=theme==='black'?'rgba(255,255,255,.15)':'rgba(0,0,0,.15)';ctx.beginPath();ctx.ellipse(0,0,o.rx*.952,o.ry*.934,0,Math.PI*(.20-drift),Math.PI*(.255-drift));ctx.stroke();

  ctx.fillStyle=p.ink;ctx.font=`700 ${o.label==='CONNECTION'?14:16}px Arial, sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.translate(o.rx*.13,o.ry*.05);ctx.rotate(((o.ry3*.12-o.rx3*.06)*(1-face))*Math.PI/180);ctx.fillText(o.label,0,0);
  if(sel||o.focus){ctx.lineWidth=sel?2.8:1.8;ctx.strokeStyle=theme==='black'?'rgba(255,255,255,.60)':'rgba(0,0,0,.56)';ctx.stroke(path)}
  ctx.restore();
}

function render(now){
  const dt=Math.min(.05,(now-last)/1000);last=now;if(!paused)time+=dt;
  if(!drag.active){
    if(keyDir)reelVelocity+=keyDir*.35;
    viewY+=reelVelocity;
    reelVelocity*=keyDir?.985:.935;
    if(Math.abs(reelVelocity)<.02&&!keyDir)reelVelocity=0;
  }
  if(Math.abs(viewY)>REEL_CYCLE*100)viewY%=REEL_CYCLE;
  globalX+=(targetGX-globalX)*.07;globalY+=(targetGY-globalY)*.07;
  drawBackground();

  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,W,H);ctx.drawImage(bg,0,0,bg.width,bg.height,0,0,W,H);
  if(!paused&&!reduce){ctx.globalAlpha=.028;ctx.drawImage(bg,globalX*2.0,globalY*1.3,bg.width,bg.height,0,0,W,H);ctx.globalAlpha=1}

  lenses.forEach((o,i)=>{
    const idle=paused||reduce?0:1;
    const irx=Math.sin(time*(.22+.015*i)+o.seed)*3.5*idle;
    const iry=Math.cos(time*(.18+.014*i)+o.seed*1.2)*4.6*idle;
    const hoverFactor=(o.hover&&activating<0)?1:0;
    o.trx=(-o.ty*13*hoverFactor)+irx;
    o.try=( o.tx*16*hoverFactor)+iry;
    o.trx+=globalY*(1.2+i*.18)*(paused?0:(reduce?.20:1));
    o.try+=globalX*(1.6+i*.22)*(paused?0:(reduce?.20:1));
    if(o.targetFace>0){o.trx=0;o.try=0}
    o.rx3+=(o.trx-o.rx3)*(.10+(o.hover?.05:0));
    o.ry3+=(o.try-o.ry3)*(.10+(o.hover?.05:0));
    o.face+=(o.targetFace-o.face)*(reduce?.45:.115);
    const targetScale=o.targetFace?1.075:1;o.scale+=(targetScale-o.scale)*.12;
    copyYs(o.y).forEach(inst=>drawLens(o,paths[i],inst.y));
  });
  updateHitPositions();
  requestAnimationFrame(render);
}
requestAnimationFrame(render);

window.__LOVE_TREE_V7_R24__={
  version:'71_V7_FINAL_INTERACTIVE_R2.4',
  lensCount:lenses.length,
  routes:ROUTES.map(r=>({...r,resolved:resolveRoute(ROUTES.indexOf(r))})),
  get theme(){return theme},
  get viewY(){return viewY},
  get reelVelocity(){return reelVelocity},
  get reelCycle(){return REEL_CYCLE},
  get selected(){return selected},
  get lensState(){return lenses.map(o=>({label:o.label,hover:o.hover,rx:o.rx3,ry:o.ry3,face:o.face,scale:o.scale,y:lensY(o),copies:copyYs(o.y).map(v=>v.y)}))},
  setTheme,
  activate:activateLens,
  dragTo(y){viewY=y;reelVelocity=0},
  setPaused(v=true){paused=!!v;targetGX=targetGY=globalX=globalY=0;lenses.forEach(o=>{o.tx=o.ty=o.trx=o.try=o.rx3=o.ry3=0})}
};
})();
