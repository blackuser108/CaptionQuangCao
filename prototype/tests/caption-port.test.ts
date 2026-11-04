import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGenerateHandler } from '../lib/server/generate.ts';
import { buildBrief, briefForPrompt } from '../lib/engine/context.ts';
import { buildMessages } from '../lib/engine/prompt.ts';
import { scoreOutput } from '../lib/engine/quality.ts';
import { sampleInput, getSample } from '../lib/samples.ts';
import { validOutput, targets } from '../lib/content.ts';
import { parseJudge, parsePolish } from '../lib/engine/agents.ts';

const env={AI_PROVIDER:'deepseek',DEEPSEEK_API_KEY:'test-port-secret',DEEPSEEK_MODEL:'deepseek-flash'};
const output=getSample(0);
const req=(signal?:AbortSignal,body:unknown=sampleInput)=>new Request('http://127.0.0.1:3000/api/generate',{method:'POST',headers:{origin:'http://127.0.0.1:3000','content-type':'application/json'},body:JSON.stringify(body),signal});
const wrap=(value:unknown)=>Response.json({model:'deepseek-flash',usage:{prompt_tokens:2,completion_tokens:3,total_tokens:5},choices:[{finish_reason:'stop',message:{content:JSON.stringify(value)}}]});
const pool=()=>({slots:output.captions.map((text,i)=>({strategy:['benefit-led','audience-led','story-led'][i],candidates:[{text,p:.1},{text:text+' Xem thêm.',p:.9}]})),headlines:output.headlines,hashtags:output.hashtags.map((tag,i)=>({tag,role:['brand','category','category','audience','mood'][i]}))});
function fixture(change?: (body:any,n:number)=>Response|Promise<Response>,extra={}){
 const calls:any[]=[],logs:any[]=[];
 const fetchUpstream=(async(url:any,options:any)=>{const body=JSON.parse(options.body);calls.push({url:String(url),body,signal:options.signal});if(change)return change(body,calls.length);const p=JSON.parse(body.messages[1].content);
  if(p.slots)return wrap({slots:p.slots.map((g:any)=>({candidates:g.candidates.map((c:any)=>({id:c.id,stop:5,concrete:5,voice:5,natural:5,faithful:5,fix:'Giữ dữ kiện.'}))}))});
  if(p.captions)return wrap({captions:p.captions.map((c:any)=>c.text)});
  return wrap(pool());
 }) as typeof fetch;
 return {calls,logs,run:createGenerateHandler({env,fetchUpstream,log:x=>logs.push(x),...extra})};
}
test('default Deep uses at most four fixed DeepSeek calls, canonical 3/3/5, bounded tokens and safe metadata',async()=>{
 const {run,calls,logs}=fixture();const r=await run(req());assert.equal(r.status,200);assert.ok(validOutput(await r.json()));assert.equal(calls.length,4);
 for(const [i,c] of calls.entries()){assert.equal(c.url,'https://api.deepseek.com/chat/completions');assert.equal(c.body.model,'deepseek-flash');assert.deepEqual(c.body.thinking,{type:'disabled'});assert.equal(c.body.max_tokens,i===0?4096:2048);assert.deepEqual(c.body.response_format,{type:'json_object'});assert.equal(c.signal.aborted,true);}
 assert.equal(logs[0].calls,4);assert.deepEqual(logs[0].usage,{prompt_tokens:8,completion_tokens:12,total_tokens:20});assert.doesNotMatch(JSON.stringify(logs),/test-port-secret|Sổ tay|captions|messages|Giữ dữ kiện/);
});
test('bad JSON or pool, provider 429/500 and network stop without repair/retry/fallback',async()=>{
 for(const response of [new Response('{'),wrap({slots:[]}),new Response('PRIVATE_BODY',{status:429}),new Response('PRIVATE_BODY',{status:500})]){
  const {run,calls}=fixture(()=>response);const r=await run(req());assert.ok([429,502].includes(r.status));assert.equal(calls.length,1);assert.doesNotMatch(await r.text(),/PRIVATE_BODY|test-port-secret/);
 }
 const {run,calls}=fixture(()=>{throw new Error('PRIVATE_NETWORK')});assert.equal((await run(req())).status,503);assert.equal(calls.length,1);
});
test('judge failure returns error rather than degrading to a single or unjudged result',async()=>{
 const {run,calls}=fixture((_body,n)=>n===1?wrap(pool()):new Response('PRIVATE_JUDGE',{status:429}));const r=await run(req());assert.equal(r.status,429);assert.ok(calls.length<=3);assert.doesNotMatch(await r.text(),/PRIVATE_JUDGE/);
});
test('judge completeness and numeric types, malformed polish fail without a replacement inference',async()=>{
 const groups=[[{id:'A',text:'a'}],[{id:'A',text:'b'}],[{id:'A',text:'c'}]];
 for(const candidates of [[],[{id:'X',stop:5}],[{id:'A',stop:'5',concrete:5,voice:5,natural:5,faithful:5,fix:''}],[{id:'A',stop:4.5,concrete:5,voice:5,natural:5,faithful:5,fix:''}]]) assert.equal(parseJudge({slots:groups.map(()=>({candidates}))},groups),undefined);
 assert.equal(parsePolish({captions:[]}),undefined);assert.equal(parsePolish({captions:[1,2,3]}),undefined);
 const bad=fixture((_body,n)=>n===1?wrap(pool()):wrap({slots:[{candidates:[]},{candidates:[]},{candidates:[]}]}));assert.equal((await bad.run(req())).status,502);assert.ok(bad.calls.length<=3);
 const broken=fixture((body,n)=>{const p=JSON.parse(body.messages[1].content);if(n===1)return wrap(pool());if(p.slots)return wrap({slots:p.slots.map((g:any)=>({candidates:g.candidates.map((c:any)=>({id:c.id,stop:5,concrete:5,voice:5,natural:5,faithful:5,fix:'Giữ dữ kiện.'}))}))});return wrap({captions:[]});});assert.equal((await broken.run(req())).status,502);assert.equal(broken.calls.length,4);
});
test('quality overlap does not reject three structurally valid headlines',async()=>{
 const p=pool();p.headlines=output.captions.map(text=>text.split('\n')[0]);
 const f=fixture((body)=>{const payload=JSON.parse(body.messages[1].content);if(payload.slots)return wrap({slots:payload.slots.map((g:any)=>({candidates:g.candidates.map((c:any)=>({id:c.id,stop:5,concrete:5,voice:5,natural:5,faithful:5,fix:''}))}))});return wrap(p);});assert.equal((await f.run(req())).status,200);
});
test('timeout and incoming abort cancel pipeline, no late calls; response byte limit stays 32KiB',async()=>{
 for(const incoming of [false,true]){const controller=new AbortController();const {run,calls}=fixture(async(_body)=>new Promise((_resolve,reject)=>{setTimeout(()=>reject(new Error('aborted fixture')),30)}),{timeoutMs:10});if(incoming)controller.abort();const r=await run(req(controller.signal));assert.equal(r.status,504);assert.equal(calls.length,incoming?0:1);}
 const {run,calls}=fixture(()=>new Response(' '.repeat(32769)));assert.equal((await run(req())).status,502);assert.equal(calls.length,1);
});
test('DeepSeek configuration and injected client controls fail before inference; single mode stays one call',async()=>{
 for(const settings of [{...env,DEEPSEEK_API_KEY:''},{...env,DEEPSEEK_MODEL:'other'},{...env,CAPTION_PIPELINE:'other'}]){const {run,calls}=fixture(undefined,{env:settings});assert.equal((await run(req())).status,503);assert.equal(calls.length,0);}
 const invalid=fixture();assert.equal((await invalid.run(req(undefined,{...sampleInput,model:'other'}))).status,422);assert.equal(invalid.calls.length,0);
 const single=fixture(()=>wrap(output),{env:{...env,CAPTION_PIPELINE:'single'}});assert.equal((await single.run(req())).status,200);assert.equal(single.calls.length,1);
});
test('brief exposes only supplied facts/audience, keeps main targets and heuristic scores are advisory',async()=>{
 const brief=buildBrief(sampleInput),payload=briefForPrompt(brief,sampleInput);assert.deepEqual(targets,[[45,90],[150,260],[180,280]]);assert.deepEqual(payload.limits.captionChars,targets);
 assert.doesNotMatch(JSON.stringify(payload),/inferredBenefits|painPoints|motivations|goldenExamples|examples/);assert.equal(payload.audienceInput,sampleInput.audience);
 assert.match(buildMessages(sampleInput,brief)[0].content,/Không suy diễn đặc tính hoặc lợi ích/);
 const bad={...output,captions:['Được bảo hành 99 năm.',...output.captions.slice(1)]};assert.ok(scoreOutput(bad,sampleInput,brief).issues.some(x=>x.code==='unsupported-claim'));
 const single=fixture(()=>wrap(bad),{env:{...env,CAPTION_PIPELINE:'single'}});assert.equal((await single.run(req())).status,200);assert.ok(single.logs[0].diagnostics.issues.includes('unsupported-claim'));
});
