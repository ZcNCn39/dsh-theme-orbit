// Original, locally synthesized sound effects. No audio downloads or per-move work.
function createOrbitSoundscape() {
  var KEY = "dsh-theme-orbit:audio:v1";
  var prefs = { muted:false, volume:0.18 };
  try {
    var saved = JSON.parse(window.localStorage.getItem(KEY) || "null");
    if (saved && typeof saved.muted === "boolean") prefs.muted = saved.muted;
    if (saved && typeof saved.volume === "number" && Number.isFinite(saved.volume)) prefs.volume = Math.max(0, Math.min(1, saved.volume));
  } catch (_) { /* Storage may be unavailable in embedded browsers. */ }
  var Context = window.AudioContext || window.webkitAudioContext;
  var ctx = null, master = null, noise = null, engine = null, opening = null;
  var wanted = false, disposed = false, lastClick = -Infinity, lastMeteor = -Infinity;
  var voices = new Set();
  function allowed() { return !disposed && !prefs.muted && prefs.volume > 0 && !document.hidden; }
  function save() {
    try { window.localStorage.setItem(KEY, JSON.stringify(prefs)); } catch (_) {}
  }
  function unlock() {
    if (!allowed() || !Context) return Promise.resolve(false);
    try {
      if (!ctx) {
        ctx = new Context({ latencyHint:"interactive" });
        master = ctx.createGain();
        master.gain.value = prefs.volume * 0.45;
        master.connect(ctx.destination);
        noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
        var samples = noise.getChannelData(0);
        for (var i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
      }
      if (ctx.state === "running") return Promise.resolve(true);
      if (ctx.state === "closed") return Promise.resolve(false);
      if (!opening) opening = ctx.resume().then(function () { opening = null; return !disposed && ctx.state === "running"; }, function () { opening = null; return false; });
      return opening;
    } catch (_) { return Promise.resolve(false); }
  }
  function ready() { return allowed() && ctx && ctx.state === "running" && voices.size < 6; }
  function voice() {
    var sources = [], nodes = [], cleaned = false;
    var bus = ctx.createGain(); nodes.push(bus); bus.connect(master);
    var item = {
      bus:bus,
      add:function (source) { sources.push(source); return source; },
      node:function (node) { nodes.push(node); return node; },
      finish:function () {
        if (cleaned) return;
        cleaned = true; voices.delete(item);
        sources.forEach(function (source) { try { source.stop(); } catch (_) {} source.disconnect(); });
        nodes.forEach(function (node) { node.disconnect(); });
        if (engine === item) engine = null;
      },
      release:function () {
        var now = ctx.currentTime;
        bus.gain.cancelScheduledValues(now);
        bus.gain.setTargetAtTime(0, now, 0.018);
        sources.forEach(function (source) { try { source.stop(now + 0.09); } catch (_) {} });
      }
    };
    voices.add(item);
    return item;
  }
  function startThrust() {
    wanted = true;
    // Resume is requested in the pointer gesture; a late resolve must not play
    // a delayed launch after the button was released, muted or window hidden.
    unlock().then(function (ok) {
      if (!ok || !wanted || !ready() || engine) return;
      try {
        var item = voice(); engine = item;
        var now = ctx.currentTime;
        item.bus.gain.setValueAtTime(0, now);
        item.bus.gain.linearRampToValueAtTime(1, now + 0.09);
        var source = item.add(ctx.createBufferSource()); source.buffer = noise; source.loop = true;
        var filter = item.node(ctx.createBiquadFilter()); filter.type = "lowpass"; filter.frequency.value = 780; filter.Q.value = 0.65;
        var air = item.node(ctx.createGain()); air.gain.value = 0.22;
        source.connect(filter); filter.connect(air); air.connect(item.bus);
        var oscillator = item.add(ctx.createOscillator()); oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(54, now); oscillator.frequency.linearRampToValueAtTime(71, now + 0.3);
        var hum = item.node(ctx.createGain()); hum.gain.value = 0.075;
        oscillator.connect(hum); hum.connect(item.bus);
        source.onended = item.finish;
        source.start(); oscillator.start();
      } catch (_) { if (engine) engine.finish(); }
    });
  }
  function stopThrust() { wanted = false; if (engine) { var item = engine; engine = null; item.release(); } }
  function click() {
    if (!ready() || ctx.currentTime - lastClick < 0.12) return;
    lastClick = ctx.currentTime;
    var item = null;
    try {
      item = voice(); var now = ctx.currentTime;
      item.bus.gain.setValueAtTime(0, now);
      item.bus.gain.linearRampToValueAtTime(0.13, now + 0.012);
      item.bus.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
      var first = item.add(ctx.createOscillator()); first.type = "sine";
      first.frequency.setValueAtTime(660, now); first.frequency.exponentialRampToValueAtTime(880, now + 0.1);
      first.connect(item.bus); first.onended = item.finish; first.start(now); first.stop(now + 0.18);
    } catch (_) { if (item) item.finish(); }
  }
  function meteor() {
    // Only occasional near meteors have an audible pass; never 15 voices.
    if (!ready() || ctx.currentTime - lastMeteor < 12) return;
    lastMeteor = ctx.currentTime;
    var item = null;
    try {
      item = voice(); var now = ctx.currentTime;
      item.bus.gain.setValueAtTime(0, now);
      item.bus.gain.linearRampToValueAtTime(0.1, now + 0.16);
      item.bus.gain.exponentialRampToValueAtTime(0.0001, now + 0.72);
      var source = item.add(ctx.createBufferSource()); source.buffer = noise;
      var filter = item.node(ctx.createBiquadFilter()); filter.type = "bandpass"; filter.Q.value = 0.8;
      filter.frequency.setValueAtTime(1900, now); filter.frequency.exponentialRampToValueAtTime(470, now + 0.7);
      source.connect(filter);
      if (typeof ctx.createStereoPanner === "function") {
        var pan = item.node(ctx.createStereoPanner()); pan.pan.setValueAtTime(-0.45, now); pan.pan.linearRampToValueAtTime(0.45, now + 0.7);
        filter.connect(pan); pan.connect(item.bus);
      } else filter.connect(item.bus);
      source.onended = item.finish; source.start(now); source.stop(now + 0.75);
    } catch (_) { if (item) item.finish(); }
  }
  function silence() {
    wanted = false;
    Array.from(voices).forEach(function (item) { item.finish(); });
    engine = null;
    if (ctx && ctx.state === "running") ctx.suspend().catch(function () {});
  }
  return {
    unlock:unlock, startThrust:startThrust, stopThrust:stopThrust, click:click, meteor:meteor, silence:silence,
    settings:function () { return { muted:prefs.muted, volume:prefs.volume, supported:!!Context }; },
    setMuted:function (muted) { prefs.muted = !!muted; save(); if (prefs.muted) silence(); },
    setVolume:function (volume) {
      prefs.volume = Math.max(0, Math.min(1, Number(volume) || 0)); save();
      if (master && ctx.state !== "closed") master.gain.setTargetAtTime(prefs.volume * 0.45, ctx.currentTime, 0.025);
      if (!prefs.volume) silence();
    },
    dispose:function () {
      if (disposed) return; disposed = true; silence();
      if (ctx && ctx.state !== "closed") ctx.close().catch(function () {});
      noise = null;
    }
  };
}
