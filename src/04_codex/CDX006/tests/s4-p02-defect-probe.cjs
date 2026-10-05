const { chromium } = require('playwright');
const fs=require('fs'), path=require('path'), http=require('http');
/* ROUND6I-style parameterization: the probe previously hardcoded an absolute path that only
 * existed on the authoring machine. It now takes the capsule root and output path from the
 * environment, exactly like s4-suite-replay.cjs, so it runs on any checkout. No probe logic,
 * selector, timeout or assertion is changed - only where the paths come from. */
const ROOT=process.env.CDX006_ROOT||path.resolve(__dirname,'..');
const OUT=process.env.CDX006_OUT||path.resolve(__dirname,'..','evidence','s4','p02-defect-probe.json');
fs.mkdirSync(path.dirname(OUT),{recursive:true});
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png'};
const server=http.createServer((req,res)=>{try{
 const rel=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname).replace(/^\/+/,'');
 const f=path.resolve(ROOT,rel.replace(/\//g,path.sep));
 if(!f.toLowerCase().startsWith(path.resolve(ROOT).toLowerCase())){res.writeHead(403).end();return}
 if(!fs.existsSync(f)||!fs.statSync(f).isFile()){res.writeHead(404).end();return}
 res.writeHead(200,{'content-type':mime[path.extname(f)]||'application/octet-stream','cache-control':'no-store'});fs.createReadStream(f).pipe(res);
}catch(e){res.writeHead(500).end(String(e))}});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const PORT=server.address().port;
 const browser=await chromium.launch({headless:true}); const result={};
 try{
  for(const side of ['original','split']){
   const c=await browser.newContext({viewport:{width:1440,height:900}}); const p=await c.newPage();
   const errors={page:[],console:[],request:[]};
   p.on('pageerror',e=>errors.page.push(String(e))); p.on('console',m=>{if(m.type()==='error')errors.console.push(m.text())}); p.on('requestfailed',r=>errors.request.push(r.url()));
   await p.goto('http://127.0.0.1:'+PORT+'/'+side+'/개발과정/02-memory-stack.html',{waitUntil:'networkidle'});
   const initial=await p.locator('#inspectTitle').textContent();
   let physical={success:false,error:null,titleAfter:null};
   try{await p.locator('.layer').nth(3).click({timeout:1200});physical.success=true}catch(e){physical.error=String(e.message).split('\n')[0]}
   physical.titleAfter=await p.locator('#inspectTitle').textContent();
   await p.evaluate(()=>document.querySelectorAll('.layer')[3].click());
   const domTitle=await p.locator('#inspectTitle').textContent();
   await p.locator('#legend > *').nth(4).click();
   const legendTitle=await p.locator('#inspectTitle').textContent();
   result[side]={initial,physical,domClick:{index:3,titleAfter:domTitle},legendClick:{index:4,titleAfter:legendTitle},errors};
   await c.close();
  }
  result.parity={
   physicalBlockedBoth:!result.original.physical.success&&!result.split.physical.success,
   physicalTitleUnchangedBoth:result.original.physical.titleAfter===result.original.initial&&result.split.physical.titleAfter===result.split.initial,
   domPathSame:result.original.domClick.titleAfter===result.split.domClick.titleAfter,
   legendPathSame:result.original.legendClick.titleAfter===result.split.legendClick.titleAfter,
   zeroErrors:[...result.original.errors.page,...result.original.errors.console,...result.original.errors.request,...result.split.errors.page,...result.split.errors.console,...result.split.errors.request].length===0
  };
  fs.writeFileSync(OUT,JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
 } finally {await browser.close();server.close()}
})().catch(e=>{console.error(e);process.exitCode=1;server.close()});