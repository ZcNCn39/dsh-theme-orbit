import fs from 'node:fs';
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
const mouse=(type,x,y,extra={})=>cdp('Input.dispatchMouseEvent',{type,x,y,...extra});
const click=async(x,y)=>{await mouse('mouseMoved',x,y);await delay(25);await mouse('mousePressed',x,y,{button:'left',buttons:1,clickCount:1});await mouse('mouseReleased',x,y,{button:'left',clickCount:1});await delay(60);};
const sources=()=>run('audioSources.length');
const icon=()=>run('(()=>{const r=document.querySelector("#dsh-theme-orbit-sound button").getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()');
try {
  await cdp('Runtime.enable');await cdp('Page.enable');
  await cdp('Emulation.setDeviceMetricsOverride',{width:1536,height:816,deviceScaleFactor:1,mobile:false});
  await cdp('Page.addScriptToEvaluateOnNewDocument',{source:`
    window.audioContexts=[];window.audioSources=[];window.audioGains=[];window.audioFilters=[];window.audioBuffers=[];
    const trace=param=>{const events=[];for(const method of ['setValueAtTime','linearRampToValueAtTime','exponentialRampToValueAtTime']){const native=param[method].bind(param);param[method]=(...args)=>{events.push([method,args[0]]);return native(...args);};}return events;};
    const Native=window.AudioContext;
    window.AudioContext=class extends Native {
      constructor(...args){super(...args);audioContexts.push(this);}
      createGain(){const node=super.createGain();audioGains.push(node);return node;}
      createOscillator(){const node=super.createOscillator();node.frequencyEvents=trace(node.frequency);return this.track(node);}
      createBiquadFilter(){const node=super.createBiquadFilter();node.frequencyEvents=trace(node.frequency);audioFilters.push(node);return node;}
      createBuffer(...args){const buffer=super.createBuffer(...args);audioBuffers.push(buffer);return buffer;}
      createBufferSource(){return this.track(super.createBufferSource());}
      track(node){const record={node,started:false,stopped:false};audioSources.push(record);const start=node.start.bind(node),stop=node.stop.bind(node);node.start=(...args)=>{record.started=true;return start(...args);};node.stop=(...args)=>{record.stopped=true;return stop(...args);};return node;}
    };`});
  const navigate=async()=>{await cdp('Page.navigate',{url:'file:///'+root+'/docs/preview.html'});await run('new Promise(r=>document.readyState==="complete"?r():window.addEventListener("load",r,{once:true}))');await delay(90);};
  await navigate();
  await run('localStorage.removeItem("dsh-theme-orbit:audio:v1")');await navigate();
  assert.equal(await run('audioContexts.length'),0,'No audio graph or autoplay at mount');
  assert.equal(await run('document.querySelector("#dsh-theme-orbit-sound input").value'),'18');
  await mouse('mouseMoved',1100,420);await delay(120);assert.equal(await sources(),0,'Hover must be silent');
  await mouse('mousePressed',1100,420,{button:'left',buttons:1});await delay(140);
  assert.equal(await run('audioContexts.length'),1);assert.equal(await run('audioContexts[0].state'),'running');
  assert.equal(await sources(),2,'One filtered-noise + bass thrust graph');
  assert.equal(await run('audioSources.every(s=>s.started)'),true);
  assert.ok(Math.abs(await run('audioGains[0].gain.value')-0.081)<0.001);
  const rms=await run(`(async()=>{const analyser=audioContexts[0].createAnalyser();analyser.fftSize=2048;audioGains[0].connect(analyser);await new Promise(r=>setTimeout(r,70));const data=new Float32Array(2048);analyser.getFloatTimeDomainData(data);audioGains[0].disconnect(analyser);return Math.sqrt(data.reduce((s,x)=>s+x*x,0)/data.length);})()`);
  assert.ok(rms>0.0001&&rms<0.1,'Thrust must produce quiet, nonzero audio');
  await mouse('mouseMoved',1200,420,{button:'left',buttons:1});await delay(40);
  assert.equal(await sources(),2,'Mouse motion must not allocate audio voices');
  await mouse('mouseReleased',1200,420,{button:'left'});await delay(130);
  assert.equal(await run('audioSources.every(s=>s.stopped)'),true,'Release stops both engine sources');
  // Input and typing unlock playback but never create a typing / thrust sound.
  const input=await run('(()=>{const r=document.querySelector("textarea").getBoundingClientRect();return {x:r.x+30,y:r.y+20};})()');
  await click(input.x,input.y);await cdp('Input.insertText',{text:'Quiet typing'});await delay(80);
  assert.equal(await sources(),2);
  // A normal UI button gets one short confirmation tone.
  await run('window.uiButton=document.createElement("button");uiButton.textContent="Open panel";uiButton.style.cssText="position:fixed;left:450px;top:80px;z-index:500;cursor:pointer";uiButton.onclick=()=>window.uiClicked=true;document.body.appendChild(uiButton)');
  const ui=await run('(()=>{const r=uiButton.getBoundingClientRect();return {x:r.x+10,y:r.y+10};})()');
  const before=await sources();await click(ui.x,ui.y);await delay(190);
  assert.equal(await run('uiClicked'),true);
  assert.ok(await sources()>before,'UI action produces a tone');
  // The audio button must mute without launching a rocket or playing itself.
  let button=await icon();await click(button.x,button.y);
  assert.equal(await run('document.body.hasAttribute("data-orbit-boosting")'),false);
  assert.equal(await run('document.querySelector("#dsh-theme-orbit-sound button").getAttribute("aria-pressed")'),'false');
  const mutedCount=await sources();await click(1100,420);await delay(100);assert.equal(await sources(),mutedCount);
  assert.equal(await run('JSON.parse(localStorage.getItem("dsh-theme-orbit:audio:v1")).muted'),true);
  await navigate();assert.equal(await run('audioContexts.length'),0);
  assert.equal(await run('document.querySelector("#dsh-theme-orbit-sound button").getAttribute("aria-pressed")'),'false');
  button=await icon();await click(button.x,button.y);assert.equal(await run('audioContexts[0].state'),'running');
  // Volume persists; zero volume silences and suspends the graph.
  await run('var slider=document.querySelector("#dsh-theme-orbit-sound input");slider.value="37";slider.dispatchEvent(new Event("input",{bubbles:true}))');await delay(120);
  assert.ok(Math.abs(await run('audioGains[0].gain.value')-0.1665)<0.002);
  assert.equal(await run('JSON.parse(localStorage.getItem("dsh-theme-orbit:audio:v1")).volume'),0.37);
  await run('var slider=document.querySelector("#dsh-theme-orbit-sound input");slider.value="0";slider.dispatchEvent(new Event("input",{bubbles:true}))');await delay(50);
  assert.equal(await run('audioContexts[0].state'),'suspended');
  button=await icon();await click(button.x,button.y);await delay(100);
  // Rapid press/release and focus loss cannot leave a late launch or a drone.
  await mouse('mouseMoved',1100,420);await delay(30);await mouse('mousePressed',1100,420,{button:'left',buttons:1});
  await mouse('mouseReleased',1100,420,{button:'left'});await delay(150);
  assert.equal(await run('audioSources.every(s=>s.stopped)'),true);
  await mouse('mousePressed',1100,420,{button:'left',buttons:1});await delay(60);
  await run('window.dispatchEvent(new Event("blur"))');await delay(80);
  assert.equal(await run('audioContexts[0].state'),'suspended');assert.equal(await run('audioSources.every(s=>s.stopped)'),true);
  await mouse('mouseReleased',1100,420,{button:'left'});
  await run('window.disposeOrbit()');await delay(60);
  assert.equal(await run('audioContexts[0].state'),'closed');assert.equal(await run('document.getElementById("dsh-theme-orbit-sound")'),null);
  // Exercise rare meteor timing and a deliberately delayed resume directly,
  // using the maintained engine and real audio nodes, not random meteors.
  await run(fs.readFileSync(root+'/tools/soundscape.js','utf8')+';window.engineTest=createOrbitSoundscape();');
  assert.equal(await run('engineTest.unlock()'),true);
  const count=await sources();await run('engineTest.meteor();for(var i=0;i<40;i++)engineTest.meteor()');
  assert.equal(await sources(),count+1,'Meteor voices have a 12-second cooldown');
  await run('engineTest.click();for(var i=0;i<40;i++)engineTest.click()');assert.equal(await sources(),count+2,'UI tones are rate limited');
  await run('engineTest.silence()');await delay(40);
  assert.equal(await run('audioSources.every(s=>s.stopped)'),true);
  const late=await sources();
  await run('var context=audioContexts[audioContexts.length-1];var resume=context.resume.bind(context);context.resume=()=>new Promise(resolve=>window.finishResume=()=>resume().then(resolve));engineTest.startThrust();engineTest.stopThrust()');
  await run('finishResume()');await delay(40);assert.equal(await sources(),late,'A released click cannot start audio after a late resume');
  await run('engineTest.dispose()');await delay(35);
  assert.equal(await run('audioContexts.every(c=>c.state==="closed")'),true);
  // Both palettes use real Web Audio nodes. The dark values below are the
  // original 0.3.0 sound parameters, including the unchanged noise buffer.
  for(const solar of [true,false]){
    await run(`document.body.toggleAttribute('data-ds-dark-theme',${!solar});window.paletteEngine=createOrbitSoundscape();window.paletteBufferStart=audioBuffers.length;`);
    assert.equal(await run('paletteEngine.unlock()'),true);
    await run('window.paletteStart=audioSources.length;paletteEngine.startThrust()');await delay(35);
    const thrust=await run(`({count:audioSources.length-paletteStart,type:audioSources[paletteStart+1].node.type,frequency:audioSources[paletteStart+1].node.frequencyEvents,filter:audioFilters[audioFilters.length-1].type,cutoff:audioFilters[audioFilters.length-1].frequency.value,originalNoise:audioSources[paletteStart].node.buffer===audioBuffers[paletteBufferStart],buffers:audioBuffers.length-paletteBufferStart})`);
    assert.equal(thrust.count,2);assert.equal(thrust.type,solar?'triangle':'sine');
    assert.deepEqual(thrust.frequency,[['setValueAtTime',solar?82:54],['linearRampToValueAtTime',solar?64:71]]);
    assert.equal(thrust.filter,'lowpass');assert.equal(thrust.originalNoise,!solar);assert.equal(thrust.buffers,solar?2:1);
    if(!solar)assert.equal(thrust.cutoff,780);
    await run('paletteEngine.stopThrust()');await delay(130);
    if(solar){
      await run('document.body.setAttribute("data-ds-dark-theme","");window.paletteStart=audioSources.length;paletteEngine.startThrust()');await delay(30);
      assert.deepEqual(await run('audioSources[paletteStart+1].node.frequencyEvents'),[['setValueAtTime',54],['linearRampToValueAtTime',71]]);
      await run('paletteEngine.stopThrust();document.body.removeAttribute("data-ds-dark-theme")');await delay(130);
    }
    await run('window.paletteStart=audioSources.length;paletteEngine.click()');
    assert.deepEqual(await run('audioSources[paletteStart].node.frequencyEvents'),[['setValueAtTime',solar?540:660],['exponentialRampToValueAtTime',solar?405:880]]);
    await run('window.paletteStart=audioSources.length;paletteEngine.meteor()');
    const meteor=await run(`({count:audioSources.length-paletteStart,type:audioFilters[audioFilters.length-1].type,frequency:audioFilters[audioFilters.length-1].frequencyEvents})`);
    assert.equal(meteor.count,solar?2:1);assert.equal(meteor.type,solar?'lowpass':'bandpass');
    assert.deepEqual(meteor.frequency,[['setValueAtTime',solar?1600:1900],['exponentialRampToValueAtTime',solar?260:470]]);
    await run('paletteEngine.dispose()');await delay(35);
  }
  assert.equal(await run('audioSources.every(s=>s.stopped)'),true);
  assert.equal(await run('audioContexts.every(c=>c.state==="closed")'),true);
  await run('window.AudioContext=undefined;window.webkitAudioContext=undefined;Object.defineProperty(window,"localStorage",{configurable:true,get(){throw new Error("Storage unavailable")}});window.unsupported=createOrbitSoundscape();unsupported.startThrust();unsupported.setMuted(true);unsupported.setVolume(0.5);unsupported.dispose()');
  assert.equal(await run('unsupported.settings().supported'),false);
  assert.deepEqual(errors,[]);
  console.log('PASS: original dark audio parameters/noise; solar fire/ember/meteor palettes; live palette switching; real audio, silent typing, cooldowns, mute/volume persistence, late resume, blur, disposal and unavailable audio/storage. RMS:',rms);
} finally {
  await cdp('Page.close');socket.close();
}
