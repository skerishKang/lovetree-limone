import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const BASE = process.env.TRACK01_QA_URL || "http://127.0.0.1:3000";
const SOURCE = path.resolve("reference/source-tracks-snapshot/01_0730작업물/lovetree-community-discovery-v2.html");
const HASH = "661d21d4e85711603f7e8fe3966d3fd5ccc29c920fd6479850c2f99040e39f59";
const OUT = path.resolve("qa-artifacts/track01-community-visual-fidelity");
fs.mkdirSync(OUT,{recursive:true});
const ids=["nqofkzQD19E","5dsm6m44cL4","LlQEKB2H7z4","bcUfIpQ6aeA"];
const trees=[
 {id:"qa-violet",title:"함께 쌓인 보랏빛 순간",memo:"서로의 응원과 위로가 오래 쌓여 하나의 길이 된 공개 러브트리입니다.",artist:"별빛정원",visibility:"public",likeCount:2814,viewCount:9482,createdAt:"2026-07-29T00:00:00.000Z"},
 {id:"qa-red",title:"레드와 별빛 사이",memo:"무대의 붉은 조명과 심장이 먼저 알아본 순간들을 이어 만든 기록입니다.",artist:"오늘의기록",visibility:"public",likeCount:3160,viewCount:10544,createdAt:"2026-07-30T00:00:00.000Z"},
 {id:"qa-season",title:"우리가 사랑하는 새로운 계절",memo:"따뜻한 바람만 불어도 다시 떠오르는 장면과 노래를 이어 담았습니다.",groupName:"봄의정원",visibility:"public",likeCount:2420,viewCount:7188,createdAt:"2026-07-27T00:00:00.000Z"}
];
const memories=Object.fromEntries(trees.map((t,ti)=>[t.id,Array.from({length:4},(_,i)=>({id:`${t.id}-m${i+1}`,treeId:t.id,parentId:i?`${t.id}-m${i}`:null,connectionReason:i?"다시 이어진 이유":null,title:["처음 마음이 멈춘 장면","다시 찾아본 순간","오래 남은 한 문장","무대 밖의 이야기"][i],memo:"공개된 순간의 기록입니다.",sourceType:"youtube",sourceUrl:`https://www.youtube.com/watch?v=${ids[(ti+i)%ids.length]}`,thumbnail:`https://img.youtube.com/vi/${ids[(ti+i)%ids.length]}/hqdefault.jpg`,emotionTags:["설렘","추억"],visibility:"public",timestamp:`2026-07-${20+ti+i}T12:00:00.000Z`}))]));
const checks=[];
const geometry={};
function check(name,pass,detail){checks.push({name,pass,detail});}
function svg(seed){const h=[...seed].reduce((a,c)=>a+c.charCodeAt(0),0)%360;return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="hsl(${h} 30% 64%)"/></svg>`;}
async function network(ctx){
 await ctx.route("https://fonts.googleapis.com/**",r=>r.fulfill({status:200,contentType:"text/css; charset=utf-8",body:"/* deterministic font fallback */"}));
 await ctx.route("https://fonts.gstatic.com/**",r=>r.fulfill({status:200,contentType:"application/octet-stream",body:""}));
 await ctx.route("https://img.youtube.com/**",r=>r.fulfill({status:200,contentType:"image/svg+xml",body:svg(r.request().url())}));
 await ctx.route("**/api/community/trees**",r=>r.fulfill({status:200,contentType:"application/json",body:JSON.stringify(trees)}));
 await ctx.route("**/api/community/memories**",r=>{const u=new URL(r.request().url());return r.fulfill({status:200,contentType:"application/json",body:JSON.stringify(memories[u.searchParams.get("treeId")]||[])});});
}
function errors(page){const pageErrors=[],consoleErrors=[];page.on("pageerror",e=>pageErrors.push(e.message));page.on("console",m=>{if(m.type()==="error")consoleErrors.push(m.text())});return {pageErrors,consoleErrors};}
async function open(browser,kind,viewport,reducedMotion="no-preference"){
 const ctx=await browser.newContext({viewport,hasTouch:viewport.width<=390,isMobile:viewport.width<=390,reducedMotion});await network(ctx);
 if(kind==="source")await ctx.route("http://track01-source.local/",r=>r.fulfill({status:200,contentType:"text/html; charset=utf-8",body:fs.readFileSync(SOURCE,"utf8")}));
 const page=await ctx.newPage(),err=errors(page);
 await page.goto(kind==="source"?"http://track01-source.local/":`${BASE}/v4/community`,{waitUntil:kind==="source"?"domcontentloaded":"networkidle",timeout:30000});
 await page.locator(kind==="source"?"#grid .tree-card":"[data-track01-tree-card]").first().waitFor({state:"visible",timeout:10000});
 return {ctx,page,...err};
}
function rect(r){return {x:r.x,y:r.y,width:r.width,height:r.height,top:r.top,bottom:r.bottom};}
async function measure(page,kind){return page.evaluate(kind=>{
 const S=kind==="source"?{title:"h1",parent:".intro",main:".main",search:".search",controls:".controls",grid:".grid",preview:".preview"}:{title:".track01-intro h1",parent:".track01-intro",main:".track01-main",search:".track01-search",controls:".track01-controls",grid:".track01-grid",preview:".track01-preview-wrap"};
 const el=q=>document.querySelector(q),R=q=>{const r=el(q)?.getBoundingClientRect();return r?{x:r.x,y:r.y,width:r.width,height:r.height,top:r.top,bottom:r.bottom}:null};
 const h=el(S.title),p=el(S.parent),m=el(S.main),st=getComputedStyle(h),ps=getComputedStyle(p),ms=getComputedStyle(m),lh=parseFloat(st.lineHeight);
 return {title:R(S.title),parent:R(S.parent),main:R(S.main),search:R(S.search),controls:R(S.controls),grid:R(S.grid),preview:R(S.preview),estimatedLines:Math.round(h.getBoundingClientRect().height/lh),fontFamily:st.fontFamily,fontSize:st.fontSize,fontWeight:st.fontWeight,letterSpacing:st.letterSpacing,lineHeight:st.lineHeight,wordBreak:st.wordBreak,overflowWrap:st.overflowWrap,whiteSpace:st.whiteSpace,maxWidth:st.maxWidth,parentPadding:ps.padding,mainDisplay:ms.display,gridTemplateColumns:ms.gridTemplateColumns,gap:ms.gap,fontsStatus:document.fonts.status};
 },kind);}
async function shot(page,name){const p=path.join(OUT,name);await page.screenshot({path:p,fullPage:false,animations:"disabled"});return p;}
async function pair(browser,a,b,name,w,h){const ctx=await browser.newContext({viewport:{width:w*2,height:h+42}}),p=await ctx.newPage();const A=fs.readFileSync(a).toString("base64"),B=fs.readFileSync(b).toString("base64");await p.setContent(`<style>*{box-sizing:border-box}body{margin:0;background:#211d1c;color:#fff;font:700 12px Arial}.l{height:42px;display:grid;grid-template-columns:1fr 1fr;place-items:center}.p{display:flex}.p img{width:${w}px;height:${h}px;object-fit:cover}</style><div class=l><span>SOURCE</span><span>NATIVE</span></div><div class=p><img src="data:image/png;base64,${A}"><img src="data:image/png;base64,${B}"></div>`);await p.screenshot({path:path.join(OUT,name)});await ctx.close();}
function record(label,s){check(`${label} page errors = 0`,s.pageErrors.length===0,s.pageErrors);check(`${label} console errors = 0`,s.consoleErrors.length===0,s.consoleErrors);}
async function initial(browser,w,h){const v={width:w,height:h},s=await open(browser,"source",v),n=await open(browser,"native",v);geometry[`${w}x${h}`]={source:await measure(s.page,"source"),native:await measure(n.page,"native")};const so=await s.page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth),no=await n.page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);check(`${w} source overflow = 0`,so===0,so);check(`${w} native overflow = 0`,no===0,no);record(`source ${w}x${h}`,s);record(`native ${w}x${h}`,n);const sp=await shot(s.page,`source-${w}x${h}-final.png`),np=await shot(n.page,`native-${w}x${h}-final.png`);await pair(browser,sp,np,`compare-${w}x${h}-final.png`,w,h);await s.ctx.close();await n.ctx.close();}
async function states(browser,w,h){const v={width:w,height:h},s=await open(browser,"source",v),n=await open(browser,"native",v);const touch=w<=390;const act=touch?"tap":"click";await s.page.locator('[data-tree="red"]')[act]();await n.page.locator('[data-track01-tree-card][data-tree-id="qa-red"]')[act]();const ss=await shot(s.page,`source-${w}x${h}-selected-final.png`),ns=await shot(n.page,`native-${w}x${h}-selected-final.png`);await pair(browser,ss,ns,`compare-${w}x${h}-selected-final.png`,w,h);await s.page.locator("#open")[act]();await s.page.locator("#overlay.opened").waitFor({state:"visible"});await n.page.locator("[data-track01-open]")[act]();await n.page.locator("[data-track01-full-tree]").waitFor({state:"visible"});if(touch){await s.page.locator(".node").nth(1).tap();await n.page.locator("[data-track01-moment-node]").nth(1).tap();check("390 touch candidate selection",true);check("390 touch full-tree navigation",true);}const sf=await shot(s.page,`source-${w}x${h}-full-tree-final.png`),nf=await shot(n.page,`native-${w}x${h}-full-tree-final.png`);await pair(browser,sf,nf,`compare-${w}x${h}-full-tree-final.png`,w,h);record(`source ${w} states`,s);record(`native ${w} states`,n);await s.ctx.close();await n.ctx.close();}
async function reduced(browser){const v={width:390,height:844},s=await open(browser,"source",v,"reduce"),n=await open(browser,"native",v,"reduce");const sp=await shot(s.page,"source-390x844-reduced-final.png"),np=await shot(n.page,"native-390x844-reduced-final.png");await pair(browser,sp,np,"compare-390x844-reduced-final.png",390,844);const dur=await n.page.locator("[data-track01-preview]").evaluate(e=>getComputedStyle(e).transitionDuration);check("reduced motion transition = 0s",dur.split(",").every(x=>x.trim()==="0s"),dur);await s.page.locator("#open").tap();await s.page.locator("#overlay.opened").waitFor({state:"visible"});await n.page.locator("[data-track01-open]").tap();await n.page.locator("[data-track01-full-tree]").waitFor({state:"visible"});const sf=await shot(s.page,"source-390x844-full-tree-reduced-final.png"),nf=await shot(n.page,"native-390x844-full-tree-reduced-final.png");await pair(browser,sf,nf,"compare-390x844-full-tree-reduced-final.png",390,844);record("source reduced",s);record("native reduced",n);await s.ctx.close();await n.ctx.close();}
const sourceHash=crypto.createHash("sha256").update(fs.readFileSync(SOURCE)).digest("hex");check("source SHA256 pinned",sourceHash===HASH,sourceHash);
const browser=await chromium.launch();
for(const [w,h] of [[1280,800],[390,844],[320,720]])await initial(browser,w,h);
await states(browser,1280,800);await states(browser,390,844);await reduced(browser);await browser.close();
for(const [vp,g] of Object.entries(geometry)){check(`${vp} source headline = 2 lines`,g.source.estimatedLines===2,g.source.estimatedLines);check(`${vp} native headline = 2 lines`,g.native.estimatedLines===2,g.native.estimatedLines);}
const failures=checks.filter(x=>!x.pass);const out={sourceSha256:sourceHash,expectedSha256:HASH,nativeRoute:"/v4/community",geometry,checks,summary:{checks:checks.length,failures:failures.length}};fs.writeFileSync(path.join(OUT,"precentral-final-gate.json"),JSON.stringify(out,null,2));for(const c of checks)console.log(`${c.pass?"PASS":"FAIL"} ${c.name}`,c.detail??"");console.log("TITLE_GEOMETRY",JSON.stringify(geometry));if(failures.length)process.exit(1);
