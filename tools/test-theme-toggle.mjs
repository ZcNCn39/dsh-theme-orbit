import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..').replaceAll('\\','/');
const base=process.env.ORBIT_CDP_URL || 'http://127.0.0.1:9447';
const target=await(await fetch(base+'/json/new?about:blank',{method:'PUT'})).json();
const socket=new WebSocket(target.webSocketDebuggerUrl);
await new Promise(r=>socket.addEventListener('open',r,{once:true}));
let id=0;const pending=new Map(),errors=[];
socket.addEventListener('message',event=>{
  const m=JSON.parse(event.data);
  if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails);
  if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(new Error(JSON.stringify(m.error))):p.resolve(m.result);}
});
const cdp=(method,params={})=>new Promise((resolve,reject)=>{pending.set(++id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
const run=async expression=>{
  const r=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
  if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));
  return r.result.value;
};
const delay=ms=>run(`new Promise(r=>setTimeout(r,${ms}))`);
const click=async()=>{
  const {x,y}=await run('(()=>{const r=ratio.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()');
  await cdp('Input.dispatchMouseEvent',{type:'mouseMoved',x,y});
  await cdp('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',buttons:1,clickCount:1,x,y});
  assert.equal(await run('document.body.hasAttribute("data-orbit-boosting")'),false,'Caption control must not start the propulsion effect');
  await cdp('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',buttons:0,clickCount:1,x,y});
  await delay(60);
};
const key=async(key,code,virtualKey)=>{
  await cdp('Input.dispatchKeyEvent',{type:'keyDown',key,code,windowsVirtualKeyCode:virtualKey,...(key==='Enter'?{text:'\r'}:{})});
  await cdp('Input.dispatchKeyEvent',{type:'keyUp',key,code,windowsVirtualKeyCode:virtualKey});
  await delay(60);
};
const snapshot=()=>run(`({mode:ratio.dataset.mode,checked:ratio.getAttribute('aria-checked'),
  moon:getComputedStyle(document.getElementById('dsh-theme-orbit-moon')).display,
  sun:getComputedStyle(document.getElementById('dsh-theme-orbit-sun')).display,
  particleAnimations:Array.from(document.querySelectorAll('[data-solar-particle]')).reduce((sum,n)=>sum+n.getAnimations().length,0),
  sunIcon:getComputedStyle(ratio.querySelector('[data-ratio-sun]')).display,
  moonIcon:getComputedStyle(ratio.querySelector('[data-ratio-moon]')).display})`);
