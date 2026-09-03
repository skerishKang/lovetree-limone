
(()=>{
'use strict';
const canvas=document.getElementById('stage'),ctx=canvas.getContext('2d',{alpha:true});
const tooltip=document.getElementById('tooltip'), panel=document.getElementById('panel'), summary=document.getElementById('clusterSummary');
const levelLabel=document.getElementById('levelLabel'), orient=document.getElementById('orient'), search=document.getElementById('search'), results=document.getElementById('searchResults');
const emotionFilter=document.getElementById('emotionFilter');
let DPR=Math.min(devicePixelRatio||1,2), W=0,H=0;
function resize(){W=innerWidth;H=innerHeight;canvas.width=W*DPR;canvas.height=H*DPR;canvas.style.width=W+'px';canvas.style.height=H+'px';ctx.setTransform(DPR,0,0,DPR,0,0)}
addEventListener('resize',resize);resize();

// deterministic graph
let seed=60260811; function rand(){seed=(seed*1664525+1013904223)>>>0; return seed/4294967296} function gauss(){let u=Math.max(rand(),1e-6),v=rand();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)}
const emotions=['설렘','위로','감탄','그리움','몰입']; const types=['photo','video','note','link','collage']; const people=['민준','하린','서윤','지우','태오','유나'];
const clusterDefs=[
 {name:'첫 입덕의 밀도',c:[0,0,0],n:310,s:[260,205,185]},
 {name:'무대와 공연',c:[-520,-120,120],n:145,s:[150,120,110]},
 {name:'인터뷰와 말',c:[460,-180,-130],n:125,s:[140,105,120]},
 {name:'멤버 개인 콘텐츠',c:[370,270,180],n:115,s:[130,125,100]},
 {name:'라이브의 밤',c:[-360,300,-180],n:95,s:[115,100,105]},
 {name:'사진으로 남은 날',c:[690,120,30],n:70,s:[90,78,76]},
 {name:'팬캠의 순간',c:[-700,140,-40],n:60,s:[82,72,70]},
 {name:'편지와 기록',c:[160,-450,100],n:45,s:[70,64,68]},
 {name:'다시 돌아온 계절',c:[-120,470,70],n:35,s:[66,60,65]}
];
const nodes=[],edges=[],clusters=[]; let id=0;
for(let ci=0;ci<clusterDefs.length;ci++){
 const d=clusterDefs[ci], start=id, anchors=[];
 for(let i=0;i<d.n;i++){
   let r=Math.pow(rand(),.56), a=rand()*Math.PI*2, b=(rand()-.5)*Math.PI;
   let x=d.c[0]+(Math.cos(a)*Math.cos(b)*d.s[0]*r)+(gauss()*d.s[0]*.10);
   let y=d.c[1]+(Math.sin(a)*Math.cos(b)*d.s[1]*r)+(gauss()*d.s[1]*.10);
   let z=d.c[2]+(Math.sin(b)*d.s[2]*r)+(gauss()*d.s[2]*.13);
   let importance=i<4?3:(i<16?2:1), emotion=emotions[(ci+i)%emotions.length], type=types[(i+ci*2)%types.length];
   let n={id:id++,ci,x,y,z,importance,emotion,type,person:people[(i+ci)%people.length],date:`202${3+(i%4)}.${String(1+(i*3)%12).padStart(2,'0')}.${String(1+(i*7)%28).padStart(2,'0')}`,title:`${d.name} · ${String(i+1).padStart(2,'0')}번째 순간`,keyword:['무대','표정','노래','인터뷰','팬캠','라이브','사진','편지'][(i+ci)%8],bridge:false};
   nodes.push(n); if(importance>=2) anchors.push(n.id);
   if(i>0){ let parent=start+Math.max(0,i-1-Math.floor(rand()*Math.min(8,i))); edges.push({a:n.id,b:parent,type:'local',why:'그 장면의 감정이 다음 순간을 더 찾아보게 했다.'}) }
   if(i>5 && rand()<.12){let q=start+Math.floor(rand()*i);edges.push({a:n.id,b:q,type:'context',why:'같은 시기의 감정이 멀리 있던 기억을 다시 연결했다.'})}
 }
 clusters.push({ci,name:d.name,c:d.c,n:d.n,anchors,start,end:id-1});
}
// 24 derived Bridge Moments and corridors
const bridgePairs=[[0,1],[0,2],[0,3],[0,4],[1,6],[1,5],[2,3],[2,7],[3,5],[3,8],[4,8],[4,7],[0,5],[0,6],[1,2],[2,4],[3,4],[5,8],[6,7],[7,8],[1,8],[2,5],[4,6],[0,7]];
const bridgeRecords=[];
bridgePairs.forEach((pair,k)=>{
 const ca=clusters[pair[0]], cb=clusters[pair[1]];
 const na=nodes[ca.start+Math.min(ca.n-1,4+(k*7)%Math.max(5,ca.n-4))], nb=nodes[cb.start+Math.min(cb.n-1,5+(k*5)%Math.max(6,cb.n-5))];
 na.bridge=true; na.bridgeTo=pair[1]; na.title=`Bridge · ${ca.name}에서 ${cb.name}으로`;
 edges.push({a:na.id,b:nb.id,type:'bridge',why:`${ca.name}에서 느낀 감정이 ${cb.name}을 찾아보게 했다.`,bridgeIndex:k}); bridgeRecords.push({node:na.id,a:pair[0],b:pair[1],edge:edges.length-1});
});
// search keywords/content realism
nodes[0].title='처음 저장한 Moment';nodes[0].keyword='First Moment';

const camera={yaw:-.18,pitch:.10,zoom:.82,tx:0,ty:0,tz:0,target:null};
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;let flyToken=0;function flyTo(tx,ty,tz,zoom,duration=620){const token=++flyToken,s={tx:camera.tx,ty:camera.ty,tz:camera.tz,zoom:camera.zoom},t0=performance.now(),dur=reduced?80:duration;function step(now){if(token!==flyToken)return;let p=Math.min(1,(now-t0)/dur),e=1-Math.pow(1-p,3);camera.tx=s.tx+(tx-s.tx)*e;camera.ty=s.ty+(ty-s.ty)*e;camera.tz=s.tz+(tz-s.tz)*e;camera.zoom=s.zoom+(zoom-s.zoom)*e;if(p<1)requestAnimationFrame(step)}requestAnimationFrame(step)}
let selected=null,selectedCluster=null,hovered=null,bridgeOnly=false,filter='all',drag=false,lastX=0,lastY=0,moved=0,pointers=new Map(),pinchDist=0,pinchZoom=.72,frames=0,lastFps=performance.now(),fps=60;
const projected=new Array(nodes.length), clusterProjected=new Array(clusters.length);
function rotatePoint(n){let x=n.x-camera.tx,y=n.y-camera.ty,z=n.z-camera.tz;let cy=Math.cos(camera.yaw),sy=Math.sin(camera.yaw),cp=Math.cos(camera.pitch),sp=Math.sin(camera.pitch);let x1=x*cy-z*sy,z1=x*sy+z*cy;let y1=y*cp-z1*sp,z2=y*sp+z1*cp;return [x1,y1,z2]}
function projectXYZ(x,y,z){let f=780*camera.zoom, depth=1200+z, s=f/Math.max(300,depth);return [W/2+x*s,H/2+y*s,s,depth]}
function semantic(){return camera.zoom<.90?0:camera.zoom<1.55?1:camera.zoom<2.45?2:3}
function levelName(l){return ['UNIVERSE','CLUSTER','MOMENT FIELD','INSPECT'][l]}
function edgeVisible(e,l){ if(l===0) return e.type==='bridge'||e.type==='local'||e.type==='parent'; if(l===1) return e.type==='bridge'||e.type==='local'||e.type==='parent'; return true }
function selectedEdge(e){return selected!=null&&(e.a===selected||e.b===selected)}
function filterAlpha(n){return filter==='all'||n.emotion===filter?1:.07}
function draw(){
 ctx.clearRect(0,0,W,H); let l=semantic();levelLabel.textContent=levelName(l);orient.style.setProperty('--yawdeg',(camera.yaw*180/Math.PI)+'deg');orient.style.setProperty('--pitchdeg',(camera.pitch*180/Math.PI)+'deg');
 // soft pearl grain field
 for(let i=0;i<26;i++){let x=(i*157%W),y=(i*83%H);ctx.fillStyle='rgba(105,95,100,.018)';ctx.beginPath();ctx.arc(x,y,1+(i%3),0,7);ctx.fill()}
 // project nodes
 for(let i=0;i<nodes.length;i++){let r=rotatePoint(nodes[i]),p=projectXYZ(...r);projected[i]={x:p[0],y:p[1],s:p[2],z:r[2],depth:p[3]}}
 clusters.forEach((c,ci)=>{let fake={x:c.c[0],y:c.c[1],z:c.c[2]},r=rotatePoint(fake),p=projectXYZ(...r);clusterProjected[ci]={x:p[0],y:p[1],s:p[2],z:r[2]}})
 // cluster masses in far/mid
 if(l<=1){
  let order=clusters.map(c=>c.ci).sort((a,b)=>clusterProjected[b].z-clusterProjected[a].z);
  for(const ci of order){let c=clusters[ci],p=clusterProjected[ci],rad=Math.max(24,Math.sqrt(c.n)*7*p.s*(l===0?1.25:.95)); let g=ctx.createRadialGradient(p.x,p.y,1,p.x,p.y,rad);let a=selectedCluster===null||selectedCluster===ci?.09:.025; if(selectedCluster!=null&&selectedCluster!==ci)a=.012;g.addColorStop(0,`rgba(40,39,42,${a})`);g.addColorStop(.55,`rgba(70,68,72,${a*.45})`);g.addColorStop(1,'rgba(100,100,100,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(p.x,p.y,rad,0,7);ctx.fill()}
 }
 // edges back-to-front
 const eOrder=edges.map((e,i)=>i).sort((ia,ib)=>((projected[edges[ib].a].z+projected[edges[ib].b].z)-(projected[edges[ia].a].z+projected[edges[ia].b].z)));
 for(const ei of eOrder){let e=edges[ei];if(!edgeVisible(e,l))continue;let a=projected[e.a],b=projected[e.b];if(!a||!b)continue;let na=nodes[e.a],nb=nodes[e.b];let sel=selectedEdge(e),bridge=e.type==='bridge';let sameCluster=selectedCluster!=null&&(na.ci===selectedCluster||nb.ci===selectedCluster);let alpha=bridge?(l===0?.18:.12):(l===0?.018:(l===1?.055:.075));if(selectedCluster!=null&&!sameCluster&&!sel)alpha*=.18;if(filterAlpha(na)<1&&filterAlpha(nb)<1)alpha*=.16;if(bridgeOnly&&!bridge)alpha*=.06;if(sel)alpha=.88;ctx.lineWidth=sel?2.1:(bridge?1.0:.55);ctx.strokeStyle=sel?'rgba(190,87,122,.88)':bridge?'rgba(116,108,114,'+alpha+')':'rgba(95,91,95,'+alpha+')';ctx.beginPath();ctx.moveTo(a.x,a.y);let mx=(a.x+b.x)/2+(a.y-b.y)*.018,my=(a.y+b.y)/2+(b.x-a.x)*.018;ctx.quadraticCurveTo(mx,my,b.x,b.y);ctx.stroke();
 }
 // nodes depth order
 let order=nodes.map(n=>n.id).sort((a,b)=>projected[b].z-projected[a].z);
 for(const i of order){let n=nodes[i],p=projected[i];if(p.x<-40||p.x>W+40||p.y<-40||p.y>H+40)continue;if(W<760&&l===0&&i%6!==0&&n.importance<2&&!n.bridge)continue;let fa=filterAlpha(n);if(fa<.1&&l<2)continue;let show=l===0 || l>=2 || n.importance>=2 || n.bridge || (l===1&&n.ci===selectedCluster);if(!show)continue;let base=l===0?(n.importance===3?2.35:(n.bridge?1.65:.72)):l===1?(n.importance>=2?2.5:1.25):2.0;let r=Math.max(.7,base*(.68+p.s));if(n.bridge)r+=1.2;if(i===selected)r=5.4;let alpha=(.30+Math.min(.55,p.s*.48))*fa;if(selectedCluster!=null&&n.ci!==selectedCluster&&i!==selected)alpha*=.18;if(bridgeOnly&&!n.bridge&&i!==selected)alpha*=.16;ctx.beginPath();ctx.arc(p.x,p.y,r,0,7);if(i===selected){ctx.fillStyle='#d95f82';ctx.shadowColor='rgba(217,95,130,.45)';ctx.shadowBlur=14}else if(n.bridge){ctx.fillStyle=`rgba(167,126,65,${Math.max(.48,alpha)})`;ctx.shadowColor='rgba(201,154,80,.24)';ctx.shadowBlur=5}else{ctx.fillStyle=`rgba(45,44,48,${alpha})`;ctx.shadowBlur=0}ctx.fill();ctx.shadowBlur=0;
   if((l===1&&n.importance===3&&n.ci===selectedCluster)||(l>=2&&(i===selected||i===hovered||n.importance===3))){ctx.fillStyle='rgba(48,45,48,.78)';ctx.font=(i===selected?'600 11px':'500 10px')+' system-ui';ctx.fillText(n.title.slice(0,28),p.x+r+4,p.y-3)}
 }
 // cluster labels
 if(l<=1){clusters.forEach((c,ci)=>{let p=clusterProjected[ci];if(p.x<0||p.x>W||p.y<0||p.y>H)return;let active=selectedCluster===null||selectedCluster===ci;ctx.fillStyle=active?'rgba(44,41,44,.72)':'rgba(44,41,44,.22)';ctx.font=(ci===0?'650 12px':'600 10px')+' system-ui';ctx.textAlign='center';ctx.fillText(c.name,p.x,p.y-12-Math.sqrt(c.n)*2*p.s);ctx.textAlign='start'})}
 // bridge reveal overlay
 if(selected!=null&&nodes[selected].bridge){let rec=bridgeRecords.find(r=>r.node===selected);if(rec){[rec.a,rec.b].forEach(ci=>{let p=clusterProjected[ci];ctx.strokeStyle='rgba(204,153,69,.45)';ctx.lineWidth=1.3;ctx.beginPath();ctx.arc(p.x,p.y,18+Math.sqrt(clusters[ci].n)*3*p.s,0,7);ctx.stroke()})}}
 frames++; let now=performance.now();if(now-lastFps>700){fps=Math.round(frames*1000/(now-lastFps));frames=0;lastFps=now}
 requestAnimationFrame(draw)
}
requestAnimationFrame(draw);
function nearestHit(x,y){let l=semantic();let best=null,bd=1e9;if(l<=1){clusters.forEach((c,ci)=>{let p=clusterProjected[ci],d=Math.hypot(p.x-x,p.y-y);if(d<Math.max(30,Math.sqrt(c.n)*4*p.s)&&d<bd){best={type:'cluster',id:ci};bd=d}})}
 for(let i=0;i<nodes.length;i++){let n=nodes[i],p=projected[i];if(!p)continue;let allowed=l>=2||n.importance>=2||n.bridge||(selectedCluster===n.ci&&l>=1);if(!allowed)continue;let d=Math.hypot(p.x-x,p.y-y);if(d<10&&d<bd){best={type:'node',id:i};bd=d}}
 return best}
function focusCluster(ci){selectedCluster=ci;selected=null;panel.classList.remove('open');let c=clusters[ci];flyTo(c.c[0],c.c[1],c.c[2],Math.max(camera.zoom,1.28));summary.classList.add('open');summary.querySelector('h3').textContent=c.name;summary.querySelector('p').textContent=`${c.n}개의 Moment · ${bridgeRecords.filter(r=>r.a===ci||r.b===ci).length}개의 Bridge Moment · View-only cluster`;
 let bl=summary.querySelector('.bridge-list');bl.innerHTML='';bridgeRecords.filter(r=>r.a===ci||r.b===ci).slice(0,5).forEach((r,k)=>{let b=document.createElement('button');b.textContent=`Bridge ${k+1}`;b.onclick=()=>selectNode(r.node,true);bl.appendChild(b)})}
function selectNode(i,fly=false){selected=i;try{if(typeof globalThis.__LT60_SELECT__==='function')globalThis.__LT60_SELECT__(i)}catch(_){}let n=nodes[i];selectedCluster=n.ci;if(fly){flyTo(n.x,n.y,n.z,Math.max(camera.zoom,2.35),560)}showPanel(n)}
function showPanel(n){panel.classList.add('open');panel.querySelector('h2').textContent=n.title;panel.querySelector('.meta').innerHTML=`<span class="chip">${n.date}</span><span class="chip">${n.emotion}</span><span class="chip">${n.type}</span><span class="chip">${n.person}</span><span class="chip">#${n.keyword}</span><span class="chip">${clusters[n.ci].name}</span>`;let e=edges.find(e=>e.a===n.id||e.b===n.id);panel.querySelector('.why span').textContent=e?.why||'이 감정이 다음 순간의 탐색을 열었다.';let bb=panel.querySelector('.bridgebox');if(n.bridge){let r=bridgeRecords.find(r=>r.node===n.id);bb.classList.add('open');bb.innerHTML=`<strong>Bridge Moment</strong><br>이 Moment가 <b>${clusters[r.a].name}</b>과 <b>${clusters[r.b].name}</b>을 이어줬어요.<br><small>WHY BEFORE → WHY NEXT를 양쪽 Connection에서 확인할 수 있습니다.</small>`}else bb.classList.remove('open')}
function reset(){flyToken++;selected=null;selectedCluster=null;hovered=null;bridgeOnly=false;camera.yaw=-.18;camera.pitch=.10;camera.zoom=.82;camera.tx=camera.ty=camera.tz=0;panel.classList.remove('open');summary.classList.remove('open');document.getElementById('bridgeMode').textContent='Bridge';toast('전체 기억군 조망으로 돌아왔어요')}
function toast(t){let el=document.getElementById('toast');el.textContent=t;el.classList.add('open');clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove('open'),1700)}
document.getElementById('reset').onclick=reset;panel.querySelector('.close').onclick=()=>{selected=null;panel.classList.remove('open')};
document.getElementById('bridgeMode').onclick=e=>{bridgeOnly=!bridgeOnly;e.currentTarget.textContent=bridgeOnly?'Bridge ON':'Bridge';toast(bridgeOnly?'다른 기억군으로 이어진 Moment만 강조합니다':'전체 Connection 문맥을 복원했습니다')};emotionFilter.onchange=e=>{filter=e.target.value;toast(filter==='all'?'감정 필터 해제':filter+' Moment를 강조합니다')};
canvas.addEventListener('wheel',e=>{e.preventDefault();camera.zoom*=Math.exp(-e.deltaY*.0011);camera.zoom=Math.max(.48,Math.min(3.4,camera.zoom))},{passive:false});
canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});lastX=e.clientX;lastY=e.clientY;moved=0;if(pointers.size===1){drag=true;canvas.classList.add('dragging')}if(pointers.size===2){let a=[...pointers.values()];pinchDist=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);pinchZoom=camera.zoom}});
canvas.addEventListener('pointermove',e=>{if(pointers.has(e.pointerId))pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===2){let a=[...pointers.values()],d=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);if(pinchDist>0)camera.zoom=Math.max(.48,Math.min(3.4,pinchZoom*d/pinchDist));return}if(drag){let dx=e.clientX-lastX,dy=e.clientY-lastY;moved+=Math.abs(dx)+Math.abs(dy);camera.yaw+=dx*.006;camera.pitch=Math.max(-.75,Math.min(.75,camera.pitch+dy*.0045));lastX=e.clientX;lastY=e.clientY}else if(innerWidth>760){let hit=nearestHit(e.clientX,e.clientY);hovered=hit?.type==='node'?hit.id:null;if(hovered!=null){let n=nodes[hovered];tooltip.classList.add('open');tooltip.style.left=Math.min(W-275,e.clientX+14)+'px';tooltip.style.top=Math.min(H-100,e.clientY+14)+'px';tooltip.querySelector('b').textContent=n.title;tooltip.querySelector('small').textContent=`${n.date} · ${n.emotion} · ${n.type}${n.bridge?' · Bridge Moment':''}`}else tooltip.classList.remove('open')}});
canvas.addEventListener('pointerup',e=>{let wasMoved=moved;pointers.delete(e.pointerId);if(pointers.size===0){drag=false;canvas.classList.remove('dragging');if(wasMoved<8){let hit=nearestHit(e.clientX,e.clientY);if(hit?.type==='cluster')focusCluster(hit.id);else if(hit?.type==='node')selectNode(hit.id,semantic()>=2)}}});canvas.addEventListener('pointercancel',e=>{pointers.delete(e.pointerId);drag=false;canvas.classList.remove('dragging')});
canvas.addEventListener('dblclick',e=>{if(!nearestHit(e.clientX,e.clientY))reset()});
search.addEventListener('input',()=>{let q=search.value.trim().toLowerCase();if(!q){results.classList.remove('open');return}let found=nodes.filter(n=>(n.title+' '+n.keyword+' '+n.person+' '+n.emotion).toLowerCase().includes(q)).slice(0,8);results.innerHTML='';found.forEach(n=>{let d=document.createElement('div');d.className='result';d.innerHTML=`<b>${n.title}</b><small>${n.date} · ${n.emotion} · ${n.person} · ${clusters[n.ci].name}</small>`;d.onclick=()=>{results.classList.remove('open');search.value='';selectNode(n.id,true);toast('검색한 Moment로 이동했습니다')};results.appendChild(d)});results.classList.toggle('open',found.length>0)});
addEventListener('keydown',e=>{if(e.key==='Escape'){selected=null;panel.classList.remove('open');summary.classList.remove('open')}if(e.key.toLowerCase()==='r')reset();if(e.key==='+'||e.key==='=')camera.zoom=Math.min(3.4,camera.zoom*1.15);if(e.key==='-')camera.zoom=Math.max(.48,camera.zoom/1.15);if(e.key==='ArrowLeft')camera.yaw-=.12;if(e.key==='ArrowRight')camera.yaw+=.12;if(e.key==='ArrowUp')camera.pitch=Math.max(-.75,camera.pitch-.08);if(e.key==='ArrowDown')camera.pitch=Math.min(.75,camera.pitch+.08)});
// QA hook – read-only state for automated validation
window.__LT60__={nodes,edges,clusters,bridgeRecords,camera,get semantic(){return semantic()},get selected(){return selected},get selectedCluster(){return selectedCluster},selectNode,focusCluster,reset,setZoom:z=>camera.zoom=z,rotate:(yaw,pitch)=>{camera.yaw=yaw;camera.pitch=pitch},get fps(){return fps},projection:i=>projected[i],clusterProjection:i=>clusterProjected[i],get visibleMobileMacroEstimate(){return nodes.filter((n,i)=>i%6===0||n.importance>=2||n.bridge).length}};
})();

