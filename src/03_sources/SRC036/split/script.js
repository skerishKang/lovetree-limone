
    const page=document.getElementById('page');
    const stage=document.getElementById('journeyStage');
    const frame=document.getElementById('journeyFrame');
    const warning=document.getElementById('warning');
    const state={loaded:false,entering:false,inside:false,timer:null};
    const encodedPath='04_%EB%94%94%EC%9E%90%EC%9D%B8-%EC%B1%84%ED%83%9D%EB%B3%B8/0.%EC%B2%AB%EC%97%AC%EC%A0%95%ED%86%B5%ED%95%A9-3%EA%B0%9Chtml%ED%95%A9%EB%B3%B8/lovetree-first-journey-unified-v1.html';
    const fileTarget='file:///D:/LoveTree-work/'+encodedPath;
    const hostedTarget=new URL('/'+encodedPath,location.origin).href;
    frame.src=location.protocol==='file:'?fileTarget:hostedTarget;

    function makePetals(){const host=document.getElementById('petalField');const colors=['#ef9bab','#f7c8cf','#9eb68b','#bde7e8','#fffdfa'];for(let i=0;i<88;i++){const p=document.createElement('i');p.className='petal';const angle=(i*137.5)*Math.PI/180;const radius=7+(i%12)*2.8;const x=50+Math.cos(angle)*radius;const y=49+Math.sin(angle)*radius*.63;const rush=590+(i%11)*76;p.style.setProperty('--left',`${x}%`);p.style.setProperty('--top',`${y}%`);p.style.setProperty('--w',`${4+(i%4)*1.8}px`);p.style.setProperty('--color',colors[i%colors.length]);p.style.setProperty('--alpha',`${.22+(i%6)*.1}`);p.style.setProperty('--rotate',`${(i*31)%180}deg`);p.style.setProperty('--duration',`${2.5+(i%8)*.4}s`);p.style.setProperty('--float-x',`${(i%5-2)*4}px`);p.style.setProperty('--float-y',`${(i%7-3)*3}px`);p.style.setProperty('--rush-x',`${(Math.cos(angle)*rush).toFixed(0)}px`);p.style.setProperty('--rush-y',`${(Math.sin(angle)*rush*.78).toFixed(0)}px`);p.style.setProperty('--rush-duration',`${1.65+(i%9)*.1}s`);p.style.setProperty('--delay',`${(i%15)*.035}s`);host.appendChild(p)}}
    function markLoaded(){state.loaded=true;stage.classList.add('loaded');document.getElementById('statusText').textContent='로그인 없이 첫 여정 연결됨';clearTimeout(state.timer)}
    function enter(){if(state.entering||state.inside)return;if(!state.loaded){warning.classList.add('show');return}state.entering=true;page.classList.add('entering');setTimeout(()=>page.classList.add('crossing'),1600);setTimeout(()=>{page.classList.add('inside');state.entering=false;state.inside=true;frame.tabIndex=0},3450)}
    function exit(){if(!state.inside&&!state.entering)return;state.inside=false;state.entering=false;page.classList.remove('inside','crossing','entering');frame.tabIndex=-1;document.querySelectorAll('.petal').forEach(p=>{p.style.animation='none';void p.offsetWidth;p.style.animation=''})}
    frame.addEventListener('load',markLoaded);state.timer=setTimeout(()=>{if(!state.loaded)warning.classList.add('show')},4800);
    document.getElementById('enterButton').addEventListener('click',enter);document.getElementById('returnButton').addEventListener('click',exit);warning.addEventListener('click',()=>warning.classList.remove('show'));
    document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(warning.classList.contains('show'))warning.classList.remove('show');else exit()}if(e.key==='Enter'&&!state.inside&&!state.entering)enter()});
    window.addEventListener('pointermove',e=>{if(state.entering||state.inside)return;page.style.setProperty('--mx',(e.clientX/innerWidth-.5).toFixed(3));page.style.setProperty('--my',(e.clientY/innerHeight-.5).toFixed(3))},{passive:true});
    makePetals();
  