try {
  await cdp('Runtime.enable');await cdp('Page.enable');
  await cdp('Emulation.setDeviceMetricsOverride',{width:1536,height:816,deviceScaleFactor:1,mobile:false});
  await cdp('Page.navigate',{url:'file:///'+root+'/docs/preview.html'});
  await run(`new Promise((resolve,reject)=>{const deadline=Date.now()+5000;const check=()=>{if(document.getElementById('dsh-theme-orbit-skeleton')?.dataset.ready==='true')resolve();else if(Date.now()>deadline)reject(Error('Artwork load timeout'));else setTimeout(check,20);};check();})`);
  await run(`window.themeCalls=[];window.originalSetTheme=orbitPreviewTheme.setTheme;
    orbitPreviewTheme.setTheme=mode=>{themeCalls.push(mode);originalSetTheme(mode);};
    // Minimal native-caption fixture. The two menu buttons keep their own navigation.
    window.addCaption=()=>{
      const host=document.createElement('div');host.setAttribute('data-windows-menu','');
      const shadow=host.attachShadow({mode:'open'});
      shadow.innerHTML='<style>:host{position:fixed;top:0;left:48px;z-index:1100;height:48px;display:flex;align-items:center;font-family:Segoe UI,sans-serif;-webkit-app-region:no-drag}[role=menubar]{display:flex}button{height:28px;padding:0 10px;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:14px;cursor:default}button:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}button:focus-visible{outline:2px solid var(--dsw-alias-brand-primary)}</style><div role="menubar"><button>应用</button><button>编辑</button></div>';
      const buttons=Array.from(shadow.querySelectorAll('button'));
      buttons.forEach((button,index)=>{
        button.tabIndex=index===0?0:-1;
        button.onpointerdown=button.onmousedown=event=>event.preventDefault();
        button.onclick=()=>window.menuClicks++;
        button.onkeydown=event=>{if(event.key==='ArrowRight'||event.key==='ArrowLeft'){
          event.preventDefault();button.tabIndex=-1;buttons[1-index].tabIndex=0;buttons[1-index].focus();
        }};
      });
      document.body.appendChild(host);window.caption=host;window.menuRoot=shadow;
    };window.menuClicks=0;addCaption();`);
  await delay(60);
  await run('window.ratio=menuRoot.getElementById("dsh-theme-orbit-ratio")');
  assert.equal(await run('!!ratio'),true,'Late-mounted native caption must receive the toggle');
  assert.equal(await run('ratio.getAttribute("role")'),'switch');
  assert.deepEqual(await run('Array.from(menuRoot.querySelector("[role=menubar]").children,n=>n.textContent)'),['应用','编辑']);
  assert.equal(await run(`(()=>{const r=ratio.getBoundingClientRect(),e=menuRoot.querySelector('[role=menubar]').lastChild.getBoundingClientRect();return r.x>=e.right&&Math.abs(r.y-e.y)<1&&r.height===e.height;})()`),true,'Ratio sits after Edit, aligned to native menus');
  assert.equal(await run('getComputedStyle(ratio).cursor.includes("data:image/svg+xml")'),true);
  const dark=await snapshot();
  assert.equal(dark.mode,'dark');assert.equal(dark.checked,'true');assert.equal(dark.moon,'block');assert.equal(dark.sun,'none');assert.equal(dark.sunIcon,'none');assert.notEqual(dark.moonIcon,'none');
  await run('window.input=document.querySelector("textarea");input.value="保留选区与输入焦点";input.focus();input.setSelectionRange(1,5);window.darkToken=document.body.style.getPropertyValue("--dsw-alias-bg-base")');
  fs.mkdirSync(path.join(root,'.test-output'),{recursive:true});
  for(const mode of ['dark','light']){
    if(mode==='light')await click();
    const shot=await cdp('Page.captureScreenshot',{format:'png',clip:{x:0,y:0,width:400,height:65,scale:2}});
    fs.writeFileSync(path.join(root,'.test-output',`ratio-${mode}.png`),Buffer.from(shot.data,'base64'));
  }
  assert.deepEqual(await run('themeCalls'),['light'],'Use host setTheme exactly once');
  assert.equal(await run('document.activeElement===input&&input.selectionStart===1&&input.selectionEnd===5'),true,'Mouse toggle preserves editing focus and selection');
  assert.notEqual(await run('document.body.style.getPropertyValue("--dsw-alias-bg-base")'),await run('darkToken'));
  const light=await snapshot();
  assert.equal(light.mode,'light');assert.equal(light.checked,'false');assert.equal(light.sun,'block');assert.equal(light.moon,'none');assert.equal(light.particleAnimations,34);assert.equal(light.moonIcon,'none');assert.notEqual(light.sunIcon,'none');
  await click();assert.equal((await snapshot()).particleAnimations,0);
  assert.deepEqual(await run('themeCalls'),['light','dark']);
  await run('originalSetTheme("light")');await delay(60);
  assert.equal((await snapshot()).mode,'light','Native theme changes also update the toggle');
  await run('menuRoot.querySelector("[role=menubar]").firstChild.focus()');await key('Tab','Tab',9);
  assert.equal(await run('menuRoot.activeElement===ratio'),true,'Tab reaches Ratio after the native menubar');
  await key(' ','Space',32);
  assert.equal((await snapshot()).mode,'dark');
  await key('Enter','Enter',13);assert.equal((await snapshot()).mode,'light');
  await run('menuRoot.querySelector("[role=menubar]").firstChild.focus()');
  await key('ArrowRight','ArrowRight',39);
  assert.equal(await run('menuRoot.activeElement.textContent'),'编辑','Existing menu arrow navigation is intact');
  await key('ArrowLeft','ArrowLeft',37);
  assert.equal(await run('menuRoot.activeElement.textContent'),'应用');
  for(let i=0;i<5;i++)await run('var n=document.createElement("div");document.body.appendChild(n);n.remove()');
  await delay(40);
  assert.equal(await run('menuRoot.querySelectorAll("[data-orbit-theme-toggle]").length'),1,'Repeated installation does not duplicate buttons');
  await run('window.oldRoot=menuRoot;caption.remove();addCaption()');await delay(60);
  assert.equal(await run('oldRoot.querySelectorAll("[data-orbit-theme-toggle]").length'),0,'Detached caption controls are cleaned up');
  assert.equal(await run('menuRoot.querySelectorAll("[data-orbit-theme-toggle]").length'),1,'Replacement caption receives a toggle');
  await run('window.disposeOrbit()');
  assert.equal(await run('menuRoot.querySelectorAll("[id^=dsh-theme-orbit-]").length'),0,'Unload removes owned caption styles and controls');
  assert.equal(await run('menuRoot.querySelectorAll("button").length'),2);
  await run('menuRoot.querySelector("button").click()');assert.equal(await run('menuClicks'),1);
  await run('window.unsupportedTheme={overrideTokens:orbitPreviewTheme.overrideTokens};orbitModule.factory().apply({effect:f=>window.disposeUnsupported=f(),theme:unsupportedTheme})');
  assert.equal(await run('menuRoot.querySelectorAll("[data-orbit-theme-toggle]").length'),0,'Unsupported hosts omit the control gracefully');
  await run('disposeUnsupported()');
  assert.deepEqual(errors,[]);
  console.log('PASS: Ratio caption layout, native theme API, external changes, artwork and particles, mouse focus/selection, Space/Enter, original menu navigation, duplicate prevention, host replacement, unsupported API and cleanup.');
} finally {await cdp('Page.close');socket.close();}