(()=>{
'use strict';
const lt=window.__LT60__; if(!lt) return;
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const overlay=$('#pathOverlay'), octx=overlay.getContext('2d');
const viewer=$('#momentViewer'), book=$('#bookHandoff'), conn=$('#connectionHandoff'), pathCard=$('#pathPreview');
let modalState=null, pathState={active:false,nodes:[],edgeIds:[],branchIds:[],playIndex:-1,timer:null,saved:null};
const handoffs={track59:null,track55:null,track56:null,last:null};
function resizeOverlay(){const dpr=Math.min(2,devicePixelRatio||1);overlay.width=innerWidth*dpr;overlay.height=innerHeight*dpr;overlay.style.width=innerWidth+'px';overlay.style.height=innerHeight+'px';octx.setTransform(dpr,0,0,dpr,0,0)}
resizeOverlay();addEventListener('resize',resizeOverlay);
function snapshot(){return {camera:{yaw:lt.camera.yaw,pitch:lt.camera.pitch,zoom:lt.camera.zoom,tx:lt.camera.tx,ty:lt.camera.ty,tz:lt.camera.tz},selected:lt.selected,selectedCluster:lt.selectedCluster,filter:$('#emotionFilter').value,bridgeText:$('#bridgeMode').textContent}}
function restore(st){if(!st)return;Object.assign(lt.camera,st.camera);$('#emotionFilter').value=st.filter;if(st.selected!=null)lt.selectNode(st.selected,false)}
function selectedNode(){return lt.selected==null?null:lt.nodes[lt.selected]}
function incident(nodeId){return lt.edges.map((e,i)=>({...e,index:i})).filter(e=>e.a===nodeId||e.b===nodeId)}
function localParent(nodeId){let x=lt.edges.map((e,i)=>({...e,index:i})).find(e=>(e.type==='local'||e.type==='parent')&&e.a===nodeId);return x||null}
function localChildren(nodeId){return lt.edges.map((e,i)=>({...e,index:i})).filter(e=>(e.type==='local'||e.type==='parent')&&e.b===nodeId)}
function context(n){
 const inc=incident(n.id), primary=inc.find(e=>e.type==='bridge')||inc.find(e=>e.type==='local')||inc.find(e=>e.type==='parent')||inc[0];
 const other=primary?lt.nodes[primary.a===n.id?primary.b:primary.a]:null;
 const parent=localParent(n.id); const prev=parent?lt.nodes[parent.b]:other;
 const child=localChildren(n.id)[0]; const next=child?lt.nodes[child.a]:other;
 const sourceNames={photo:'Photo Archive',video:'YouTube / Video',note:'Private Note',link:'Web Link',collage:'Collage / Letter'};
 const ext={photo:'jpg',video:'watch',note:'note',link:'source',collage:'letter'}[n.type]||'moment';
 return {edge:primary,prev,next,source:sourceNames[n.type]||'Moment Source',url:`https://example.com/lovetree/${ext}/${String(n.id).padStart(4,'0')}`,note:(n.memo||'')||`${n.date}, ${n.person}을 보며 남긴 기록. “${n.keyword}”에서 시작된 ${n.emotion}의 감정이 이 순간을 오래 남게 했다.`,why:primary?.why||'이 감정이 다음 순간의 탐색을 열었다.'};
}
function modalOpen(el){modalState=snapshot();el.classList.add('open');el.querySelector('.action-close')?.focus()}
function modalClose(el){el.classList.remove('open');restore(modalState);modalState=null}
function momentChip(n){return `<span class="chip">${n.date}</span><span class="chip">${n.emotion}</span><span class="chip">${n.type}</span><span class="chip">${lt.clusters[n.ci].name}</span>${n.bridge?'<span class="chip">Bridge Moment</span>':''}`}
function mediaHTML(n,c){
 const full={photo:`<b>Photo Moment</b><span>${n.title}<br>${n.person} · ${n.date}<br>선택한 사진 Moment를 큰 화면으로 확인합니다.</span>`,video:`<b>Video Poster</b><span>${n.title}<br>Prototype preview · 실제 제품에서는 sourceUrl의 허용된 player/poster가 연결됩니다.</span>`,note:`<b>전체 Note</b><span>${c.note}<br><br>${c.note}</span>`,link:`<b>Link Clipping</b><span>${n.title}<br>${c.url}<br><br>원본 source와 기록 당시의 감정을 함께 보존합니다.</span>`,collage:`<b>Collage / Letter</b><span>${n.title}<br><br>사진 조각 · 손글씨 · ${n.keyword} 메모가 한 장의 기억으로 묶인 Moment입니다.</span>`};return full[n.type]||(n.type==='youtube'?full.video:full.photo)
}
function openViewer(){const n=selectedNode();if(!n)return;const c=context(n);modalOpen(viewer);viewer.querySelector('.action-title').textContent=n.title;viewer.querySelector('.action-sub').innerHTML=momentChip(n);let media=viewer.querySelector('.viewer-media');media.className='viewer-media '+n.type;viewer.querySelector('.media-copy').innerHTML=mediaHTML(n,c);viewer.querySelector('.source').innerHTML=`<b>SOURCE · CAPTURED</b>${c.source}<br>${n.date}<br>${n.type==='link'?`<a href="${c.url}" target="_blank" rel="noreferrer">프로토타입 원본 링크 열기 ↗</a>`:c.url}`;viewer.querySelector('.note').innerHTML=`<b>NOTE / CAPTION</b>${c.note}`;viewer.querySelector('.whydetail').innerHTML=`<b>WHY NEXT</b>${c.why}`;viewer.querySelector('.bridgeinfo').innerHTML=n.bridge?`<b>BRIDGE</b>이 Moment는 ${lt.clusters[n.ci].name}에서 다른 기억군으로 넘어가게 한 Bridge Moment입니다.`:`<b>CLUSTER</b>${lt.clusters[n.ci].name}에 속한 Moment입니다.`;let nav=viewer.querySelector('.nav-moments');nav.innerHTML=`<button data-nav="prev" ${c.prev?'':'disabled'}>← 이전 Moment<b>${c.prev?c.prev.title:'없음'}</b></button><button data-nav="next" ${c.next?'':'disabled'}>다음 Moment →<b>${c.next?c.next.title:'없음'}</b></button>`;nav.querySelector('[data-nav="prev"]')?.addEventListener('click',()=>{if(c.prev){modalClose(viewer);lt.selectNode(c.prev.id,false);openViewer()}});nav.querySelector('[data-nav="next"]')?.addEventListener('click',()=>{if(c.next){modalClose(viewer);lt.selectNode(c.next.id,false);openViewer()}})}
function openBook(){const n=selectedNode();if(!n)return;const c=context(n);modalOpen(book);book.querySelector('.action-title').textContent=n.title;book.querySelector('.left').innerHTML=`<div class="book-cue">← ${c.prev?c.prev.title:'이전 페이지'}</div><div class="book-photo">${n.type.toUpperCase()} · ${n.title}</div><div class="book-cue">${n.date} · ${n.emotion}</div><span class="page-no">${n.id+1}</span>`;book.querySelector('.right').innerHTML=`<div class="book-cue">${c.next?c.next.title:'다음 페이지'} →</div><div class="book-note">${c.note}</div><div class="book-why"><b>WHY NEXT</b><br>${c.why}</div><span class="page-no">${n.id+2}</span>`;book.querySelector('.route-receipt').classList.remove('open')}
function openConnection(){const n=selectedNode();if(!n)return;const c=context(n),dest=c.next||c.prev;modalOpen(conn);conn.querySelector('.current').innerHTML=`<div class="action-kicker">CURRENT MOMENT</div><b>${n.title}</b><div class="meta">${momentChip(n)}</div>`;conn.querySelector('.destination').innerHTML=`<div class="action-kicker">DESTINATION PREVIEW</div><b>${dest?dest.title:'연결된 Moment'}</b><p>${dest?dest.date+' · '+dest.emotion:'선택된 Connection의 반대편 Moment'}</p>`;conn.querySelector('.conn-arrow small').textContent=c.why;conn.querySelector('.bridge-note').innerHTML=`<b>현재 Connection</b><br>${c.edge?`#${c.edge.index} · ${c.edge.type}`:'local'} · ${c.why}<br>${n.bridge?'<strong>Bridge Moment · 두 기억군을 잇는 연결</strong>':'일반 Moment Connection'}`;conn.querySelector('.route-receipt').classList.remove('open')}
function routeFor(nodeId){
 const seq=[nodeId], edgeIds=[]; let cur=nodeId;
 while(seq.length<5){let p=localParent(cur);if(!p)break;seq.unshift(p.b);edgeIds.unshift(p.index);cur=p.b}
 cur=nodeId;
 while(seq.length<5){let kids=localChildren(cur).filter(e=>!seq.includes(e.a)).sort((a,b)=>lt.nodes[b.a].importance-lt.nodes[a.a].importance);if(!kids.length)break;let k=kids[0];seq.push(k.a);edgeIds.push(k.index);cur=k.a}
 // extend from the earliest node with a different child if necessary
 if(seq.length<4){for(const base of [...seq]){for(const k of localChildren(base)){if(!seq.includes(k.a)){seq.push(k.a);edgeIds.push(k.index);if(seq.length>=4)break}}if(seq.length>=4)break}}
 const orderedEdges=[];for(let i=0;i<seq.length-1;i++){let ei=lt.edges.findIndex(e=>(e.type==='local'||e.type==='parent')&&((e.a===seq[i]&&e.b===seq[i+1])||(e.b===seq[i]&&e.a===seq[i+1])));orderedEdges.push(ei)}
 const branches=seq.filter(id=>localChildren(id).length>1);return {nodes:seq,edgeIds:orderedEdges,branches}
}
function frameRoute(route){let ns=route.nodes.map(id=>lt.nodes[id]);let cx=ns.reduce((a,n)=>a+n.x,0)/ns.length,cy=ns.reduce((a,n)=>a+n.y,0)/ns.length,cz=ns.reduce((a,n)=>a+n.z,0)/ns.length;lt.camera.tx=cx;lt.camera.ty=cy;lt.camera.tz=cz;lt.camera.zoom=Math.max(1.18,Math.min(1.58,lt.camera.zoom))}
function renderPathCard(){let n=selectedNode(),seq=pathState.nodes;pathCard.querySelector('h3').textContent=`${lt.clusters[n.ci].name} · 발견 경로`;let current=Math.max(0,seq.indexOf(n.id));pathCard.querySelector('.path-stats').innerHTML=`<span class="chip">${seq.length} Moments</span><span class="chip">현재 ${current+1}/${seq.length}</span><span class="chip">First ${lt.nodes[seq[0]].title}</span><span class="chip">Branch ${pathState.branchIds.length}</span>`;let row=pathCard.querySelector('.path-route');row.innerHTML='';seq.forEach((id,i)=>{let d=document.createElement('div');d.className='path-dot'+(i===pathState.playIndex?' current':'');d.textContent=i+1;d.title=lt.nodes[id].title;row.appendChild(d);if(i<seq.length-1){let l=document.createElement('span');l.className='path-link'+(pathState.playIndex>i?' past':'');row.appendChild(l)}});pathCard.querySelector('.route-receipt').classList.remove('open')}
function openPath(){const n=selectedNode();if(!n)return;pathState.saved=snapshot();let r=routeFor(n.id);pathState.active=true;pathState.nodes=r.nodes;pathState.edgeIds=r.edgeIds;pathState.branchIds=r.branches;pathState.playIndex=Math.max(0,r.nodes.indexOf(n.id));frameRoute(r);overlay.classList.add('open');pathCard.classList.add('open');renderPathCard();pathCard.querySelector('.path-play-status').textContent='현재 Path 전체가 3D graph 위에 강조되었습니다.'}
function closePath(){clearInterval(pathState.timer);pathState.timer=null;pathState.active=false;pathState.nodes=[];pathState.edgeIds=[];pathState.branchIds=[];pathState.playIndex=-1;overlay.classList.remove('open');pathCard.classList.remove('open');restore(pathState.saved);pathState.saved=null}
function playPath(){if(!pathState.active)return;clearInterval(pathState.timer);pathState.playIndex=0;renderPathCard();pathCard.querySelector('.path-play-status').textContent=`1/${pathState.nodes.length} · ${lt.nodes[pathState.nodes[0]].title}`;let step=0;pathState.timer=setInterval(()=>{step++;if(step>=pathState.nodes.length){clearInterval(pathState.timer);pathState.timer=null;pathCard.querySelector('.path-play-status').textContent=`경로 재생 완료 · ${pathState.nodes.length} Moment`;return}pathState.playIndex=step;renderPathCard();pathCard.querySelector('.path-play-status').textContent=`${step+1}/${pathState.nodes.length} · ${lt.nodes[pathState.nodes[step]].title}`},matchMedia('(prefers-reduced-motion: reduce)').matches?180:620)}
function drawPathOverlay(){octx.clearRect(0,0,innerWidth,innerHeight);if(pathState.active){octx.fillStyle='rgba(250,249,247,.70)';octx.fillRect(0,0,innerWidth,innerHeight);for(let i=0;i<pathState.nodes.length-1;i++){let a=lt.projection(pathState.nodes[i]),b=lt.projection(pathState.nodes[i+1]);if(!a||!b)continue;let past=i<pathState.playIndex,current=i===pathState.playIndex-1;octx.strokeStyle=current?'rgba(211,81,120,.98)':past?'rgba(186,82,112,.82)':'rgba(137,107,160,.42)';octx.lineWidth=current?4:past?2.6:1.7;octx.beginPath();octx.moveTo(a.x,a.y);let mx=(a.x+b.x)/2+(a.y-b.y)*.025,my=(a.y+b.y)/2+(b.x-a.x)*.025;octx.quadraticCurveTo(mx,my,b.x,b.y);octx.stroke()}pathState.nodes.forEach((id,i)=>{let p=lt.projection(id);if(!p)return;let isCurrent=i===pathState.playIndex;octx.beginPath();octx.arc(p.x,p.y,isCurrent?7:4,0,Math.PI*2);octx.fillStyle=isCurrent?'#d95f82':i<pathState.playIndex?'#b95d77':'#766f76';octx.fill();if(pathState.branchIds.includes(id)){octx.beginPath();octx.arc(p.x,p.y,isCurrent?12:9,0,Math.PI*2);octx.strokeStyle='rgba(201,154,80,.85)';octx.lineWidth=1.5;octx.stroke()}})}requestAnimationFrame(drawPathOverlay)}
requestAnimationFrame(drawPathOverlay);
const NAV_TARGETS={
  59:'../../59_러브트리_메모리스케치북_페이지여정/버전5_스토리자동재생·인라인편집·시네마틱배경_최신후보/현재후보.html',
  55:'../../55_러브트리_자유연결_경로편집/★_최종선택_55_LUPT_자유연결_V1.2_바로보기.html',
  56:'../../56_러브트리_세로형_모먼트관계망_전체조망/후보_버전1.2_세로형_모먼트관계망_전체조망.html'
};
const HANDOFF_KEY='lovetree:view-handoff', navEvents=[];
function receipt(el,label,payload,status='target-ready'){el.textContent='';el.classList.add('open');let b=document.createElement('b');b.textContent=label+' · '+status;let pre=document.createElement('code');pre.textContent=JSON.stringify(payload);el.append(b,document.createElement('br'),pre)}
function handoffState(track,payload){
  const state={from:'track60',targetTrack:`track${track}`,...payload,cameraState:snapshot().camera,timestamp:new Date().toISOString()};
  try{sessionStorage.setItem(HANDOFF_KEY,JSON.stringify(state));localStorage.setItem(HANDOFF_KEY,JSON.stringify(state))}catch(_){}
  return state
}
function targetURL(track,payload){
  const base=NAV_TARGETS[track], q=new URLSearchParams();
  if(payload?.momentId!=null)q.set('moment',String(payload.momentId));
  if(payload?.connectionId!=null)q.set('connection',String(payload.connectionId));
  if(payload?.pathId)q.set('path',payload.pathId);
  if(payload?.branchId!=null)q.set('branch',String(payload.branchId));
  q.set('from','track60');
  return base+'#'+q.toString()
}
function openActualTarget(track,payload,receiptEl){
  const state=handoffState(track,payload),url=targetURL(track,payload);
  handoffs[`track${track}`]=state;handoffs.last=`track${track}`;
  let child=null,mode='new-tab';
  try{child=window.open(url,'_blank')}catch(_){}
  if(!child){mode='same-tab-fallback';navEvents.push({track,url,mode,state});receipt(receiptEl,`Track ${track}`,{url,...state},'popup blocked · same-tab fallback');location.href=url;return state}
  try{child.opener=null}catch(_){}
  navEvents.push({track,url,mode,state});
  receipt(receiptEl,`Track ${track}`,{url,...state},'actual HTML 새 탭 open 요청 완료');
  return state
}
window.openTrack59=(payload)=>openActualTarget(59,payload,book.querySelector('.route-receipt'));
window.openTrack55=(payload)=>openActualTarget(55,payload,conn.querySelector('.route-receipt'));
window.openTrack56=(payload)=>openActualTarget(56,payload,pathCard.querySelector('.route-receipt'));
function payloadBase(){let n=selectedNode(),s=snapshot();return {momentId:n?.id,momentTitle:n?.title,returnView:'track60',cameraState:s.camera,selectedCluster:n?.ci,filter:s.filter,bridgeMode:s.bridgeOnly}}

function bindButton(el,handler){if(!el)return;el.type='button';el.addEventListener('pointerdown',e=>e.stopPropagation());el.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();handler(e)})}
bindButton($('#openMomentViewer'),openViewer);
bindButton($('#openBookHandoff'),openBook);
bindButton($('#openConnectionHandoff'),openConnection);
bindButton($('#openPathPreview'),openPath);
$$('[data-close-action]').forEach(b=>bindButton(b,()=>modalClose($('#'+b.dataset.closeAction))));
$$('[data-return-action]').forEach(b=>bindButton(b,()=>modalClose($('#'+b.dataset.returnAction))));
bindButton(book.querySelector('[data-route="59"]'),()=>window.openTrack59(payloadBase()));
bindButton(conn.querySelector('[data-route="55"]'),()=>{let n=selectedNode(),c=context(n);window.openTrack55({...payloadBase(),connectionId:c.edge?.index??null,destinationMomentId:(c.next||c.prev)?.id??null,bridge:n.bridge})});
bindButton(pathCard.querySelector('[data-path-play]'),playPath);
bindButton(pathCard.querySelector('[data-route="56"]'),()=>window.openTrack56({...payloadBase(),pathId:`cluster-${selectedNode()?.ci}-path-${pathState.nodes[0]}-${pathState.nodes.at(-1)}`,branchId:pathState.branchIds[0]??null,momentIds:[...pathState.nodes]}));
bindButton(pathCard.querySelector('[data-path-return]'),closePath);
[viewer,book,conn].forEach(el=>el.addEventListener('click',e=>{if(e.target===el)modalClose(el)}));
addEventListener('keydown',e=>{if(e.key==='Escape'){if(viewer.classList.contains('open'))modalClose(viewer);else if(book.classList.contains('open'))modalClose(book);else if(conn.classList.contains('open'))modalClose(conn);else if(pathState.active)closePath()}});
window.__LT60_V12__={NAV_TARGETS,HANDOFF_KEY,handoffs,navEvents,get path(){return {active:pathState.active,nodes:[...pathState.nodes],edgeIds:[...pathState.edgeIds],branchIds:[...pathState.branchIds],playIndex:pathState.playIndex}},openViewer,openBook,openConnection,openPath,closePath,playPath,context,routeFor,snapshot,restore,targetURL,openActualTarget};
})();
