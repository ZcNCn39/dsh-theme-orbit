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
  var ctx = null, master = null, noise = null, fireNoise = null, engine = null, opening = null;
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
  function solarMode() { return !!document.body && !document.body.hasAttribute("data-ds-dark-theme"); }
  function burningNoise() {
    if (fireNoise) return fireNoise;
    // Cache a soft rushing bed with short, irregular ember crackles. This is
    // built only on the first solar sound, never during pointer movement.
    fireNoise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    var output = fireNoise.getChannelData(0), input = noise.getChannelData(0);
    for (var i = 0; i < output.length; i++) output[i] = input[i] * 0.48;
    [0.07, 0.19, 0.34, 0.48, 0.63, 0.82, 0.94].forEach(function (time, index) {
      var start = Math.floor(time * ctx.sampleRate);
      var length = Math.floor((0.007 + (index % 3) * 0.004) * ctx.sampleRate);
      for (var j = 0; j < length && start + j < output.length; j++) {
        var envelope = Math.exp(-j / (length * 0.21));
        output[start + j] += input[start + j] * envelope * 0.48;
      }
    });
    return fireNoise;
  }
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
        var solar = solarMode();
        item.bus.gain.setValueAtTime(0, now);
        item.bus.gain.linearRampToValueAtTime(1, now + (solar ? 0.11 : 0.09));
        var source = item.add(ctx.createBufferSource()); source.buffer = solar ? burningNoise() : noise; source.loop = true;
        var filter = item.node(ctx.createBiquadFilter()); filter.type = "lowpass"; filter.frequency.value = 780; filter.Q.value = solar ? 0.55 : 0.65;
        if (solar) { filter.frequency.setValueAtTime(1050, now); filter.frequency.linearRampToValueAtTime(760, now + 0.45); }
        var air = item.node(ctx.createGain()); air.gain.value = solar ? 0.29 : 0.22;
        source.connect(filter); filter.connect(air); air.connect(item.bus);
        var oscillator = item.add(ctx.createOscillator()); oscillator.type = solar ? "triangle" : "sine";
        oscillator.frequency.setValueAtTime(solar ? 82 : 54, now); oscillator.frequency.linearRampToValueAtTime(solar ? 64 : 71, now + 0.3);
        var hum = item.node(ctx.createGain()); hum.gain.value = solar ? 0.045 : 0.075;
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
      item = voice(); var now = ctx.currentTime, solar = solarMode();
      item.bus.gain.setValueAtTime(0, now);
      item.bus.gain.linearRampToValueAtTime(solar ? 0.09 : 0.13, now + 0.012);
      item.bus.gain.exponentialRampToValueAtTime(0.0001, now + (solar ? 0.13 : 0.16));
      var first = item.add(ctx.createOscillator()); first.type = solar ? "triangle" : "sine";
      first.frequency.setValueAtTime(solar ? 540 : 660, now); first.frequency.exponentialRampToValueAtTime(solar ? 405 : 880, now + 0.1);
      first.connect(item.bus); first.onended = item.finish; first.start(now); first.stop(now + (solar ? 0.15 : 0.18));
    } catch (_) { if (item) item.finish(); }
  }
  function meteor() {
    // Only occasional near meteors have an audible pass; never 15 voices.
    if (!ready() || ctx.currentTime - lastMeteor < 12) return;
    lastMeteor = ctx.currentTime;
    var item = null;
    try {
      item = voice(); var now = ctx.currentTime, solar = solarMode();
      item.bus.gain.setValueAtTime(0, now);
      item.bus.gain.linearRampToValueAtTime(solar ? 0.13 : 0.1, now + (solar ? 0.12 : 0.16));
      item.bus.gain.exponentialRampToValueAtTime(0.0001, now + (solar ? 0.84 : 0.72));
      var source = item.add(ctx.createBufferSource()); source.buffer = solar ? burningNoise() : noise;
      var filter = item.node(ctx.createBiquadFilter()); filter.type = solar ? "lowpass" : "bandpass"; filter.Q.value = solar ? 0.65 : 0.8;
      filter.frequency.setValueAtTime(solar ? 1600 : 1900, now); filter.frequency.exponentialRampToValueAtTime(solar ? 260 : 470, now + (solar ? 0.82 : 0.7));
      source.connect(filter);
      if (typeof ctx.createStereoPanner === "function") {
        var pan = item.node(ctx.createStereoPanner()); pan.pan.setValueAtTime(-0.45, now); pan.pan.linearRampToValueAtTime(0.45, now + (solar ? 0.82 : 0.7));
        filter.connect(pan); pan.connect(item.bus);
      } else filter.connect(item.bus);
      if (solar) {
        var ember = item.add(ctx.createOscillator()); ember.type = "sine";
        ember.frequency.setValueAtTime(145, now); ember.frequency.exponentialRampToValueAtTime(62, now + 0.75);
        var bass = item.node(ctx.createGain()); bass.gain.value = 0.22;
        ember.connect(bass); bass.connect(item.bus); ember.start(now); ember.stop(now + 0.88);
      }
      source.onended = item.finish; source.start(now); source.stop(now + (solar ? 0.89 : 0.75));
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
      noise = null; fireNoise = null;
    }
  };
}
