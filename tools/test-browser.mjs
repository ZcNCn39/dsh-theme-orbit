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
const active=()=>run('String(document.body.hasAttribute("data-orbit-boosting"))');
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
await mouse('mouseMoved',1100,420,{buttons:1});await delay(25);
assert.equal(await run('document.querySelectorAll("#dsh-theme-orbit-rocket-flight,#dsh-theme-orbit-exhaust").length'),0);
// All three flame states are native 32px cursor images with the idle hotspot.
const frames=new Set();
for(let i=0;i<4;i++){
  const sample=await run(`(async()=>{const cursor=getComputedStyle(document.elementFromPoint(1100,420)).cursor;
    const src=cursor.match(/^url\\("([^\"]+)"\\)/)[1];const image=new Image();image.src=src;await image.decode();
    return {cursor,svg:decodeURIComponent(src.split(',').slice(1).join(',')),width:image.naturalWidth,height:image.naturalHeight};})()`);
  assert.match(sample.cursor,/6 6, auto$/);assert.equal(sample.width,32);assert.equal(sample.height,32);
  assert.match(sample.svg,/data-orbit-nozzle/);frames.add(sample.svg);await delay(100);
}
assert.ok(frames.size>=2,'Native flame frames must animate while held');
// A high-rate mouse burst must do zero cursor-position DOM writes. The OS
// moves the native image; JS only updates the low-rate flame and soft glow.
await cdp('Emulation.setCPUThrottlingRate',{rate:4});
const burst=await run(`(()=>{
  const target=document.elementFromPoint(1100,420);const observer=new MutationObserver(()=>{});
  observer.observe(document.body,{attributes:true,attributeFilter:['style'],subtree:true});
  const start=performance.now();
  for(let i=0;i<2000;i++)target.dispatchEvent(new PointerEvent('pointermove',{clientX:1100+(i%5)*55,clientY:420,buttons:1,pointerType:'mouse',bubbles:true}));
  const duration=performance.now()-start;const writes=observer.takeRecords().length;observer.disconnect();
  return {events:2000,duration,styleWrites:writes,native:getComputedStyle(target).cursor.startsWith('url(')};
})()`);
assert.equal(burst.styleWrites,0);assert.equal(burst.native,true);console.log('Mouse burst at 4x CPU slowdown:',burst);
await cdp('Emulation.setCPUThrottlingRate',{rate:1});
for(const [x,y]of [[1200,420],[1480,400],[1535,400],[1100,420]]){
  await mouse('mouseMoved',x,y,{button:'left',buttons:1});await delay(25);
  assert.match(await run(`getComputedStyle(document.elementFromPoint(${x},${y})).cursor`),/^url\(/);
}
// Browser captures omit native cursors; show the exact current image for QA.
await run(`window.cursorMarker=document.createElement('img');cursorMarker.src=getComputedStyle(document.elementFromPoint(1100,420)).cursor.match(/^url\\("([^\"]+)"\\)/)[1];
  cursorMarker.style.cssText='position:fixed;left:1094px;top:414px;width:32px;height:32px;z-index:2147483647;pointer-events:none';document.body.appendChild(cursorMarker);cursorMarker.decode();`);
fs.mkdirSync(root+'/.test-output',{recursive:true});
fs.writeFileSync(root+'/.test-output/rocket-boost.png',Buffer.from((await cdp('Page.captureScreenshot',{format:'png',clip:{x:1068,y:395,width:118,height:118,scale:2}})).data,'base64'));
await run('cursorMarker.remove()');
await mouse('mouseReleased',1100,420,{button:'left'});assert.equal(await active(),'false');await delay(550);
assert.equal(await run('document.body.hasAttribute("data-orbit-boosting")'),false);
assert.match(await run('getComputedStyle(document.body).cursor'),/^url\(/);
assert.equal(await run('document.elementFromPoint(1100,420).style.getPropertyValue("cursor")'),'');
assert.equal(await run('document.querySelectorAll("#dsh-theme-orbit-sparks > span").length'),0);
// Input remains a text cursor and receives real typing without a launch effect.
const input=await run('(()=>{var r=document.querySelector("textarea").getBoundingClientRect();return {x:r.left+30,y:r.top+20}})()');
await mouse('mouseMoved',1100,420);await delay(25);
await mouse('mousePressed',1100,420,{button:'left',buttons:1});
await mouse('mouseMoved',input.x,input.y,{button:'left',buttons:1});await delay(35);
assert.equal(await active(),'false');
assert.equal(await run('document.body.hasAttribute("data-orbit-boosting")'),false);
assert.equal(await run('document.body.getAttribute("data-orbit-rocket-cursor")'),'text');
await mouse('mouseReleased',input.x,input.y,{button:'left'});
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
// Shadow-menu targets get a native flame too; original inline styles survive.
await run(`window.menuHost=document.createElement('div');menuHost.setAttribute('data-windows-menu','');
  menuHost.style.cssText='position:fixed;left:360px;top:10px;z-index:100';
  menuHost.attachShadow({mode:'open'}).innerHTML='<button style="width:90px;height:32px;cursor:default">Application</button>';
  window.menuClicks=0;menuHost.shadowRoot.querySelector('button').onclick=()=>menuClicks++;document.body.appendChild(menuHost);`);
await delay(35);await mouse('mouseMoved',400,25);await delay(30);
await mouse('mousePressed',400,25,{button:'left',buttons:1,clickCount:1});
assert.equal(await active(),'true');
assert.match(await run('decodeURIComponent(getComputedStyle(menuHost.shadowRoot.querySelector("button")).cursor)'),/data-orbit-nozzle/);
await mouse('mouseReleased',400,25,{button:'left',clickCount:1});
assert.equal(await run('menuClicks'),1);
assert.match(await run('getComputedStyle(menuHost.shadowRoot.querySelector("button")).cursor'),/^url\(/);
assert.equal(await run('menuHost.shadowRoot.querySelector("button").style.cursor'),'default');
await run('menuHost.remove()');
// Leave / blur / pointer cancellation cannot leave a stuck exhaust.
for(const trigger of ["document.dispatchEvent(new PointerEvent('pointerleave'))","window.dispatchEvent(new Event('blur'))","document.dispatchEvent(new PointerEvent('pointercancel'))"]){
  await mouse('mouseMoved',1100,420);await delay(25);await mouse('mousePressed',1100,420,{button:'left',buttons:1});assert.equal(await active(),'true');
  await run(trigger);assert.equal(await active(),'false');
  assert.equal(await run('document.body.hasAttribute("data-orbit-boosting")'),false);
  assert.equal(await run('document.querySelectorAll("#dsh-theme-orbit-rocket-flight").length'),0);
  await mouse('mouseReleased',1100,420,{button:'left'});
}
// A session list reaching the footer hides the astronaut; releasing space restores it.
await run(`window.row=document.createElement('div');row.setAttribute('data-row-key','session:qa');row.setAttribute('aria-selected','true');
  row.textContent='Current session';row.style.cssText='position:fixed;left:20px;top:690px;width:230px;height:30px;z-index:20';document.querySelector('aside').appendChild(row);`);await delay(45);
assert.equal(await run('document.getElementById("dsh-theme-orbit-astronauts").getAttribute("data-orbit-hidden")'),'true');
assert.match(await run('getComputedStyle(row).boxShadow'),/inset/);
await run('row.remove()');await delay(45);assert.equal(await run('document.getElementById("dsh-theme-orbit-astronauts").getAttribute("data-orbit-hidden")'),'false');
await delay(550);await cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await delay(60);
await mouse('mouseMoved',1100,420);await delay(25);await mouse('mousePressed',1100,420,{button:'left',buttons:1});await delay(140);
assert.equal(await active(),'true');
const still=await run('getComputedStyle(document.elementFromPoint(1100,420)).cursor');await delay(180);
assert.equal(await run('getComputedStyle(document.elementFromPoint(1100,420)).cursor'),still);
assert.equal(await run('document.querySelectorAll("#dsh-theme-orbit-sparks > span").length'),0);
await mouse('mouseReleased',1100,420,{button:'left'});
await cdp('Emulation.setEmulatedMedia',{features:[]});await delay(60);
await mouse('mousePressed',1100,420,{button:'left',buttons:1});await delay(100);await run('window.disposeOrbit()');await delay(550);
assert.equal(await run('document.querySelectorAll("#dsh-theme-orbit-exhaust,#dsh-theme-orbit-sparks,#dsh-theme-orbit-rocket-flight").length'),0);
assert.equal(await run('document.body.hasAttribute("data-orbit-boosting")'),false);
assert.deepEqual(errors,[]);
console.log('PASS: native idle/thrust cursors, animated compact flame, 2000-event burst without DOM movement writes, 32px edge-safe images, inline-style restoration, shadow menu, release/leave/blur/cancel cleanup, typing, reading, focus, sidebar, reduced motion and disposal; no browser exceptions.');
await cdp('Page.close');socket.close();
