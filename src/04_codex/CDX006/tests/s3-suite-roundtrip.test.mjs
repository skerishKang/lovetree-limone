import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const capsule=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const j=p=>JSON.parse(fs.readFileSync(path.join(capsule,p),'utf8'));
const o=p=>path.join(capsule,'original',p), s=p=>path.join(capsule,'split',p);
const members=[
['개발과정/index.html','index.styles.css',null],
['개발과정/01-memory-capsule.html','01-memory-capsule.styles.css','01-memory-capsule.script.js'],
['개발과정/02-memory-stack.html','02-memory-stack.styles.css','02-memory-stack.script.js'],
['개발과정/03-tree-keeper.html','03-tree-keeper.styles.css','03-tree-keeper.script.js']];
function reconstruct(rel,cssName,jsName){
 const source=fs.readFileSync(o(rel),'utf8'); let candidate=fs.readFileSync(s(rel),'utf8');
 const st=source.match(/<style\b[^>]*>[\s\S]*?<\/style>/i); assert.ok(st);
 const css=fs.readFileSync(path.join(path.dirname(s(rel)),cssName),'utf8');
 assert.equal(css,st[0].replace(/^<style\b[^>]*>/i,'').replace(/<\/style>$/i,''));
 candidate=candidate.replace('<link rel="stylesheet" href="./'+cssName+'">',st[0]);
 const sc=source.match(/<script\b(?![^>]*\bsrc\s*=)[^>]*>[\s\S]*?<\/script>/i);
 if(jsName===null) assert.equal(sc,null);
 else { assert.ok(sc); const js=fs.readFileSync(path.join(path.dirname(s(rel)),jsName),'utf8');
   assert.equal(js,sc[0].replace(/^<script\b[^>]*>/i,'').replace(/<\/script>$/i,''));
   candidate=candidate.replace('<script src="./'+jsName+'"></script>',sc[0]); }
 return {source,candidate};
}
test('four member surfaces mechanically reconstruct exact ORIGINAL bytes',()=>{for(const m of members){const r=reconstruct(...m);assert.equal(r.candidate,r.source,m[0]);}});
test('launcher exact on both sides',()=>{const a=fs.readFileSync(o('최종본.html')),b=fs.readFileSync(s('최종본.html'));assert.equal(sha(a),'fdcc0ea79b342d051e90f8f073f7c7b8d8ce5c71f00c49f71461b314e78caf99');assert.deepEqual(a,b);});
test('authority member hashes exact',()=>{const e=new Map([['개발과정/index.html','3b526a20743101fedfdf951e035c1a8370a0f88c88e3133cc642dc8c290a8841'],['개발과정/01-memory-capsule.html','cc0c3815300b87140c94a8b0ce5831dfb0e03d091147eb2b19deaa59c6ac9922'],['개발과정/02-memory-stack.html','0114c705dcb316b99e46931cd131e2ae211c4e5824b759ccb9f594ea31e23785'],['개발과정/03-tree-keeper.html','9979c145895537d3f1f626d717112069190286894e16aa63458d94a761c7aa5d']]);for(const [p,h] of e)assert.equal(sha(fs.readFileSync(o(p))),h,p);});
test('88 assets exact both sides',()=>{const l=j('evidence/s3/asset-ledger.json');assert.equal(l.runtime_asset_count,86);assert.equal(l.reference_only_asset_count,2);assert.equal(l.records.length,88);for(const r of l.records){const rel=path.join('개발과정',...r.relative_path.split('/'));const a=fs.readFileSync(o(rel)),b=fs.readFileSync(s(rel));assert.equal(sha(a),r.sha256);assert.equal(sha(b),r.sha256);assert.deepEqual(a,b);}});
test('topology exactly eight edges across ORIGINAL and split executable file sets',()=>{const t=j('evidence/s3/topology.json');assert.equal(t.result,'PASS');assert.equal(t.edges.length,8);for(const e of t.edges){assert.equal(e.preserved,true);const originalText=fs.readFileSync(o(e.source_file),'utf8');assert.ok(originalText.includes(e.target),`${e.from}->${e.to} original target`);const splitFiles=[s(e.source_file)];const parsed=path.parse(e.source_file);const companion=path.join(capsule,'split',parsed.dir,parsed.name+'.script.js');if(fs.existsSync(companion))splitFiles.push(companion);assert.ok(splitFiles.some(f=>fs.readFileSync(f,'utf8').includes(e.target)),`${e.from}->${e.to} split target`);}});
test('all 86 authored runtime URLs resolve unchanged on both sides',()=>{const u=j('evidence/s3/url-resolution.json');assert.equal(u.result,'PASS');assert.equal(u.runtime_url_count,86);assert.equal(u.resolved_original,86);assert.equal(u.resolved_split,86);assert.equal(u.url_rewrites,0);assert.equal(u.records.length,86);for(const r of u.records){const rel=path.join('개발과정',...r.authored_url.split('/'));const a=fs.readFileSync(o(rel)),b=fs.readFileSync(s(rel));assert.equal(sha(a),r.sha256,r.authored_url);assert.equal(sha(b),r.sha256,r.authored_url);assert.equal(r.url_rewritten,false);}});
test('95-file authored corpus is exact on ORIGINAL and non-member SPLIT files stay exact',()=>{const c=j('evidence/s3/corpus-ledger.json');assert.equal(c.result,'PASS');assert.equal(c.source_file_count,95);assert.equal(c.original_exact_source_file_count,95);assert.equal(c.mechanically_transformed_member_html_count,4);assert.equal(c.records.length,95);for(const r of c.records){const rel=path.join(...r.relative_path.split('/'));assert.equal(sha(fs.readFileSync(o(rel))),r.source.sha256,r.relative_path);if(r.split_equals_source)assert.equal(sha(fs.readFileSync(s(rel))),r.source.sha256,r.relative_path);}});
test('S4 remains fail-closed',()=>{const m=j('manifest.json');
// CENTRAL authorized the candidate lifecycle synchronisation (#589 5987550155): S3 is ACCEPTED and
// the S4 parity capture gate is RELEASED. The fail-closed intent is unchanged and still enforced
// below - only the capture gate moved. S4 acceptance itself must remain unclaimed.
assert.equal(m.s3_status,'ACCEPTED');assert.equal(m.central_s3_accepted,true);
assert.equal(m.stages.mechanical_split_complete,true);
assert.equal(m.stages.source_split_parity_pass,false,'parity pass must never be claimed');
assert.equal(m.s4_status,'CANDIDATE_PENDING_CENTRAL');assert.equal(m.central_s4_accepted,false);
assert.equal(m.parity_ref,null,'no accepted parity ref before CENTRAL acceptance');
assert.equal(m.stage_gate.s4_release,'RELEASED');
assert.equal(m.stage_gate.parity_capture_authorized,true);
assert.equal(m.product_adoption,false);assert.equal(m.capability_native_adoption,false);
assert.equal(m.product_canonical,false);assert.equal(m.drive_mutation,0);
assert.equal(fs.existsSync(path.join(capsule,'evidence','parity','accepted-parity.json')),false,
 'the accepted-parity artifact must stay absent until CENTRAL accepts S4');});
test('six frozen defects preserved',()=>{const m=j('manifest.json');assert.equal(m.source_contract.authored_math_random_sites,9);assert.equal(m.source_contract.authored_prefers_reduced_motion,false);assert.equal(m.source_contract.frozen_defects.length,6);assert.ok(m.source_contract.frozen_defects.every(d=>d.preserved&&!d.repaired));});
test('no TS/TSX/JSX in split',()=>{const q=[path.join(capsule,'split')],bad=[];while(q.length){const d=q.pop();for(const e of fs.readdirSync(d,{withFileTypes:true})){const f=path.join(d,e.name);if(e.isDirectory())q.push(f);else if(/\.(tsx|jsx|ts)$/i.test(e.name))bad.push(f);}}assert.deepEqual(bad,[]);});
