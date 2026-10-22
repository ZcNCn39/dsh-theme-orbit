import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..').replaceAll('\\','/');
const base=process.env.ORBIT_CDP_URL || 'http://127.0.0.1:9447';
const target=await(await fetch(base+'/json/new?about:blank',{method:'PUT'})).json();
const socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>socket.addEventListener('open',r,{once:true}));
let id=0;const pending=new Map(),errors=[];
socket.addEventListener('message',event=>{const m=JSON.parse(event.data);if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(new Error(JSON.stringify(m.error))):p.resolve(m.result);}});
const cdp=(method,params={})=>new Promise((resolve,reject)=>{pending.set(++id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
const run=async expression=>{const r=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
const delay=ms=>run(`new Promise(r=>setTimeout(r,${ms}))`);
const style=(id,property)=>run(`getComputedStyle(document.getElementById('dsh-theme-orbit-${id}')).getPropertyValue(${JSON.stringify(property)})`);
const toggle=async()=>{await run('document.getElementById("scheme").click()');await delay(35);};
try {
  await cdp('Runtime.enable');await cdp('Page.enable');
  await cdp('Emulation.setDeviceMetricsOverride',{width:1536,height:816,deviceScaleFactor:1,mobile:false});
  await cdp('Page.navigate',{url:'file:///'+root+'/docs/preview.html'});
  await run(`new Promise((resolve,reject)=>{const deadline=Date.now()+5000;const check=()=>{if(['astronauts','skeleton','sun'].every(name=>document.getElementById('dsh-theme-orbit-'+name)?.dataset.ready==='true'))resolve();else if(Date.now()>deadline)reject(new Error('Art decoding timed out'));else setTimeout(check,20);};check();})`);
  assert.equal(await style('moon','display'),'block');assert.equal(await style('astronauts','display'),'block');
  assert.equal(await style('sun','display'),'none');assert.equal(await style('skeleton','display'),'none');
  assert.equal(await run('document.querySelectorAll("[data-solar-particle]").length'),0,'Night mode must not allocate solar particle pools');
  await run(`window.artSnapshots={};for(const name of ['moon','astronauts','sun','skeleton'])artSnapshots[name]=document.getElementById('dsh-theme-orbit-'+name).toDataURL();
    window.starAlpha=()=>{const canvas=document.getElementById('dsh-theme-orbit-stars'),data=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;let sum=0;for(let i=3;i<data.length;i+=4)sum+=data[i];return sum;};window.darkStarAlpha=starAlpha();`);
  await toggle();
  assert.equal(await style('moon','display'),'none');assert.equal(await style('astronauts','display'),'none');
  assert.equal(await style('sun','display'),'block');assert.equal(await style('skeleton','display'),'block');
  await run(`window.solarFX=()=>({corona:document.querySelectorAll('#dsh-theme-orbit-sun-particles > span').length,embers:document.querySelectorAll('#dsh-theme-orbit-skeleton-embers > span').length,animations:Array.from(document.querySelectorAll('[data-solar-particle]')).reduce((sum,node)=>sum+node.getAnimations().length,0)});window.solarNodes=Array.from(document.querySelectorAll('[data-solar-particle]'));`);
  assert.deepEqual(await run('solarFX()'),{corona:16,embers:18,animations:34});
  for(const name of ['sun-particles','skeleton-embers']){assert.equal(await style(name,'z-index'),'-1');assert.equal(await style(name,'pointer-events'),'none');}
  assert.equal(await run(`(()=>{const art=document.getElementById('dsh-theme-orbit-sun').getBoundingClientRect(),fx=document.getElementById('dsh-theme-orbit-sun-particles').getBoundingClientRect();return Math.abs(art.x-fx.x)<.1&&Math.abs(art.y-fx.y)<.1&&Math.abs(art.width-fx.width)<.1&&Math.abs(art.height-fx.height)<.1;})()`),true,'Corona follows the solar disk bounds');
  assert.ok(await run('starAlpha()>darkStarAlpha*1.5'),'Light stars must be visibly stronger than the muted night field');
  for(const name of ['sun','skeleton']){
    assert.equal(await style(name,'z-index'),'-1');assert.equal(await style(name,'pointer-events'),'none');
    assert.equal(await run(`document.getElementById('dsh-theme-orbit-${name}').getContext('2d').getImageData(0,0,1,1).data[3]`),0,'Transparent artwork has no rectangular background');
  }
  const sun=await run('Array.from(document.getElementById("dsh-theme-orbit-sun").getContext("2d").getImageData(256,256,1,1).data)');
  assert.ok(sun[0]>sun[1]&&sun[1]>sun[2]&&sun[3]>240,'Sun must contain opaque, warm-colored solar detail');
  const transparency=await run(`(()=>{const s=getComputedStyle(document.body);const a=value=>Number(value.slice(value.lastIndexOf(',')+1,value.lastIndexOf(')')));return (1-a(s.getPropertyValue('--dsw-alias-bg-base')))*(1-a(s.getPropertyValue('--dsw-specific-sidebar-fill')));})()`);
  assert.ok(transparency>0.6,'App surfaces must let the artwork show through');
  assert.equal(await style('astronauts','width'),await style('skeleton','width'));
  assert.equal(await style('astronauts','bottom'),await style('skeleton','bottom'));
  await run(`window.footerRow=document.createElement('div');footerRow.setAttribute('data-row-key','session:solar-test');footerRow.style.cssText='position:fixed;left:20px;top:690px;width:230px;height:30px;z-index:20';footerRow.textContent='Session';document.querySelector('aside').appendChild(footerRow)`);await delay(40);
  assert.equal(await style('skeleton','visibility'),'hidden');
  assert.equal(await run('solarFX().animations'),16,'Crowded sidebar must stop ember animations');
  await run('footerRow.remove()');await delay(40);assert.equal(await style('skeleton','visibility'),'visible');
  assert.equal(await run('solarFX().animations'),34);
  await run('Object.defineProperty(document,"hidden",{configurable:true,value:true});document.dispatchEvent(new Event("visibilitychange"))');
  assert.equal(await run('solarFX().animations'),0,'Hidden window stops every particle animation');
  await run('delete document.hidden;document.dispatchEvent(new Event("visibilitychange"))');
  assert.equal(await run('solarFX().animations'),34);
  await cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await delay(35);
  assert.equal(await style('skeleton','animation-name'),'none');
  assert.equal(await run('solarFX().animations'),0);
  await cdp('Emulation.setEmulatedMedia',{features:[]});
  await delay(35);
  for(let i=0;i<8;i++){await toggle();assert.equal(await run('solarFX().animations'),i%2===0?0:34);}
  assert.equal(await run('solarNodes.length===34&&solarNodes.every(node=>node.isConnected)&&document.querySelectorAll("[data-solar-particle]").length===34'),true,'Repeated toggles reuse the same bounded particle nodes');
  assert.equal(await run(`Object.entries(artSnapshots).every(([name,data])=>document.getElementById('dsh-theme-orbit-'+name).toDataURL()===data)`),true,'Theme toggles reuse the decoded artwork');
  await cdp('Emulation.setDeviceMetricsOverride',{width:800,height:816,deviceScaleFactor:1,mobile:false});await delay(120);
  assert.equal(await style('skeleton','display'),'none');
  assert.equal(await run('solarFX().animations'),16,'Narrow viewport keeps the Sun pool only');
  await run('window.disposeOrbit()');
  assert.equal(await run('document.querySelectorAll("[id^=dsh-theme-orbit-]").length'),0);
  assert.deepEqual(errors,[]);
  console.log('PASS: solar artwork and bounded 16+18 particle pools, matching bounds, sidebar avoidance, hidden/night/reduced-motion cancellation, node reuse, narrow viewport and cleanup; no browser exceptions.');
} finally {await cdp('Page.close');socket.close();}
