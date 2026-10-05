
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const ROOT=process.env.CDX006_ROOT;
const OUT=process.env.CDX006_OUT;
fs.rmSync(OUT,{recursive:true,force:true}); fs.mkdirSync(OUT,{recursive:true});
const mime={'.html':'text/html; charset=utf-8','.md':'text/markdown; charset=utf-8','.png':'image/png','.json':'application/json','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8'};
const server=http.createServer((req,res)=>{try{
 let rel=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname).replace(/^\/+/,''); if(!rel) rel='최종본.html';
 const target=path.resolve(ROOT,rel.replace(/\//g,path.sep));
 if(!target.toLowerCase().startsWith(path.resolve(ROOT).toLowerCase())){res.writeHead(403);res.end('forbidden');return;}
 if(!fs.existsSync(target)||fs.statSync(target).isDirectory()){res.writeHead(404);res.end('not found');return;}
 const ext=path.extname(target).toLowerCase(); const cacheControl=ext==='.png'?'public, max-age=31536000, immutable':'no-store';
 res.writeHead(200,{'Content-Type':mime[ext]||'application/octet-stream','Cache-Control':cacheControl}); fs.createReadStream(target).pipe(res);
}catch(e){res.writeHead(500);res.end(String(e));}});
const contexts=[{id:'D1',width:1440,height:900,reduced:false},{id:'T1',width:900,height:900,reduced:false},{id:'M1',width:390,height:844,reduced:false},{id:'R1',width:1440,height:900,reduced:true}];
const surfaces={HUB:'개발과정/index.html',P01:'개발과정/01-memory-capsule.html',P02:'개발과정/02-memory-stack.html',P03:'개발과정/03-tree-keeper.html'};
const results={metadata:{root:ROOT,out:OUT,started:new Date().toISOString()},launcher:null,assetSweep:null,sourceFacts:{},errors:{page:[],console:[],requestFailed:[],http:[]},screenshots:0,actions:[]};
const sha256=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
for(const f of ['최종본.html','개발과정/index.html','개발과정/01-memory-capsule.html','개발과정/02-memory-stack.html','개발과정/03-tree-keeper.html']){
 const p=path.join.apply(path,[ROOT].concat(f.split('/'))),s=fs.readFileSync(p,'utf8');
 results.sourceFacts[f]={bytes:fs.statSync(p).size,sha256:sha256(p),prefersReducedMotionOccurrences:(s.match(/prefers-reduced-motion/gi)||[]).length,mathRandomOccurrences:(s.match(/Math\.random\s*\(/g)||[]).length,requestAnimationFrameOccurrences:(s.match(/requestAnimationFrame\s*\(/g)||[]).length,setIntervalOccurrences:(s.match(/setInterval\s*\(/g)||[]).length};
}
function safeName(s){return s.replace(/[^a-zA-Z0-9_-]+/g,'_').slice(0,90)}
async function instrument(page,ctxId,surface){
 const err={page:[],console:[],requestFailed:[],http:[]};
 page.on('pageerror',e=>err.page.push(String(e)));
 page.on('console',m=>{if(m.type()==='error')err.console.push(m.text())});
 page.on('requestfailed',r=>err.requestFailed.push({url:r.url(),failure:(r.failure()&&r.failure().errorText)||''}));
 page.on('response',r=>{if(r.status()>=400)err.http.push({url:r.url(),status:r.status()})});
 page.__errs=err; page.__ctxId=ctxId; page.__surface=surface;
}
async function observe(page,ctxId,surface,state,extra){
 extra=extra||{}; await page.waitForTimeout(120);
 const snap=await page.evaluate(()=>{
  const rect=sel=>{const el=document.querySelector(sel);if(!el)return null;const r=el.getBoundingClientRect(),cs=getComputedStyle(el);return{x:+r.x.toFixed(2),y:+r.y.toFixed(2),w:+r.width.toFixed(2),h:+r.height.toFixed(2),display:cs.display,visibility:cs.visibility,opacity:cs.opacity,overflow:cs.overflow}};
  const visible=sel=>{const e=document.querySelector(sel);if(!e)return null;const r=e.getBoundingClientRect(),c=getComputedStyle(e);return c.display!=='none'&&c.visibility!=='hidden'&&+c.opacity!==0&&r.width>0&&r.height>0};
  const animations=document.getAnimations().map(a=>{const t=a.effect&&a.effect.getTiming?a.effect.getTiming():{};const el=a.effect&&a.effect.target;return{type:(a.constructor&&a.constructor.name)||'Animation',target:el?(el.id||el.className||el.tagName||'unknown'):'unknown',name:a.animationName||null,playState:a.playState,currentTime:typeof a.currentTime==='number'?Math.round(a.currentTime):null,duration:t.duration??null,delay:t.delay??null,iterations:t.iterations??null}});
  const imgs=[...document.images].map(i=>({src:i.getAttribute('src'),complete:i.complete,naturalWidth:i.naturalWidth,naturalHeight:i.naturalHeight}));
  return{url:location.pathname,title:document.title,reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches,viewport:{w:innerWidth,h:innerHeight,dpr:devicePixelRatio},
   body:{scrollWidth:document.body.scrollWidth,scrollHeight:document.body.scrollHeight,clientWidth:document.documentElement.clientWidth,clientHeight:document.documentElement.clientHeight},
   geometry:{header:rect('header'),stage:rect('#stage'),left:rect('.left'),right:rect('.right'),world:rect('#world'),cards:rect('.cards')},
   controlVisibility:{indexButton:visible('button[onclick*="index.html"]'),autoBtn:visible('#autoBtn'),saveBtn:visible('#saveBtn'),openBtn:visible('#openBtn'),slider:visible('#explode'),play:visible('#play'),skip:visible('#skip'),autoplay:visible('#autoplay'),file:visible('#file')},
   state:{angleText:(document.querySelector('#angleText')&&document.querySelector('#angleText').textContent)||null,figureSrc:(document.querySelector('#figure')&&document.querySelector('#figure').getAttribute('src'))||null,drawerOpen:document.querySelector('#drawer')?document.querySelector('#drawer').classList.contains('open'):null,tags:[...document.querySelectorAll('#tags .tag')].map(e=>({text:e.textContent.trim(),on:e.classList.contains('on')})),explode:(document.querySelector('#explode')&&document.querySelector('#explode').value)||null,rootExplode:getComputedStyle(document.documentElement).getPropertyValue('--explode').trim()||null,rootRx:getComputedStyle(document.documentElement).getPropertyValue('--rx').trim()||null,rootRy:getComputedStyle(document.documentElement).getPropertyValue('--ry').trim()||null,status:(document.querySelector('#status')&&document.querySelector('#status').textContent)||null,inspectTitle:(document.querySelector('#inspectTitle')&&document.querySelector('#inspectTitle').textContent)||null,progress:(document.querySelector('#progress')&&document.querySelector('#progress').style.width)||null,scene:document.querySelector('#world')?document.querySelector('#world').dataset.scene:null,step:(document.querySelector('#step')&&document.querySelector('#step').textContent)||null,fileName:(document.querySelector('#fileName')&&document.querySelector('#fileName').textContent)||null,buildFigureSrc:(document.querySelector('#buildFigure')&&document.querySelector('#buildFigure').getAttribute('src'))||null,activeThumbs:[...document.querySelectorAll('.thumb.active')].map(e=>e.textContent.trim().slice(0,80)),activeNodes:[...document.querySelectorAll('.node.active')].map(e=>e.textContent.trim()),burstScalars:[...document.querySelectorAll('#burst .petal')].map(e=>({left:e.style.left,top:e.style.top,dx:e.style.getPropertyValue('--dx'),dy:e.style.getPropertyValue('--dy'),delay:e.style.animationDelay})),particleScalars:[...document.querySelectorAll('#particles .particle')].map(e=>({x:e.style.getPropertyValue('--x'),t:e.style.getPropertyValue('--t'),drift:e.style.getPropertyValue('--drift'),delay:e.style.animationDelay}))},
   semantic:{cards:[...document.querySelectorAll('a.card')].map(a=>a.getAttribute('href')),figuresButtons:[...document.querySelectorAll('#figures button')].map(b=>b.textContent.trim()),swatchCount:document.querySelectorAll('#swatches button, #swatches .swatch').length,layerCount:document.querySelectorAll('.layer').length,legendCount:document.querySelectorAll('#legend > *').length,legendText:(document.querySelector('#legend')&&document.querySelector('#legend').innerText)||null,sceneNodeCount:document.querySelectorAll('.node').length},
   animations:animations,images:{count:imgs.length,broken:imgs.filter(x=>x.complete&&x.naturalWidth===0),current:imgs}};
 });
 const shot=path.join(OUT,ctxId+'_'+surface+'_'+safeName(state)+'.png'); await page.screenshot({path:shot,fullPage:false}); results.screenshots++;
 const rec={ctx:ctxId,surface:surface,state:state,snapshot:snap,errors:JSON.parse(JSON.stringify(page.__errs)),extra:extra,shot:shot}; results.actions.push(rec); return rec;
}
// P01 mutates figure.src from requestAnimationFrame, so networkidle is not a valid completion signal.
// Use the document load event; the action/state plan remains unchanged and observe() adds the same settle delay.
async function gotoSurface(page,surface){await page.goto('http://127.0.0.1:41731/'+surfaces[surface],{waitUntil:'load',timeout:15000})}
async function fresh(browser,cfg,surface){const context=await browser.newContext({viewport:{width:cfg.width,height:cfg.height},deviceScaleFactor:1});const page=await context.newPage();if(cfg.reduced)await page.emulateMedia({reducedMotion:'reduce'});await instrument(page,cfg.id,surface);await gotoSurface(page,surface);return{context:context,page:page}}
function mergeErr(rec){for(const k of ['page','console','requestFailed','http'])for(const x of rec.errors[k])results.errors[k].push(Object.assign({ctx:rec.ctx,surface:rec.surface,state:rec.state},typeof x==='string'?{message:x}:x))}
async function cap(){const r=await observe.apply(null,[...arguments]);mergeErr(r);return r}
async function testLauncher(browser){const c=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1}),p=await c.newPage();await instrument(p,'D1','ROOT');await p.goto('http://127.0.0.1:41731/',{waitUntil:'networkidle',timeout:15000});results.launcher={finalPath:new URL(p.url()).pathname,errors:p.__errs};await c.close()}
async function assetSweep(browser){
 const c=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1}),p=await c.newPage();await gotoSurface(p,'HUB');
 const figs=fs.readdirSync(path.join(ROOT,'개발과정','assets','figures')).filter(x=>x.endsWith('.png')).sort();
 const keeps=fs.readdirSync(path.join(ROOT,'개발과정','assets','keeper')).filter(x=>x.endsWith('.png')).sort();
 const runtime=figs.map(x=>'assets/figures/'+x).concat(keeps.filter(x=>/^\d\d-/.test(x)).map(x=>'assets/keeper/'+x)); const ref=keeps.filter(x=>!/^\d\d-/.test(x)).map(x=>'assets/keeper/'+x);
 const sweep=await p.evaluate(async paths=>{const one=src=>new Promise(resolve=>{const i=new Image();i.onload=()=>resolve({src:src,ok:true,w:i.naturalWidth,h:i.naturalHeight});i.onerror=()=>resolve({src:src,ok:false});i.src=src});return await Promise.all(paths.map(one))},runtime);
 results.assetSweep={figures:figs.length,keeperTotal:keeps.length,runtimeExpected:runtime.length,referenceOnly:ref,runtimeLoaded:sweep.filter(x=>x.ok).length,failures:sweep.filter(x=>!x.ok),dimensions:sweep};await c.close();
}
async function hubD1(browser,cfg){
 let x=await fresh(browser,cfg,'HUB'),c=x.context,p=x.page;await cap(p,cfg.id,'HUB','initial');await c.close();
 for(const t of ['01-memory-capsule.html','02-memory-stack.html','03-tree-keeper.html']){x=await fresh(browser,cfg,'HUB');c=x.context;p=x.page;await Promise.all([p.waitForURL(u=>u.pathname.endsWith('/'+t),{timeout:5000}),p.click('a[href="'+t+'"]')]);await cap(p,cfg.id,'HUB','navigate_'+t,{edge:'HUB->'+t});await c.close()}
}
async function p01D1(browser,cfg){
 let x=await fresh(browser,cfg,'P01'),c=x.context,p=x.page;await cap(p,cfg.id,'P01','initial');const a0=await p.locator('#angleText').textContent();await p.waitForTimeout(1200);const a1=await p.locator('#angleText').textContent();await cap(p,cfg.id,'P01','auto_orbit',{angleBefore:a0,angleAfter:a1});await p.click('#autoBtn');
 const b=await p.locator('#stage').boundingBox();if(b){await p.mouse.move(b.x+b.width*.35,b.y+b.height*.5);await p.mouse.down();await p.mouse.move(b.x+b.width*.7,b.y+b.height*.5,{steps:8});await p.mouse.up()}await cap(p,cfg.id,'P01','manual_drag_angle');if(b){await p.mouse.move(b.x+b.width*.5,b.y+b.height*.5);await p.mouse.wheel(0,560)}await cap(p,cfg.id,'P01','wheel_rotation');
 const fb=p.locator('#figures button');if(await fb.count()>1)await fb.nth((await fb.count())-1).click();await cap(p,cfg.id,'P01','figure_selection');const sw=p.locator('#swatches button, #swatches .swatch');if(await sw.count()>1)await sw.nth(1).click();await cap(p,cfg.id,'P01','aura_selection');
 await p.locator('#tags .tag').first().click();await cap(p,cfg.id,'P01','sticker_tag_toggle');await p.click('#saveBtn');await cap(p,cfg.id,'P01','save_interaction',{burstChildren:await p.locator('#burst > *').count()});await p.click('#openBtn');await cap(p,cfg.id,'P01','drawer_open');await p.click('#closeDrawer');await cap(p,cfg.id,'P01','drawer_close');await c.close();
 x=await fresh(browser,cfg,'P01');c=x.context;p=x.page;await Promise.all([p.waitForURL(u=>decodeURIComponent(u.pathname).endsWith('/개발과정/index.html'),{timeout:5000}),p.getByRole('button',{name:'EXPERIENCE INDEX'}).click()]);await cap(p,cfg.id,'P01','return_hub',{edge:'P01->HUB'});await c.close();
}
async function p02D1(browser,cfg){
 let x=await fresh(browser,cfg,'P02'),c=x.context,p=x.page;await cap(p,cfg.id,'P02','initial');await p.locator('#explode').evaluate(e=>{e.value='82';e.dispatchEvent(new Event('input',{bubbles:true}))});await cap(p,cfg.id,'P02','slider');await p.click('#assemble');await cap(p,cfg.id,'P02','assemble');await p.click('#explodeBtn');await cap(p,cfg.id,'P02','explode');
 const layers=p.locator('.layer');if(await layers.count())await layers.last().locator('.big').click();await cap(p,cfg.id,'P02','selected_layer');const legends=p.locator('#legend > *');if(await legends.count()>4)await legends.nth(4).click();await cap(p,cfg.id,'P02','legend_selection');const b=await p.locator('#stage').boundingBox();if(b){await p.mouse.move(b.x+b.width*.4,b.y+b.height*.45);await p.mouse.down();await p.mouse.move(b.x+b.width*.68,b.y+b.height*.63,{steps:8});await p.mouse.up()}await cap(p,cfg.id,'P02','drag_rotation');if(b){await p.mouse.move(b.x+b.width*.5,b.y+b.height*.5);await p.mouse.wheel(0,-480)}await cap(p,cfg.id,'P02','wheel_explode');
 const sem=[];for(let i=0;i<Math.min(7,await legends.count());i++){await legends.nth(i).click();sem.push({i:i,title:await p.locator('#inspectTitle').textContent(),num:await p.locator('#inspectNum').textContent()})}await cap(p,cfg.id,'P02','seven_layer_semantics',{semanticLayers:sem});await p.click('#play');await p.waitForTimeout(1100);await cap(p,cfg.id,'P02','story_play');await p.click('#play');await p.locator('#explode').evaluate(e=>{e.value='37';e.dispatchEvent(new Event('input',{bubbles:true}))});await cap(p,cfg.id,'P02','story_pause_manual_takeover');await p.click('#play');await p.waitForTimeout(6500);await cap(p,cfg.id,'P02','story_completion');await p.click('#play');await p.waitForTimeout(250);await cap(p,cfg.id,'P02','story_replay');await c.close();
 x=await fresh(browser,cfg,'P02');c=x.context;p=x.page;await Promise.all([p.waitForURL(u=>decodeURIComponent(u.pathname).endsWith('/개발과정/index.html'),{timeout:5000}),p.getByRole('button',{name:'EXPERIENCE INDEX'}).click()]);await cap(p,cfg.id,'P02','return_hub',{edge:'P02->HUB'});await c.close();
}
async function p03D1(browser,cfg){
 let x=await fresh(browser,cfg,'P03'),c=x.context,p=x.page;await cap(p,cfg.id,'P03','scene_01');await p.click('#next');await cap(p,cfg.id,'P03','scene_02');await p.locator('#file').setInputFiles({name:'synthetic-memory.jpg',mimeType:'image/jpeg',buffer:Buffer.from('synthetic-memory')});await p.waitForTimeout(500);await cap(p,cfg.id,'P03','synthetic_upload');
 let sn=Number(await p.locator('#world').getAttribute('data-scene'));while(sn<2){await p.click('#next');sn=Number(await p.locator('#world').getAttribute('data-scene'))}await cap(p,cfg.id,'P03','scene_03');await p.click('#next');await cap(p,cfg.id,'P03','scene_04');const th=p.locator('.thumb');if(await th.count()>1)await th.nth(1).click();await cap(p,cfg.id,'P03','look_selection');await p.click('#next');await p.waitForTimeout(800);await cap(p,cfg.id,'P03','scene_05_8angle_build');await p.click('#next');await cap(p,cfg.id,'P03','scene_06_bloom');await p.keyboard.press('ArrowLeft');await cap(p,cfg.id,'P03','keyboard_navigation');
 const wb=await p.locator('#world').boundingBox();if(wb){await p.mouse.move(wb.x+wb.width*.5,wb.y+wb.height*.5);await p.mouse.wheel(0,700);await p.waitForTimeout(750)}await cap(p,cfg.id,'P03','wheel_navigation');await p.locator('#autoplay').check();await p.waitForTimeout(4300);await p.locator('#autoplay').uncheck();await cap(p,cfg.id,'P03','autoplay');await c.close();
 x=await fresh(browser,cfg,'P03');c=x.context;p=x.page;await p.click('#skip');await cap(p,cfg.id,'P03','skip_to_bloom');await c.close();
 x=await fresh(browser,cfg,'P03');c=x.context;p=x.page;await Promise.all([p.waitForURL(u=>decodeURIComponent(u.pathname).endsWith('/개발과정/index.html'),{timeout:5000}),p.getByRole('button',{name:'EXPERIENCE INDEX'}).click()]);await cap(p,cfg.id,'P03','return_hub',{edge:'P03->HUB'});await c.close();
 x=await fresh(browser,cfg,'P03');c=x.context;p=x.page;await p.click('#skip');await Promise.all([p.waitForURL(u=>decodeURIComponent(u.pathname).endsWith('/개발과정/01-memory-capsule.html'),{timeout:5000}),p.click('#primary')]);await cap(p,cfg.id,'P03','final_transition_to_p01',{edge:'P03_FINAL->P01'});await c.close();
}
async function representative(browser,cfg,s){
 const x=await fresh(browser,cfg,s),c=x.context,p=x.page;await cap(p,cfg.id,s,'initial');
 if(s==='P01'){const before=await p.locator('#angleText').textContent();await p.waitForTimeout(cfg.reduced?1300:500);const after=await p.locator('#angleText').textContent();await cap(p,cfg.id,s,'auto_orbit_probe',{before:before,after:after})}
 else if(s==='P02'){await p.locator('#explode').evaluate(e=>{e.value='74';e.dispatchEvent(new Event('input',{bubbles:true}))});await cap(p,cfg.id,s,'slider_probe')}
 else if(s==='P03'){await p.keyboard.press('ArrowRight');await cap(p,cfg.id,s,'keyboard_probe')}
 await c.close();
}
(async()=>{
 await new Promise(r=>server.listen(41731,'127.0.0.1',r));const browser=await chromium.launch({headless:true});
 try{await testLauncher(browser);await assetSweep(browser);const d1=contexts[0];await hubD1(browser,d1);await p01D1(browser,d1);await p02D1(browser,d1);await p03D1(browser,d1);for(const cfg of contexts.slice(1))for(const s of ['HUB','P01','P02','P03'])await representative(browser,cfg,s);
  for(const k of Object.keys(results.errors)){const seen=new Set();results.errors[k]=results.errors[k].filter(x=>{const q=JSON.stringify(x);if(seen.has(q))return false;seen.add(q);return true})}
  results.metadata.finished=new Date().toISOString();results.metadata.totalActions=results.actions.length;fs.writeFileSync(path.join(OUT,'s2-baseline.json'),JSON.stringify(results,null,2));
  console.log('S4_REPLAY_RESULT='+path.join(OUT,'s2-baseline.json'));console.log('ACTIONS='+results.actions.length+' SCREENSHOTS='+results.screenshots);console.log('LAUNCHER='+JSON.stringify(results.launcher));console.log('ASSET_SWEEP='+JSON.stringify({runtimeExpected:results.assetSweep.runtimeExpected,runtimeLoaded:results.assetSweep.runtimeLoaded,failures:results.assetSweep.failures.length,referenceOnly:results.assetSweep.referenceOnly}));console.log('ERRORS='+JSON.stringify(Object.fromEntries(Object.entries(results.errors).map(([k,v])=>[k,v.length]))));
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);process.exitCode=1;server.close()});
