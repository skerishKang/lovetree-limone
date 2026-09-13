
    const personDefs=[
      {key:'felix',name:'필릭스',latin:'FELIX',color:'#68d8ff',center:[-270,-65,45],tags:['스트레이키즈','무대','목소리'],videos:[
        ['nOrDWTMSR0w','처음 마음을 멈추게 한 神메뉴','낮게 울리는 목소리와 강한 눈빛을 처음 오래 바라본 순간.'],['ts_xlXdsl4M','계속 다시 본 Back Door','짧게 지나가도 이상하게 다시 돌아오게 되는 움직임.'],['IaWoxBn4kDo','표정이 바뀌는 Easy','무대 한가운데서 분위기가 완전히 달라진 몇 초.'],['sFPKeBPdFZ8','웃는 모습까지 좋아진 날','무대 밖의 장난스러운 결까지 기억하고 싶어진 순간.'],['88gQkK_p_t0','God’s Menu 4K 직캠','화면 안에서 시선을 붙잡은 선명한 무대 기록.'],['d2X4dhqub9M','2020 가요대전 페이스캠','강한 장면 사이로 보인 세밀한 표정의 변화.']]},
      {key:'juyeon',name:'이주연',latin:'JUYEON',color:'#ff5ebd',center:[250,-95,-30],tags:['더보이즈','직캠','퍼포먼스'],videos:[
        ['qKkJ6YHLhak','WHISPER로 시작된 마음','정확한 동작과 부드러운 선을 자꾸 다시 보게 된 날.'],['ePAi-0qKEio','한 사람의 춤에 빠진 순간','무대가 아니라 한 편의 이야기처럼 남은 퍼포먼스.'],['93jg1vU4R5I','여름빛 Passion Fruit','밝은 표정과 리듬이 오래 마음에 남았던 직캠.'],['9I7Au-q7eH8','무대 밖의 다정한 BOYLOG','프로 아이돌의 하루를 따라가며 더 좋아지게 된 장면.'],['3HPze4eDQTs','형 따라 파리로 간 기록','새로운 장소에서 보인 편안한 표정과 말투.'],['CuGtbPTwrIc','Hot과 아기고양이 사이','서로 다른 분위기가 한 사람 안에서 이어지는 순간.']]},
      {key:'junhyuk',name:'이준혁',latin:'LEE JUN HYUK',color:'#79f0b3',center:[10,235,75],tags:['배우','인터뷰','장면'],videos:[
        ['a1gsq3jC0Tg','게임을 안 하는 이유','조용히 답하는 방식에서 예상 밖의 귀여움을 발견한 날.'],['17UP5Pfmduo','이준혁의 손 크기는?','짧은 질문 하나에 웃게 된 소소한 기억.'],['2SDl278ezBQ','가을엔 영화처럼','차분한 목소리로 길게 이어진 라디오의 시간.'],['-uYx6joIm0g','서동재의 선명한 인상','수트와 표정만으로 장면의 공기를 바꾸었던 기억.'],['O3ptaX7-G8w','윙크하고 사라진 순간','짧아서 더 오래 기억에 남은 장난스러운 한 장면.'],['kUobSk5oe_U','잘생긴 빌런이라는 말','무대인사에서 웃는 얼굴까지 이어서 보게 된 날.']]}
    ];
    const emotionWords=['설렘','다시 봄','처음 마음','웃음','목소리','눈빛','무대','다정함','발견','위로','심쿵','계속 보고 싶은','기억','좋아진 날','입덕 순간','팬의 추천','댓글을 따라','오늘의 장면'];
    const canvas=document.getElementById('graph'),ctx=canvas.getContext('2d'),space=document.getElementById('space');
    const nodes=[],edges=[],imageCache=new Map();let dpr=1,cw=0,ch=0,selected=null,hovered=null;
    const camera={yaw:-.28,pitch:.08,zoom:.96,targetZoom:.96,focus:{x:0,y:0,z:0},targetFocus:{x:0,y:0,z:0},auto:true};
    const ui={showFragments:true,showLinks:true,nodeScale:1,layout:'auto',search:'',dragging:false,downX:0,downY:0,lastX:0,lastY:0,moved:0};
    let seed=89317;function rnd(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}
    function thumb(id){return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`}
    function addNode(data){const n={id:nodes.length,x:0,y:0,z:0,tx:0,ty:0,tz:0,sx:0,sy:0,sr:0,depth:0,alpha:1,...data};nodes.push(n);return n}
    function link(a,b,kind='normal'){edges.push({a:a.id,b:b.id,kind})}
    const root=addNode({type:'root',label:'나의 LoveTree 우주',person:'LoveTree',size:38,color:'#ff71b7',description:'좋아하게 된 영상과 감정이 사람별 가지로 이어진 나만의 기억 우주.',tags:['lovetree','memory-universe'],date:'2026.08.03'});
    const hubs=[];
    personDefs.forEach((p,pi)=>{
      const hub=addNode({type:'hub',label:`${p.name}의 LoveTree`,person:p.name,personKey:p.key,size:33,color:p.color,videoId:p.videos[0][0],description:`${p.name}에게 마음이 머문 영상과 감정이 모인 중심 가지.`,tags:p.tags,date:`2026.0${pi+6}.01`,cluster:pi});hubs.push(hub);link(root,hub,'trunk');
      const videoNodes=[];
      p.videos.forEach((v,vi)=>{const n=addNode({type:'video',label:v[1],person:p.name,personKey:p.key,size:21+(vi%3)*2,color:p.color,videoId:v[0],description:v[2],tags:[p.latin.toLowerCase(),'video-moment',emotionWords[(pi*6+vi)%emotionWords.length]],date:`2026.08.${String(vi+1).padStart(2,'0')}`,cluster:pi,order:vi});videoNodes.push(n);link(hub,n,'branch');if(vi)link(videoNodes[vi-1],n,'timeline')});
      videoNodes.forEach((video,vi)=>{for(let fi=0;fi<24;fi++){const word=emotionWords[(fi+vi*3+pi*5)%emotionWords.length],frag=addNode({type:'fragment',label:`${word} · ${String(fi+1).padStart(2,'0')}`,person:p.name,personKey:p.key,size:2.4+rnd()*3.8,color:p.color,description:`‘${video.label}’에 붙여 둔 ${word} 감정 조각.`,tags:[word,'emotion-fragment'],date:video.date,cluster:pi,parentVideo:video.id,fragIndex:fi});link(video,frag,'memory')}});
      for(let i=0;i<30;i++){const a=videoNodes[Math.floor(rnd()*videoNodes.length)],b=videoNodes[Math.floor(rnd()*videoNodes.length)];if(a!==b)link(a,b,'cross')}
    });
    const nodeById=id=>nodes[id];
    function setTargets(layout){
      ui.layout=layout;
      root.tx=root.ty=root.tz=0;
      personDefs.forEach((p,pi)=>{
        const hub=hubs[pi],videos=nodes.filter(n=>n.type==='video'&&n.cluster===pi),frags=nodes.filter(n=>n.type==='fragment'&&n.cluster===pi);
        if(layout==='orbit'){
          const ha=pi/3*Math.PI*2-Math.PI/2;hub.tx=Math.cos(ha)*230;hub.ty=Math.sin(ha)*190;hub.tz=0;
          videos.forEach((n,i)=>{const a=i/videos.length*Math.PI*2;n.tx=hub.tx+Math.cos(a)*115;n.ty=hub.ty+Math.sin(a)*90;n.tz=Math.sin(a*2)*85});
          frags.forEach((n,i)=>{const parent=nodeById(n.parentVideo),a=n.fragIndex/24*Math.PI*2,r=38+(n.fragIndex%5)*8;n.tx=parent.tx+Math.cos(a)*r;n.ty=parent.ty+Math.sin(a)*r*.7;n.tz=parent.tz+Math.sin(a*3)*32});
        }else if(layout==='timeline'){
          hub.tx=-360;hub.ty=(pi-1)*210;hub.tz=0;
          videos.forEach((n,i)=>{n.tx=-245+i*98;n.ty=(pi-1)*210;n.tz=(i%2?55:-55)});
          frags.forEach(n=>{const parent=nodeById(n.parentVideo),a=n.fragIndex/24*Math.PI*2,r=22+(n.fragIndex%6)*6;n.tx=parent.tx+Math.cos(a)*r;n.ty=parent.ty+Math.sin(a)*r;n.tz=parent.tz+(rnd()-.5)*50});
        }else{
          hub.tx=p.center[0];hub.ty=p.center[1];hub.tz=p.center[2];
          videos.forEach((n,i)=>{const a=i/videos.length*Math.PI*2+pi*.65,r=125+(i%2)*48;n.tx=hub.tx+Math.cos(a)*r;n.ty=hub.ty+Math.sin(a)*r*.74;n.tz=hub.tz+Math.sin(a*1.7)*115});
          frags.forEach(n=>{const parent=nodeById(n.parentVideo),a=n.fragIndex/24*Math.PI*2+(n.parentVideo%5)*.3,r=30+(n.fragIndex%7)*9;n.tx=parent.tx+Math.cos(a)*r+(rnd()-.5)*18;n.ty=parent.ty+Math.sin(a)*r*.72+(rnd()-.5)*16;n.tz=parent.tz+Math.sin(a*2.1)*48+(rnd()-.5)*30});
        }
      });
      nodes.forEach(n=>{if(!Number.isFinite(n.x)||(!n.x&&!n.y&&!n.z)){n.x=n.tx+(rnd()-.5)*30;n.y=n.ty+(rnd()-.5)*30;n.z=n.tz+(rnd()-.5)*30}})
    }
    setTargets('auto');
    function getImage(id){if(!id)return null;if(imageCache.has(id))return imageCache.get(id);const img=new Image();img.src=thumb(id);img.onload=()=>{};imageCache.set(id,img);return img}
    nodes.filter(n=>n.videoId).forEach(n=>getImage(n.videoId));
    const stars=Array.from({length:520},()=>({x:rnd(),y:rnd(),r:.25+rnd()*1.45,a:.12+rnd()*.7,t:rnd()*6.28,c:rnd()>.86?(rnd()>.5?'#8bdfff':'#ffe8aa'):'#fff'}));
    function resize(){dpr=Math.min(1.6,window.devicePixelRatio||1);cw=space.clientWidth;ch=space.clientHeight;canvas.width=Math.max(1,Math.floor(cw*dpr));canvas.height=Math.max(1,Math.floor(ch*dpr));canvas.style.width=cw+'px';canvas.style.height=ch+'px';ctx.setTransform(dpr,0,0,dpr,0,0)}
    function rotatePoint(n,time){
      const wobble=n.type==='fragment'?Math.sin(time*.00045+n.id)*3:Math.sin(time*.00022+n.id)*1.1;
      let x=n.x-camera.focus.x+wobble,y=n.y-camera.focus.y+Math.cos(time*.00035+n.id)*wobble,z=n.z-camera.focus.z;
      const cy=Math.cos(camera.yaw),sy=Math.sin(camera.yaw),cp=Math.cos(camera.pitch),sp=Math.sin(camera.pitch);const x1=x*cy-z*sy,z1=x*sy+z*cy,y1=y*cp-z1*sp,z2=y*sp+z1*cp;return{x:x1,y:y1,z:z2}
    }
    function matches(n){if(!ui.search)return true;const q=ui.search;return `${n.label} ${n.person} ${(n.tags||[]).join(' ')}`.toLowerCase().includes(q)}
    function drawBackground(time){
      const bg=ctx.createRadialGradient(cw*.52,ch*.48,20,cw*.52,ch*.48,Math.max(cw,ch)*.72);bg.addColorStop(0,'rgba(26,35,42,.13)');bg.addColorStop(.48,'rgba(8,10,11,.06)');bg.addColorStop(1,'rgba(0,0,0,.42)');ctx.fillStyle=bg;ctx.fillRect(0,0,cw,ch);
      stars.forEach((s,i)=>{const tw=.58+.42*Math.sin(time*.0012+s.t);ctx.globalAlpha=s.a*tw;ctx.fillStyle=s.c;ctx.beginPath();ctx.arc((s.x*cw+camera.yaw*18*(i%3-1)+cw)%cw,(s.y*ch+camera.pitch*15*(i%4-1)+ch)%ch,s.r,0,Math.PI*2);ctx.fill()});ctx.globalAlpha=1
    }
    function project(time){
      camera.zoom+=(camera.targetZoom-camera.zoom)*.085;['x','y','z'].forEach(k=>camera.focus[k]+=(camera.targetFocus[k]-camera.focus[k])*.075);
      nodes.forEach(n=>{n.x+=(n.tx-n.x)*.045;n.y+=(n.ty-n.y)*.045;n.z+=(n.tz-n.z)*.045;const p=rotatePoint(n,time),f=720/(720+p.z),scale=f*camera.zoom;n.sx=cw*.5+p.x*scale;n.sy=ch*.5+p.y*scale;n.depth=p.z;n.sr=Math.max(.8,n.size*scale*ui.nodeScale);n.alpha=(!ui.showFragments&&n.type==='fragment')?0:(matches(n)?1:.055)})
    }
    function drawEdges(){
      if(!ui.showLinks)return;const selectedId=selected?.id;ctx.lineCap='round';edges.forEach(e=>{const a=nodeById(e.a),b=nodeById(e.b);if(a.alpha<=0||b.alpha<=0)return;const hot=selectedId!=null&&(e.a===selectedId||e.b===selectedId);const faint=(a.type==='fragment'||b.type==='fragment');ctx.globalAlpha=hot?.86:(faint?.035:.095)*Math.min(a.alpha,b.alpha);ctx.strokeStyle=hot?'#f7fbff':(e.kind==='trunk'?'#cce9f5':'#8aa6b8');ctx.lineWidth=hot?Math.min(3,1.1+camera.zoom):e.kind==='trunk'?1.25:.58;ctx.beginPath();ctx.moveTo(a.sx,a.sy);ctx.lineTo(b.sx,b.sy);ctx.stroke()});ctx.globalAlpha=1
    }
    function drawSphere(n,time){
      const r=n.sr,selectedNow=selected===n,hover=hovered===n;ctx.save();ctx.globalAlpha=n.alpha;
      if(n.type==='fragment'){
        const glow=ctx.createRadialGradient(n.sx,n.sy,0,n.sx,n.sy,r*3);glow.addColorStop(0,n.color);glow.addColorStop(.25,n.color+'b8');glow.addColorStop(1,'transparent');ctx.fillStyle=glow;ctx.beginPath();ctx.arc(n.sx,n.sy,r*3,0,Math.PI*2);ctx.fill();ctx.fillStyle='#eefbff';ctx.beginPath();ctx.arc(n.sx,n.sy,Math.max(.65,r*.46),0,Math.PI*2);ctx.fill();ctx.restore();return
      }
      const pulse=1+(selectedNow?Math.sin(time*.004)*.055:0),rr=r*pulse;ctx.shadowColor=selectedNow?'#ffffff':n.color;ctx.shadowBlur=selectedNow?30:hover?22:12;
      ctx.beginPath();ctx.arc(n.sx,n.sy,rr+3,0,Math.PI*2);ctx.fillStyle=n.color;ctx.globalAlpha=n.alpha*(selectedNow?1:.62);ctx.fill();ctx.globalAlpha=n.alpha;
      ctx.save();ctx.beginPath();ctx.arc(n.sx,n.sy,rr,0,Math.PI*2);ctx.clip();const img=getImage(n.videoId);if(img&&img.complete&&img.naturalWidth){const ratio=Math.max(rr*2/img.naturalWidth,rr*2/img.naturalHeight),w=img.naturalWidth*ratio,h=img.naturalHeight*ratio;ctx.drawImage(img,n.sx-w/2,n.sy-h/2,w,h)}else{const g=ctx.createLinearGradient(n.sx-rr,n.sy-rr,n.sx+rr,n.sy+rr);g.addColorStop(0,n.color);g.addColorStop(1,'#1b203c');ctx.fillStyle=g;ctx.fillRect(n.sx-rr,n.sy-rr,rr*2,rr*2)}
      const shade=ctx.createRadialGradient(n.sx-rr*.35,n.sy-rr*.42,rr*.05,n.sx,n.sy,rr*1.05);shade.addColorStop(0,'rgba(255,255,255,.5)');shade.addColorStop(.36,'rgba(255,255,255,0)');shade.addColorStop(.78,'rgba(0,0,0,.12)');shade.addColorStop(1,'rgba(0,0,0,.72)');ctx.fillStyle=shade;ctx.fillRect(n.sx-rr,n.sy-rr,rr*2,rr*2);ctx.restore();
      ctx.shadowBlur=0;ctx.strokeStyle=selectedNow?'#fff':n.color;ctx.lineWidth=selectedNow?2.3:1.15;ctx.beginPath();ctx.arc(n.sx,n.sy,rr+2,0,Math.PI*2);ctx.stroke();
      const shouldLabel=(n.type==='root'||n.type==='hub'||n.type==='video'&&(camera.zoom>.72||selectedNow||hover));if(shouldLabel&&n.alpha>.2){const fontSize=Math.max(8,Math.min(17,(n.type==='root'?14:n.type==='hub'?12:9)*camera.zoom));ctx.font=`${selectedNow?700:500} ${fontSize}px Arial`;ctx.textAlign='center';ctx.textBaseline='bottom';ctx.shadowColor='#000';ctx.shadowBlur=5;ctx.lineWidth=3;ctx.strokeStyle='rgba(0,0,0,.72)';ctx.strokeText(n.label,n.sx,n.sy-rr-7);ctx.fillStyle=selectedNow?'#fff7c4':'#f1e8aa';ctx.fillText(n.label,n.sx,n.sy-rr-7);ctx.shadowBlur=0}
      if(n.type==='root'){ctx.font=`${Math.max(14,rr*.72)}px Arial`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#fff';ctx.shadowColor='#ff73bc';ctx.shadowBlur=14;ctx.fillText('♥',n.sx,n.sy+1);ctx.shadowBlur=0}ctx.restore()
    }
    function frame(time){
      ctx.clearRect(0,0,cw,ch);drawBackground(time);if(camera.auto&&!ui.dragging)camera.yaw+=.00024;project(time);drawEdges();const ordered=nodes.filter(n=>n.alpha>0).sort((a,b)=>b.depth-a.depth);ordered.forEach(n=>drawSphere(n,time));requestAnimationFrame(frame)
    }
    function hitTest(x,y){let best=null,bestD=Infinity;nodes.forEach(n=>{if(n.alpha<.2||n.sr<2)return;const d=Math.hypot(x-n.sx,y-n.sy),limit=Math.max(8,n.sr+5);if(d<limit&&d<bestD){best=n;bestD=d}});return best}
    function selectNode(n,focus=true){
      if(!n)return;selected=n;document.getElementById('tabTitle').textContent=n.label;document.getElementById('crumbTitle').textContent=n.label;document.getElementById('noteTitle').textContent=n.label;document.getElementById('articleTitle').textContent=n.label;document.getElementById('propType').textContent=n.type==='video'?'video-moment':n.type==='fragment'?'emotion-fragment':n.type==='hub'?'person-lovetree':'memory-universe';document.getElementById('propDate').textContent=n.date||'2026.08.03';document.getElementById('description').textContent=n.description||'이 순간과 이어진 LoveTree 기억입니다.';document.getElementById('propTags').innerHTML=(n.tags||['lovetree']).map(t=>`<span class="chip">${t}</span>`).join('');
      const preview=document.getElementById('videoPreview');preview.classList.toggle('show',!!n.videoId);if(n.videoId)document.getElementById('previewImage').src=thumb(n.videoId);
      const related=edges.filter(e=>e.a===n.id||e.b===n.id).map(e=>nodeById(e.a===n.id?e.b:e.a)).filter((v,i,a)=>a.indexOf(v)===i).slice(0,9);document.getElementById('connections').innerHTML=related.length?related.map(r=>`<button class="connection" type="button" data-node="${r.id}">· ${r.label}</button>`).join(''):'<span style="font-size:11px;color:#777">아직 연결된 기억이 없어요.</span>';document.getElementById('noteScroll').scrollTop=0;
      if(focus&&n.type!=='fragment'){camera.targetFocus={x:n.x,y:n.y,z:n.z};camera.targetZoom=Math.max(camera.targetZoom,1.12)}
    }
    function openVideo(n=selected){if(!n?.videoId)return;document.getElementById('playerPerson').textContent=`${n.person} · LOVETREE VIDEO MOMENT`;document.getElementById('playerTitle').textContent=n.label;document.getElementById('playerFrame').innerHTML=`<iframe src="https://www.youtube.com/embed/${n.videoId}?autoplay=1&rel=0" title="${n.label}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;document.getElementById('player').classList.add('open')}
    function closeVideo(){document.getElementById('player').classList.remove('open');setTimeout(()=>document.getElementById('playerFrame').innerHTML='',260)}
    function localPoint(e){const r=canvas.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}}
    canvas.addEventListener('pointerdown',e=>{const p=localPoint(e);ui.dragging=true;ui.downX=ui.lastX=p.x;ui.downY=ui.lastY=p.y;ui.moved=0;canvas.classList.add('dragging');canvas.setPointerCapture(e.pointerId)});
    canvas.addEventListener('pointermove',e=>{const p=localPoint(e);if(ui.dragging){const dx=p.x-ui.lastX,dy=p.y-ui.lastY;camera.yaw+=dx*.006;camera.pitch=Math.max(-1.15,Math.min(1.15,camera.pitch+dy*.0048));ui.lastX=p.x;ui.lastY=p.y;ui.moved+=Math.abs(dx)+Math.abs(dy)}else{hovered=hitTest(p.x,p.y);canvas.style.cursor=hovered?'pointer':'grab'}});
    canvas.addEventListener('pointerup',e=>{const p=localPoint(e);if(ui.moved<7){const hit=hitTest(p.x,p.y);if(hit)selectNode(hit)}ui.dragging=false;canvas.classList.remove('dragging');try{canvas.releasePointerCapture(e.pointerId)}catch(_){}});
    canvas.addEventListener('pointercancel',()=>{ui.dragging=false;canvas.classList.remove('dragging')});
    canvas.addEventListener('dblclick',e=>{const p=localPoint(e),hit=hitTest(p.x,p.y);if(hit?.videoId){selectNode(hit,false);openVideo(hit)}});
    canvas.addEventListener('wheel',e=>{e.preventDefault();camera.targetZoom=Math.max(.32,Math.min(3.2,camera.targetZoom*Math.exp(-e.deltaY*.0011)))},{passive:false});
    document.getElementById('connections').addEventListener('click',e=>{const b=e.target.closest('[data-node]');if(b)selectNode(nodeById(Number(b.dataset.node)))});document.getElementById('previewPlay').addEventListener('click',()=>openVideo());
    const settings=document.getElementById('settings');document.getElementById('gear').addEventListener('click',()=>settings.classList.toggle('open'));document.getElementById('closeSettings').addEventListener('click',()=>settings.classList.remove('open'));
    function updateStats(){const visible=nodes.filter(n=>matches(n)&&!(!ui.showFragments&&n.type==='fragment')).length;document.getElementById('statsText').textContent=`${visible} notes, ${edges.length} links`}
    function toggleButton(button,key){button.addEventListener('click',()=>{const on=!button.classList.contains('on');button.classList.toggle('on',on);button.setAttribute('aria-pressed',on);ui[key]=on;if(key==='showFragments')updateStats()})}
    toggleButton(document.getElementById('tagsToggle'),'showFragments');toggleButton(document.getElementById('linksToggle'),'showLinks');document.getElementById('orbitToggle').addEventListener('click',e=>{const b=e.currentTarget,on=!b.classList.contains('on');b.classList.toggle('on',on);b.setAttribute('aria-pressed',on);camera.auto=on});
    document.getElementById('filterInput').addEventListener('input',e=>{ui.search=e.target.value.trim().toLowerCase();updateStats()});
    document.getElementById('layoutSelect').addEventListener('change',e=>{setTargets(e.target.value);camera.targetFocus={x:0,y:0,z:0};camera.targetZoom=e.target.value==='timeline'?.72:.9});document.getElementById('scaleRange').addEventListener('input',e=>{ui.nodeScale=Number(e.target.value);document.getElementById('scaleValue').textContent=`${ui.nodeScale.toFixed(1)}×`});
    document.getElementById('turnLeft').addEventListener('click',()=>camera.yaw-=.35);document.getElementById('turnRight').addEventListener('click',()=>camera.yaw+=.35);document.getElementById('resetView').addEventListener('click',()=>{camera.targetFocus={x:0,y:0,z:0};camera.targetZoom=.96;camera.yaw=-.28;camera.pitch=.08;selectNode(root,false)});
    document.getElementById('closePlayer').addEventListener('click',closeVideo);document.getElementById('player').addEventListener('click',e=>{if(e.target.id==='player')closeVideo()});document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(document.getElementById('player').classList.contains('open'))closeVideo();else settings.classList.remove('open')}});
    document.getElementById('mobileNote').addEventListener('click',()=>document.getElementById('inspector').classList.toggle('mobile-open'));window.addEventListener('resize',resize);resize();updateStats();selectNode(root,false);requestAnimationFrame(frame);
  