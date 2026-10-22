import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..').replaceAll('\\','/');
const base=process.env.ORBIT_CDP_URL || 'http://127.0.0.1:9447';
const target=await(await fetch(base+'/json/new?about:blank',{method:'PUT'})).json();
const socket=new WebSocket(target.webSocketDebuggerUrl);
await new Promise(r=>socket.addEventListener('open',r,{once:true}));
let id=0;const pending=new Map(),issues=[];
socket.addEventListener('message',event=>{
  const message=JSON.parse(event.data);
  if(message.method==='Audits.issueAdded')issues.push(message.params.issue);
  if(message.id){const p=pending.get(message.id);pending.delete(message.id);message.error?p.reject(new Error(JSON.stringify(message.error))):p.resolve(message.result);}
});
const cdp=(method,params={})=>new Promise((resolve,reject)=>{pending.set(++id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
const run=async expression=>{const result=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw new Error(JSON.stringify(result.exceptionDetails));return result.result.value;};
const delay=ms=>run(`new Promise(r=>setTimeout(r,${ms}))`);
const mouse=(type,x,y,extra={})=>cdp('Input.dispatchMouseEvent',{type,x,y,...extra});
try {
  await cdp('Page.enable');await cdp('Audits.enable');
  for(const scale of [1,1.25,2]){
    await cdp('Emulation.setDeviceMetricsOverride',{width:1600,height:1000,deviceScaleFactor:scale,mobile:false});
    await cdp('Page.navigate',{url:'file:///'+root+'/docs/preview.html'});
    await run('new Promise(r=>document.readyState==="complete"?r():window.addEventListener("load",r,{once:true}))');
    // Same structure as DSH TurnNavigator: pointer-enabled nav inside a
    // pointer-transparent slot, scrollable marks and ::before tick graphics.
    await run(`(()=>{
      const style=document.createElement('style');
      style.textContent='.test-slot{position:fixed;inset:150px 0 auto;pointer-events:none;z-index:50}.test-rail{position:absolute;top:0;right:12px;width:28px;cursor:pointer;pointer-events:auto}.test-scroll{height:120px;overflow-y:auto;scrollbar-width:none;overscroll-behavior:contain}.test-marks{position:relative;height:320px}.test-mark{position:absolute;left:0;right:0;height:10px;padding:0;border:0;background:none;cursor:pointer}.test-mark::before{content:"";position:absolute;right:0;top:50%;width:20px;height:2px;background:white}.test-preview{position:absolute;right:40px;top:0;pointer-events:none}';
      document.head.appendChild(style);
      const slot=document.createElement('div');slot.className='test-slot';
      slot.innerHTML='<nav class="test-rail" aria-label="Conversation turns"><div class="test-scroll"><div class="test-marks"></div></div><div class="test-preview" role="tooltip"></div></nav>';
      window.testClicks=0;const marks=slot.querySelector('.test-marks');
      for(let i=0;i<32;i++){const mark=document.createElement('button');mark.className='test-mark';mark.style.top=i*10+'px';mark.setAttribute('aria-label','Jump to turn '+i);mark.onpointermove=()=>slot.querySelector('[role=tooltip]').textContent='Turn '+i;mark.onclick=()=>window.testClicks++;marks.appendChild(mark);}
      document.body.appendChild(slot);
    })()`);
    await mouse('mouseMoved',1587,185);await delay(80);
    assert.equal(await run('document.elementFromPoint(1587,185).className'),'test-mark');
    assert.equal(await run('document.body.getAttribute("data-orbit-rocket-cursor")'),'rocket');
    const dimensions=await run(`(async()=>{const cursor=getComputedStyle(document.elementFromPoint(1587,185)).cursor;const image=new Image();image.src=cursor.match(/^url\\("([^\"]+)"\\)/)[1];await image.decode();return {width:image.naturalWidth,height:image.naturalHeight};})()`);
    console.log('Cursor dimensions at device scale '+scale+':',dimensions);
    await mouse('mousePressed',1587,185,{button:'left',buttons:1,clickCount:1});await delay(50);
    assert.equal(await run('document.body.hasAttribute("data-orbit-boosting")'),true);
    await mouse('mouseReleased',1587,185,{button:'left',clickCount:1});
    assert.equal(await run('window.testClicks'),1);
    assert.match(await run('document.querySelector(".test-preview").textContent'),/^Turn /);
    await mouse('mouseWheel',1587,185,{deltaX:0,deltaY:90});await delay(150);
    assert.ok(await run('document.querySelector(".test-scroll").scrollTop')>0);
    for(const [x,y]of [[1599,185],[1599,999],[1,1],[800,400],[1587,205]]){await mouse('mouseMoved',x,y);await delay(55);}
    assert.ok(dimensions.width<=32&&dimensions.height<=32,'Custom cursors above 32 DIP fall back near viewport edges');
  }
  const edgeIssues=issues.filter(issue=>JSON.stringify(issue).includes('CustomCursorIntersectsViewport'));
  console.log('Chromium cursor boundary issues:',edgeIssues.length);
  assert.equal(edgeIssues.length,0);
  console.log('PASS: turn tick hover, preview, click/boost, wheel scrolling and viewport edges at 100/125/200% display scale.');
} finally {
  await cdp('Page.close');socket.close();
}
