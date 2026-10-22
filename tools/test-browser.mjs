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
assert.match(await run('document.getElementById("dsh-theme-orbit-rocket-flight").style.transform'),/1094px, 414px/);
// During thrust, one parent contains both the rocket and nozzle. Read the
// position in the SAME event task: tracking must not wait for the glow's rAF.
assert.equal(await run(`(()=>{
  const flight=document.getElementById('dsh-theme-orbit-rocket-flight');
  const exhaust=document.getElementById('dsh-theme-orbit-exhaust');
  if(exhaust.parentElement!==flight||!flight.querySelector('svg')||getComputedStyle(document.body).cursor!=='none')return false;
  for(let i=0;i<80;i++){
    const x=1100+(i%5)*55,y=420-(i%3)*20;
    document.dispatchEvent(new PointerEvent('pointermove',{clientX:x,clientY:y,buttons:1,pointerType:'mouse',bubbles:true}));
    const rocket=flight.querySelector('svg').getBoundingClientRect();
    const nozzle=exhaust.getBoundingClientRect();
    if(Math.abs(rocket.x-(x-6))>.01||Math.abs(rocket.y-(y-6))>.01||Math.abs(nozzle.x-(x+15))>.01||Math.abs(nozzle.y-(y+15))>.01)return false;
  }
  return true;
})()`),true,'Rocket and flame must track together before the next animation frame');
for(const [x,y]of [[1200,420],[1480,400],[1535,400],[1100,420]]){
  await mouse('mouseMoved',x,y,{button:'left',buttons:1});
  assert.equal(await run(`(()=>{const flight=document.getElementById('dsh-theme-orbit-rocket-flight');const r=flight.getBoundingClientRect();return Math.abs(r.x-(${x}-6))<.01&&Math.abs(r.y-(${y}-6))<.01&&getComputedStyle(document.body).cursor==='none';})()`),true);
}
// The real rocket now appears in screenshots with its flame; no QA-only cursor.
fs.mkdirSync(root+'/.test-output',{recursive:true});
fs.writeFileSync(root+'/.test-output/rocket-boost.png',Buffer.from((await cdp('Page.captureScreenshot',{format:'png',clip:{x:1068,y:395,width:118,height:118,scale:2}})).data,'base64'));
await mouse('mouseReleased',1100,420,{button:'left'});assert.equal(await active(),'false');await delay(550);
assert.equal(await run('getComputedStyle(document.getElementById("dsh-theme-orbit-rocket-flight")).visibility'),'hidden');
assert.equal(await run('document.body.hasAttribute("data-orbit-boosting")'),false);
assert.match(await run('getComputedStyle(document.body).cursor'),/^url\(/);
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
// The desktop menu has its own shadow-root cursor rule. It must hide the
// native cursor during thrust too, while still receiving normal menu clicks.
await run(`window.menuHost=document.createElement('div');menuHost.setAttribute('data-windows-menu','');
  menuHost.style.cssText='position:fixed;left:360px;top:10px;z-index:100';
  menuHost.attachShadow({mode:'open'}).innerHTML='<button style="width:90px;height:32px;cursor:default">Application</button>';
  window.menuClicks=0;menuHost.shadowRoot.querySelector('button').onclick=()=>menuClicks++;document.body.appendChild(menuHost);`);
await delay(35);await mouse('mouseMoved',400,25);await delay(30);
await mouse('mousePressed',400,25,{button:'left',buttons:1,clickCount:1});
assert.equal(await active(),'true');
assert.equal(await run('getComputedStyle(menuHost.shadowRoot.querySelector("button")).cursor'),'none');
await mouse('mouseReleased',400,25,{button:'left',clickCount:1});
assert.equal(await run('menuClicks'),1);
assert.match(await run('getComputedStyle(menuHost.shadowRoot.querySelector("button")).cursor'),/^url\(/);
await run('menuHost.remove()');
// Leave / blur / pointer cancellation cannot leave a stuck exhaust.
for(const trigger of ["document.dispatchEvent(new PointerEvent('pointerleave'))","window.dispatchEvent(new Event('blur'))","document.dispatchEvent(new PointerEvent('pointercancel'))"]){
  await mouse('mouseMoved',1100,420);await delay(25);await mouse('mousePressed',1100,420,{button:'left',buttons:1});assert.equal(await active(),'true');
  await run(trigger);assert.equal(await active(),'false');
  assert.equal(await run('document.body.hasAttribute("data-orbit-boosting")'),false);
  assert.equal(await run('getComputedStyle(document.getElementById("dsh-theme-orbit-rocket-flight")).visibility'),'hidden');
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
assert.equal(await active(),'true');assert.equal(await run('document.getElementById("dsh-theme-orbit-exhaust").getAnimations({subtree:true}).length'),0);
assert.equal(await run('document.querySelectorAll("#dsh-theme-orbit-sparks > span").length'),0);
await mouse('mouseReleased',1100,420,{button:'left'});
await cdp('Emulation.setEmulatedMedia',{features:[]});await delay(60);
await mouse('mousePressed',1100,420,{button:'left',buttons:1});await delay(100);await run('window.disposeOrbit()');await delay(550);
assert.equal(await run('document.querySelectorAll("#dsh-theme-orbit-exhaust,#dsh-theme-orbit-sparks,#dsh-theme-orbit-rocket-flight").length'),0);
assert.equal(await run('document.body.hasAttribute("data-orbit-boosting")'),false);
assert.deepEqual(errors,[]);
console.log('PASS: idle native rocket, left-only plume/particles, frame-locked rocket/flame + immediate tracking, hotspot, edge tracking, native cursor restoration, release/leave/blur/cancel cleanup, text typing, reading protection, focus surface, sidebar avoidance, reduced motion, disposal; no browser exceptions.');
await cdp('Page.close');socket.close();
