import fs from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..').replaceAll('\\','/');
const base=process.env.ORBIT_CDP_URL || 'http://127.0.0.1:9447';
const target=await(await fetch(base+'/json/new?about:blank',{method:'PUT'})).json();
const socket=new WebSocket(target.webSocketDebuggerUrl);
await new Promise(r=>socket.addEventListener('open',r,{once:true}));
let id=0;const pending=new Map(),errors=[];
socket.addEventListener('message',event=>{
  const message=JSON.parse(event.data);
  if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails);
  if(message.id){const p=pending.get(message.id);pending.delete(message.id);message.error?p.reject(new Error(JSON.stringify(message.error))):p.resolve(message.result);}
});
const cdp=(method,params={})=>new Promise((resolve,reject)=>{pending.set(++id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
const run=async expression=>{const result=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw new Error(JSON.stringify(result.exceptionDetails));return result.result.value;};
const delay=ms=>run(`new Promise(r=>setTimeout(r,${ms}))`);
const mouse=(type,x,y,extra={})=>cdp('Input.dispatchMouseEvent',{type,x,y,...extra});
const axes={'col-resize':0,'ew-resize':0,'e-resize':0,'w-resize':0,'row-resize':90,'ns-resize':90,'n-resize':90,'s-resize':90,'nwse-resize':45,'nw-resize':45,'se-resize':45,'nesw-resize':-45,'ne-resize':-45,'sw-resize':-45};
try {
  await cdp('Page.enable');await cdp('Runtime.enable');
  for(const scale of [1,1.25,2]){
    await cdp('Emulation.setDeviceMetricsOverride',{width:1536,height:816,deviceScaleFactor:scale,mobile:false});
    await cdp('Page.navigate',{url:'file:///'+root+'/docs/preview.html'});
    await cdp('Page.bringToFront');
    await cdp('Emulation.setFocusEmulationEnabled',{enabled:true});
    await run('new Promise(r=>document.readyState==="complete"?r():window.addEventListener("load",r,{once:true}))');
    await run(`(()=>{
      const box=document.createElement('div');box.id='resize-fixture';
      box.style.cssText='position:fixed;left:500px;top:100px;width:320px;height:100px;background:#17263f;z-index:50';
      box.innerHTML='<div id="resize-handle" style="position:absolute;right:0;top:0;bottom:0;width:10px;cursor:col-resize;touch-action:none;background:#8fb3eb"></div>';
      const handle=box.firstChild;let origin;window.dragEvents=[];
      handle.onpointerdown=e=>{e.preventDefault();origin={x:e.clientX,width:box.offsetWidth};handle.setPointerCapture(e.pointerId);};
      handle.onpointermove=e=>{if(origin){box.style.width=origin.width+e.clientX-origin.x+'px';dragEvents.push({x:e.clientX,origin,width:box.style.width});}};
      handle.onpointerup=()=>origin=null;document.body.appendChild(box);
      window.resizeSamples=[];
    })()`);
    for(const dark of [true,false]){
      await run(`document.body.toggleAttribute('data-ds-dark-theme',${dark});syncScheme()`);
      for(const [native,angle]of Object.entries(axes)){
        // Leave the target so the next entry samples the actual host cursor.
        await mouse('mouseMoved',1100,400);await delay(22);
        await run(`document.getElementById('resize-handle').style.cursor=${JSON.stringify(native)}`);
        await mouse('mouseMoved',815,140);await delay(35);
        assert.equal(await run('document.body.getAttribute("data-orbit-rocket-cursor")'),native);
        const sample=await run(`(async()=>{const cursor=getComputedStyle(document.getElementById('resize-handle')).cursor;const src=cursor.match(/^url\\("([^\"]+)"\\)/)[1];const image=new Image();image.src=src;await image.decode();return {cursor,svg:decodeURIComponent(src.split(',').slice(1).join(',')),width:image.naturalWidth,height:image.naturalHeight,src};})()`);
        assert.ok(sample.cursor.endsWith('16 16, '+native));assert.equal(sample.width,32);assert.equal(sample.height,32);
        assert.ok(sample.svg.includes('rotate('+angle+' 16 16)'));
        if(scale===1&&dark&&['col-resize','row-resize','nwse-resize','nesw-resize'].includes(native))await run(`resizeSamples.push(${JSON.stringify({native,src:sample.src})})`);
      }
    }
    await mouse('mouseMoved',1100,400);await delay(25);
    await run('document.getElementById("resize-handle").style.cursor="col-resize"');
    await mouse('mouseMoved',815,140);await delay(35);
    await mouse('mousePressed',815,140,{button:'left',buttons:1,clickCount:1});
    await delay(30);
    assert.equal(await run('document.getElementById("resize-handle").hasPointerCapture(1)'),true);
    await mouse('mouseMoved',816,140,{button:'left',buttons:1});await delay(25);
    await mouse('mouseMoved',895,140,{button:'left',buttons:1});await delay(55);
    assert.equal(await run('document.getElementById("resize-fixture").offsetWidth'),400,JSON.stringify(await run('dragEvents')));
    assert.equal(await run('document.body.getAttribute("data-orbit-rocket-cursor")'),'col-resize');
    assert.equal(await run('document.body.hasAttribute("data-orbit-boosting")'),false);
    await mouse('mouseReleased',895,140,{button:'left',clickCount:1});
    await mouse('mouseMoved',1100,400);await delay(35);assert.equal(await run('document.body.getAttribute("data-orbit-rocket-cursor")'),'rocket');
    // Disabled and move feedback retain their native meaning.
    for(const native of ['not-allowed','move']){
      await run(`document.getElementById('resize-handle').style.cursor=${JSON.stringify(native)}`);
      await mouse('mouseMoved',895,140);await delay(35);
      assert.equal(await run('document.body.getAttribute("data-orbit-rocket-cursor")'),null);
      assert.equal(await run('getComputedStyle(document.getElementById("resize-handle")).cursor'),native);
      await mouse('mouseMoved',1100,400);await delay(25);
    }
    if(scale===1){
      await run(`(()=>{document.body.toggleAttribute('data-ds-dark-theme',true);syncScheme();const gallery=document.createElement('div');gallery.id='resize-gallery';gallery.style.cssText='position:fixed;left:400px;top:260px;display:flex;gap:24px;padding:24px;background:#080e1d;z-index:100;color:#eaf4ff';resizeSamples.forEach(sample=>{const figure=document.createElement('div');figure.style.textAlign='center';figure.innerHTML='<img width="32" height="32" src="'+sample.src+'"><div>'+sample.native+'</div>';gallery.appendChild(figure);});document.body.appendChild(gallery);})()`);
      await delay(50);fs.mkdirSync(root+'/.test-output',{recursive:true});
      const clip=await run('(()=>{const r=document.getElementById("resize-gallery").getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,scale:2};})()');
      fs.writeFileSync(root+'/.test-output/resize-cursors.png',Buffer.from((await cdp('Page.captureScreenshot',{format:'png',clip})).data,'base64'));
    }
    await run('window.disposeOrbit()');
    assert.equal(await run('getComputedStyle(document.getElementById("resize-handle")).cursor'),'move');
  }
  assert.deepEqual(errors,[]);
  console.log('PASS: 14 resize cursor names / 4 orbital directions, light+dark at 100/125/200% display scale, centered hotspots, real captured drag, no resize exhaust, native special feedback, cleanup.');
} finally {
  await cdp('Page.close');socket.close();
}
