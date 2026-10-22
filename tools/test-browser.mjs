import fs from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..').replaceAll('\\','/');
const cdpUrl=process.env.ORBIT_CDP_URL || 'http://127.0.0.1:9447';
const target=await(await fetch(cdpUrl+'/json/new?about:blank',{method:'PUT'})).json();
const socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>socket.addEventListener('open',r,{once:true}));
let next=0;const pending=new Map(),errors=[];
socket.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(new Error(JSON.stringify(m.error))):p.resolve(m.result)}});
const cdp=(method,params={})=>new Promise((resolve,reject)=>{pending.set(++next,{resolve,reject});socket.send(JSON.stringify({id:next,method,params}))});
const run=async expression=>{const r=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result.value};
const delay=ms=>run(`new Promise(r=>setTimeout(r,${ms}))`);
const mouse=(type,x,y,extra={})=>cdp('Input.dispatchMouseEvent',{type,x,y,...extra});
const active=()=>run('document.getElementById("dsh-theme-orbit-exhaust").getAttribute("data-active")');
await cdp('Runtime.enable');await cdp('Page.enable');await cdp('Emulation.setDeviceMetricsOverride',{width:1536,height:816,deviceScaleFactor:1.25,mobile:false});
await cdp('Page.navigate',{url:'file:///'+root+'/docs/preview.html'});
await run('new Promise(r=>document.readyState==="complete"?r():window.addEventListener("load",r,{once:true}))');await delay(150);
await mouse('mouseMoved',1080,420);await delay(35);
assert.equal(await active(),'false');
assert.equal(await run('document.querySelectorAll("#dsh-theme-orbit-sparks > span").length'),0);
await mouse('mousePressed',1080,420,{button:'right',buttons:2});
assert.equal(await active(),'false');await mouse('mouseReleased',1080,420,{button:'right'});
await mouse('mousePressed',1080,420,{button:'left',buttons:1});await delay(200);
assert.equal(await active(),'true');
const particles=await run('document.querySelectorAll("#dsh-theme-orbit-sparks > span").length');assert.ok(particles>0&&particles<=14);
assert.equal(await run('document.getElementById("dsh-theme-orbit-exhaust").getAnimations({subtree:true}).length'),2);
await mouse('mouseMoved',1100,420,{buttons:1});await delay(25);
assert.match(await run('document.getElementById("dsh-theme-orbit-exhaust").style.transform'),/1115px, 435px/);
// Browser screenshots omit the OS cursor; draw its same SVG at the same hotspot
// only for the visual QA artifact, not in the shipped runtime.
await run(`window.cursorMarker=document.createElement('img');cursorMarker.src=getComputedStyle(document.body).cursor.match(/^url\\("([^\"]+)"\\)/)[1];
  cursorMarker.style.cssText='position:fixed;left:1094px;top:414px;width:32px;height:32px;z-index:2147483647;pointer-events:none';document.body.appendChild(cursorMarker);cursorMarker.decode();`);
fs.mkdirSync(root+'/.test-output',{recursive:true});
fs.writeFileSync(root+'/.test-output/rocket-boost.png',Buffer.from((await cdp('Page.captureScreenshot',{format:'png',clip:{x:1068,y:395,width:118,height:118,scale:2}})).data,'base64'));
await run('cursorMarker.remove()');
await mouse('mouseReleased',1100,420,{button:'left'});assert.equal(await active(),'false');await delay(550);
assert.equal(await run('document.querySelectorAll("#dsh-theme-orbit-sparks > span").length'),0);
// Input remains a text cursor and receives real typing without a launch effect.
const input=await run('(()=>{var r=document.querySelector("textarea").getBoundingClientRect();return {x:r.left+30,y:r.top+20}})()');
await mouse('mouseMoved',input.x,input.y);await delay(35);await mouse('mousePressed',input.x,input.y,{button:'left',buttons:1});
assert.equal(await active(),'false');await mouse('mouseReleased',input.x,input.y,{button:'left'});await cdp('Input.insertText',{text:'Orbit launch'});await delay(210);
assert.equal(await run('document.querySelector("textarea").value'),'Orbit launch');
assert.equal(await run('document.getElementById("dsh-theme-orbit-cursor-glow").getAttribute("data-context")'),'input');
assert.equal(await run('document.body.getAttribute("data-orbit-rocket-cursor")'),'text');
assert.equal(await run('getComputedStyle(document.querySelector("[data-composer-card]")).borderTopColor'),'rgba(142, 191, 255, 0.65)');
await run(`window.message=document.createElement('article');message.setAttribute('data-chat-flow-key','qa');
  message.style.cssText='position:fixed;left:600px;top:160px;width:500px;color:white;font:22px sans-serif';message.textContent='Readable text above the lunar background';document.body.appendChild(message);`);
assert.match(await run('getComputedStyle(message).backgroundImage'),/linear-gradient/);
await mouse('mouseMoved',615,174);await delay(40);assert.equal(await run('document.getElementById("dsh-theme-orbit-cursor-glow").getAttribute("data-context")'),'reading');
// Leave / blur / pointer cancellation cannot leave a stuck exhaust.
for(const trigger of ["document.dispatchEvent(new PointerEvent('pointerleave'))","window.dispatchEvent(new Event('blur'))","document.dispatchEvent(new PointerEvent('pointercancel'))"]){
  await mouse('mouseMoved',1100,420);await delay(25);await mouse('mousePressed',1100,420,{button:'left',buttons:1});assert.equal(await active(),'true');
  await run(trigger);assert.equal(await active(),'false');await mouse('mouseReleased',1100,420,{button:'left'});
}
// A session list reaching the footer hides the astronaut; releasing space restores it.
await run(`window.row=document.createElement('div');row.setAttribute('data-row-key','session:qa');row.setAttribute('aria-selected','true');
  row.textContent='Current session';row.style.cssText='position:fixed;left:20px;top:690px;width:230px;height:30px;z-index:20';document.querySelector('aside').appendChild(row);`);await delay(45);
assert.equal(await run('document.getElementById("dsh-theme-orbit-astronauts").getAttribute("data-orbit-hidden")'),'true');
assert.match(await run('getComputedStyle(row).boxShadow'),/inset/);
await run('row.remove()');await delay(45);assert.equal(await run('document.getElementById("dsh-theme-orbit-astronauts").getAttribute("data-orbit-hidden")'),'false');
await delay(550);await cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await delay(60);
await mouse('mouseMoved',1100,420);await delay(25);await mouse('mousePressed',1100,420,{button:'left',buttons:1});await delay(140);
assert.equal(await active(),'true');assert.equal(await run('document.getElementById("dsh-theme-orbit-exhaust").getAnimations({subtree:true}).length'),0);
assert.equal(await run('document.querySelectorAll("#dsh-theme-orbit-sparks > span").length'),0);
await mouse('mouseReleased',1100,420,{button:'left'});
await cdp('Emulation.setEmulatedMedia',{features:[]});await delay(60);
await mouse('mousePressed',1100,420,{button:'left',buttons:1});await delay(100);await run('window.disposeOrbit()');await delay(550);
assert.equal(await run('document.querySelectorAll("#dsh-theme-orbit-exhaust,#dsh-theme-orbit-sparks").length'),0);
assert.deepEqual(errors,[]);
console.log('PASS: idle no flame, left-only sustained plume/particles, tracking/hotspot, release/leave/blur/cancel cleanup, text typing, reading protection, focus surface, sidebar avoidance, reduced motion, disposal; no browser exceptions.');
await cdp('Page.close');socket.close();
