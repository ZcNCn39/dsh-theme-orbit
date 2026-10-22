window.__ModuleLoader__.load({
  id: "dsh-theme-orbit",
  factory: () => {
    var SOURCE = "dsh-theme-orbit";
    var STYLE_ID = SOURCE + "-style";
    var LAYER_ID = SOURCE + "-layer";
    var MOON_ID = SOURCE + "-moon";
    var SUN_ID = SOURCE + "-sun";
    var SUN_DUST_ID = SOURCE + "-sun-particles";
    var STARS_ID = SOURCE + "-stars";
    var GLOW_ID = SOURCE + "-cursor-glow";
    var ASTRONAUT_ID = SOURCE + "-astronauts";
    var SKELETON_ID = SOURCE + "-skeleton";
    var EMBERS_ID = SOURCE + "-skeleton-embers";
    var METEOR_ID = SOURCE + "-meteors";
    var SPARKS_ID = SOURCE + "-sparks";
    var SOUND_ID = SOURCE + "-sound";
    var CURSOR_ATTRIBUTE = "data-orbit-rocket-cursor";
    // Keep the native cursor <=32 DIP: Chromium drops larger images when
    // they cross viewport edges (including the right-hand conversation rail).
    // The 32px SVG scales its 36-unit drawing; the nose hotspot is now (6,6).
    var ROCKET_SVG = __ORBIT_ROCKET_SVG__;
    var ROCKET_CURSOR = 'url("data:image/svg+xml,' + encodeURIComponent(ROCKET_SVG) + '") 6 6, auto';
    var BOOST_CURSORS = __ORBIT_BOOST_SVGS__.map(function (svg) {
      return 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '") 6 6, auto';
    });
    var TEXT_CURSOR = 'url("data:image/svg+xml,' + encodeURIComponent(__ORBIT_TEXT_CURSOR_SVG__) + '") 16 16, text';
    var RESIZE_SVGS = __ORBIT_RESIZE_SVGS__;
    var RESIZE_AXES = {
      "col-resize":"ew", "ew-resize":"ew", "e-resize":"ew", "w-resize":"ew",
      "row-resize":"ns", "ns-resize":"ns", "n-resize":"ns", "s-resize":"ns",
      "nwse-resize":"nwse", "nw-resize":"nwse", "se-resize":"nwse",
      "nesw-resize":"nesw", "ne-resize":"nesw", "sw-resize":"nesw"
    };
    var TOKENS = __ORBIT_TOKENS__;

    __ORBIT_SOUND_ENGINE__

    __ORBIT_SOLAR_PARTICLES__

    __ORBIT_THEME_TOGGLE__

    // Orthographic near-side rendering from NASA SVS / LRO LROC + LOLA maps.
    // Pixels are bundled directly: no network, image decoding, or img-src exception.
    var MOON_SIZE = 384;
    var MOON_PIXELS = "__ORBIT_MOON_PIXELS__";
    var ASTRONAUT_PIXELS = "__ORBIT_ASTRONAUT_PIXELS__";
    var SKELETON_PIXELS = "__ORBIT_SKELETON_PIXELS__";
    var SUN_PIXELS = "__ORBIT_SUN_PIXELS__";
    async function renderPackedArt(canvas, pixels, width, height) {
      if (typeof DecompressionStream === "undefined") return;
      var binary = atob(pixels);
      var packed = new Uint8Array(binary.length);
      for (var i = 0; i < binary.length; i++) packed[i] = binary.charCodeAt(i);
      var stream = new Blob([packed]).stream().pipeThrough(new DecompressionStream("deflate"));
      var rgba = new Uint8ClampedArray(await new Response(stream).arrayBuffer());
      if (!canvas.isConnected) return;
      var ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.putImageData(new ImageData(rgba, width, height), 0, 0);
      canvas.setAttribute("data-ready", "true");
    }
    function renderAstronauts(canvas) { return renderPackedArt(canvas, ASTRONAUT_PIXELS, 640, 427); }
    function renderMoon(canvas) {
      canvas.width = canvas.height = MOON_SIZE;
      var ctx = canvas.getContext("2d");
      if (!ctx) return;
      var pixels = atob(MOON_PIXELS);
      var image = ctx.createImageData(MOON_SIZE, MOON_SIZE);
      var radius = MOON_SIZE / 2 - 1;
      for (var y = 0; y < MOON_SIZE; y++) {
        for (var x = 0; x < MOON_SIZE; x++) {
          var i = y * MOON_SIZE + x;
          var edge = radius - Math.hypot(x + 0.5 - MOON_SIZE / 2, y + 0.5 - MOON_SIZE / 2);
          var value = pixels.charCodeAt(i);
          image.data[i * 4] = value;
          image.data[i * 4 + 1] = Math.round(value * 0.993);
          image.data[i * 4 + 2] = Math.round(value * 0.975);
          image.data[i * 4 + 3] = Math.round(Math.max(0, Math.min(1, edge + 0.5)) * 255);
        }
      }
      ctx.putImageData(image, 0, 0);
    }

    function rng(seed) {
      return function () {
        seed |= 0;
        seed = (seed + 0x6d2b79f5) | 0;
        var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }

    // A deterministic viewport-sized field, never a repeating texture. Only paints
    // on mount, resize, or palette changes; no animation loop or idle GPU load.
    function renderStars(canvas, dark) {
      var w = Math.max(1, window.innerWidth);
      var h = Math.max(1, window.innerHeight);
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      var ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.scale(dpr, dpr);
      var rnd = rng(271828);
      var count = Math.min(2200, Math.round(w * h / 2300));
      var colors = dark ? ["213,225,244", "242,240,231", "190,210,242", "246,220,191"]
                        : ["134,76,35", "111,84,64", "164,94,37", "94,77,67"];
      for (var i = 0; i < count; i++) {
        var x = rnd() * w;
        var y = rnd() * h;
        var magnitude = rnd();
        var r = magnitude < 0.87 ? 0.24 + rnd() * 0.35
              : magnitude < 0.985 ? 0.58 + rnd() * 0.26 : 0.85 + rnd() * 0.23;
        var alpha = magnitude < 0.87 ? 0.18 + rnd() * 0.31 : 0.5 + rnd() * 0.35;
        var color = colors[Math.floor(rnd() * colors.length)];
        // Lower contrast through the sidebar and central reading/composer area.
        var reading = Math.exp(-Math.pow((x / w - 0.58) / 0.32, 4)
                               -Math.pow((y / h - 0.57) / 0.24, 4));
        alpha *= (1 - reading * 0.64) * (x < Math.min(280, w * 0.22) ? 0.48 : 1);
        if (!dark) { alpha = Math.min(0.9, alpha * 1.3); r *= 1.35; }
        if (magnitude > 0.985 && dark) {
          var glow = ctx.createRadialGradient(x, y, 0, x, y, r * 3.6);
          glow.addColorStop(0, "rgba(" + color + "," + alpha * 0.13 + ")");
          glow.addColorStop(0.35, "rgba(" + color + "," + alpha * 0.04 + ")");
          glow.addColorStop(1, "rgba(" + color + ",0)");
          ctx.fillStyle = glow;
          ctx.fillRect(x - r * 3.6, y - r * 3.6, r * 7.2, r * 7.2);
        }
        ctx.fillStyle = "rgba(" + color + "," + alpha + ")";
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    var CSS = [
      "body[" + CURSOR_ATTRIBUTE + "=rocket], body[" + CURSOR_ATTRIBUTE + "=rocket] * { cursor:" + ROCKET_CURSOR + " !important; }",
      "body[" + CURSOR_ATTRIBUTE + "=text], body[" + CURSOR_ATTRIBUTE + "=text] * { cursor:" + TEXT_CURSOR + " !important; }",
      "body { isolation:isolate; background-color: #04060d !important;",
      " background-image: radial-gradient(ellipse at 78% 10%, rgba(56,69,100,.12), transparent 56%) !important;",
      " background-repeat: no-repeat !important; background-attachment: fixed !important; }",
      "body:not([data-ds-dark-theme]) { background-color:#f3e4cd !important;",
      " background-image:radial-gradient(ellipse at 82% 17%,rgba(255,184,42,.46),transparent 51%),radial-gradient(ellipse at 3% 88%,rgba(229,104,37,.28),transparent 46%),radial-gradient(ellipse at 44% 57%,rgba(154,105,69,.12),transparent 64%) !important; }",
      "body[data-ds-dark-theme] [data-chat-flow-key] { background:linear-gradient(90deg,transparent,rgba(5,9,18,.64) 6%,rgba(5,9,18,.64) 94%,transparent); border-radius:12px; }",
      "body [data-composer-card] { background:linear-gradient(145deg,rgba(23,35,56,.97),rgba(11,18,33,.97)) !important;",
      " border:1px solid rgba(147,182,230,.24) !important; border-radius:22px !important; corner-shape:round;",
      " box-shadow:inset 0 1px 0 rgba(219,236,255,.07),0 12px 40px rgba(0,0,0,.16) !important; transition:border-color 180ms ease,box-shadow 180ms ease; }",
      "body [data-composer-card]:focus-within { border-color:rgba(142,191,255,.65) !important; box-shadow:inset 0 1px 0 rgba(219,236,255,.1),0 0 0 3px rgba(126,178,247,.08),0 12px 40px rgba(0,0,0,.18) !important; }",
      "body:not([data-ds-dark-theme]) [data-composer-card] { background:linear-gradient(145deg,rgba(255,253,246,.97),rgba(255,243,224,.96)) !important; border-color:rgba(140,87,41,.25) !important; box-shadow:inset 0 1px 0 #fff,0 10px 30px rgba(109,64,26,.09) !important; }",
      "body:not([data-ds-dark-theme]) [data-composer-card]:focus-within { border-color:rgba(180,78,28,.65) !important; box-shadow:0 0 0 3px rgba(202,110,48,.1),0 10px 30px rgba(109,64,26,.09) !important; }",
      "body :is([data-composer-input],textarea,input) { caret-color:var(--dsw-alias-brand-primary); }",
      "body [data-row-key^='session:'] { border-radius:10px; font-size:13.5px; transition:background-color 140ms ease,box-shadow 140ms ease; }",
      "body [data-row-key^='session:'][aria-selected=true] { background:linear-gradient(90deg,rgba(104,157,233,.18),rgba(104,157,233,.06)) !important; box-shadow:inset 2px 0 0 var(--dsw-alias-brand-primary); }",
      "body:not([data-ds-dark-theme]) [data-row-key^='session:'][aria-selected=true] { background:linear-gradient(90deg,rgba(211,117,45,.18),rgba(211,117,45,.05)) !important; }",
      "body [data-row-key^='workspace:'] { font-weight:600; letter-spacing:.015em; }",
      "body [data-row-key] time { color:var(--dsw-alias-label-secondary); font-size:11px; }",
      "body [data-row-key]:hover { background-color:rgba(126,170,228,.07); }",
      "body :is(button,[role=button],[role=tab]):focus-visible { outline:2px solid var(--dsw-alias-brand-primary); outline-offset:2px; }",
      "body [role=tab][aria-selected=true] { color:var(--dsw-alias-brand-primary); box-shadow:inset 0 -2px 0 var(--dsw-alias-brand-primary); }",
      "body [role=separator]:hover { background-color:rgba(126,170,228,.24); }",
      "#" + LAYER_ID + " { position:fixed; inset:0; z-index:-1; pointer-events:none; overflow:hidden; isolation:isolate; }",
      "#" + STARS_ID + " { position:absolute; inset:0; width:100%; height:100%; display:block; }",
      // A negative layer inside the isolated body paints above its background,
      // but below all application content, including unpositioned dividers.
      "#" + MOON_ID + " { position:fixed; z-index:-1; top:clamp(84px,11vh,132px); right:clamp(56px,7vw,112px);",
      " width:clamp(140px,14vw,224px); height:auto; aspect-ratio:1; display:block;",
      " border-radius:50%; corner-shape:round; filter:brightness(1.12); }",
      "body:not([data-ds-dark-theme]) #" + MOON_ID + " { display:none; }",
      "#" + SUN_ID + ", #" + SUN_DUST_ID + " { display:none; position:fixed; z-index:-1; pointer-events:none; top:clamp(54px,7vh,100px); right:clamp(24px,5vw,80px); width:clamp(270px,24vw,380px); height:auto; aspect-ratio:1; }",
      "#" + SUN_ID + " { filter:saturate(1.12) contrast(1.06); }",
      "body:not([data-ds-dark-theme]) #" + SUN_ID + ", body:not([data-ds-dark-theme]) #" + SUN_DUST_ID + " { display:block; }",
      "#" + METEOR_ID + " { position:fixed; inset:0; z-index:-1; overflow:hidden; pointer-events:none; }",
      "#" + METEOR_ID + " > span { position:absolute; width:140px; height:2px; opacity:0;",
      " transform-origin:100% 50%; border-radius:50%; corner-shape:round;",
      " background:linear-gradient(90deg,transparent,rgba(var(--meteor-rgb,189,219,255),.15) 35%,rgba(var(--meteor-rgb,189,219,255),.75) 85%,#f2f8ff);",
      " box-shadow:0 0 5px rgba(153,199,255,.35); }",
      "#" + METEOR_ID + " > span::before, #" + METEOR_ID + " > span::after { content:none; }",
      "body:not([data-ds-dark-theme]) #" + METEOR_ID + " > span {",
      " --meteor-rock:6px; width:calc(var(--meteor-length,140px) * 1.06) !important; height:1.8px !important;",
      " background:linear-gradient(90deg,transparent,rgba(217,77,13,.08) 20%,rgba(237,104,14,.48) 57%,#ffa72c 87%,#ffedb0); box-shadow:0 0 5px rgba(232,112,25,.38) !important; }",
      "body:not([data-ds-dark-theme]) #" + METEOR_ID + " > span[data-depth=near] { --meteor-rock:8px; height:3px !important; }",
      "body:not([data-ds-dark-theme]) #" + METEOR_ID + " > span::before { content:''; position:absolute; right:-3px; top:50%; width:calc(var(--meteor-rock) * 2.8); height:calc(var(--meteor-rock) * 1.7); transform:translateY(-50%); pointer-events:none;",
      " background:radial-gradient(ellipse at 74% 50%,#fff3bb 0%,#ffc345 25%,rgba(246,98,12,.86) 48%,rgba(232,64,10,.24) 65%,transparent 76%); clip-path:polygon(0 50%,24% 28%,46% 30%,68% 7%,96% 28%,100% 50%,92% 78%,66% 95%,47% 70%,25% 72%); }",
      "body:not([data-ds-dark-theme]) #" + METEOR_ID + " > span::after { content:''; position:absolute; right:-1px; top:50%; width:var(--meteor-rock); height:calc(var(--meteor-rock) * .75); transform:translateY(-50%) rotate(-16deg); pointer-events:none; border-radius:43% 57% 38% 62%; corner-shape:round; border:1px solid rgba(136,63,16,.85);",
      " background:radial-gradient(circle at 32% 29%,rgba(55,28,15,.68) 0 12%,transparent 17%),radial-gradient(circle at 69% 62%,rgba(47,25,16,.65) 0 9%,transparent 14%),linear-gradient(135deg,#d3934c,#704122 48%,#3d2920); box-shadow:0 0 2px #ffe991,0 0 5px rgba(255,131,21,.8); }",
      "#" + ASTRONAUT_ID + ", #" + SKELETON_ID + ", #" + EMBERS_ID + " { position:fixed; z-index:-1; left:10px; bottom:58px;",
      " width:clamp(180px,17vw,258px); height:auto; aspect-ratio:640/427; display:block;",
      " pointer-events:none; filter:brightness(1.14) drop-shadow(0 0 3px rgba(133,184,238,.22)); transform-origin:50% 50%;",
      " animation:orbit-astronaut-drift 14s ease-in-out infinite; }",
      "#" + SKELETON_ID + " { display:none; filter:contrast(1.08) saturate(1.15) drop-shadow(0 2px 2px rgba(92,39,10,.26)); }",
      "#" + EMBERS_ID + " { display:none; filter:none; }",
      "body:not([data-ds-dark-theme]) #" + ASTRONAUT_ID + " { display:none; }",
      "body:not([data-ds-dark-theme]) #" + SKELETON_ID + ", body:not([data-ds-dark-theme]) #" + EMBERS_ID + " { display:block; }",
      "@keyframes orbit-astronaut-drift { 0%,100% { transform:translate3d(0,2px,0) rotate(-1deg); }",
      " 50% { transform:translate3d(3px,-4px,0) rotate(1deg); } }",
      "@media(prefers-reduced-motion:reduce) { #" + ASTRONAUT_ID + ", #" + SKELETON_ID + ", #" + EMBERS_ID + " { animation:none; } }",
      "@media(prefers-reduced-motion:reduce) { #" + METEOR_ID + " { display:none; } }",
      "@media(max-width:900px), (max-height:620px) { #" + ASTRONAUT_ID + ", body:not([data-ds-dark-theme]) #" + SKELETON_ID + ", body:not([data-ds-dark-theme]) #" + EMBERS_ID + " { display:none; } }",
      "#" + ASTRONAUT_ID + "[data-orbit-hidden=true], #" + SKELETON_ID + "[data-orbit-hidden=true], #" + EMBERS_ID + "[data-orbit-hidden=true] { visibility:hidden; }",
      "#" + SUN_DUST_ID + ", #" + EMBERS_ID + " { overflow:visible; }",
      "#" + SUN_DUST_ID + " > span, #" + EMBERS_ID + " > span { position:absolute; width:3px; height:3px; opacity:0; pointer-events:none; border-radius:50%; corner-shape:round; background:#ffc047; box-shadow:0 0 2px rgba(183,62,0,.85),0 0 4px rgba(255,145,12,.8); }",
      "#" + SUN_DUST_ID + " > span[data-streak=true] { width:2px; height:7px; background:linear-gradient(transparent,#ee7f13,#ffde91); }",
      "#" + EMBERS_ID + " > span { width:2.5px; height:3.5px; background:#f47a0b; box-shadow:0 0 2px #ffd38b,0 0 5px rgba(201,64,8,.8); }",
      "#" + EMBERS_ID + " > span[data-streak=true] { width:2px; height:4px; background:linear-gradient(#ffdc76,#ed6110,transparent); }",
      "#" + GLOW_ID + " { position:fixed; top:0; left:0; width:320px; height:320px;",
      " z-index:2147483646; pointer-events:none !important; border-radius:50%; corner-shape:round;",
      " opacity:0; transition:opacity 160ms ease; transform:translate3d(-1000px,-1000px,0);",
      " background:radial-gradient(circle, rgba(207,227,255,.22) 0%, rgba(139,185,255,.10) 19%, rgba(106,151,242,.035) 43%, transparent 70%);",
      " mix-blend-mode:screen; contain:strict; }",
      "body:not([data-ds-dark-theme]) #" + GLOW_ID + " { mix-blend-mode:normal;",
      " background:radial-gradient(circle, rgba(255,255,255,.52) 0%, rgba(224,237,255,.24) 22%, rgba(167,198,250,.07) 45%, transparent 70%); }",
      "#" + GLOW_ID + " { background-position:center; background-repeat:no-repeat; }",
      "#" + GLOW_ID + "[data-context=reading] { background-size:65% 65%; }",
      "#" + GLOW_ID + "[data-context=input] { background-size:45% 45%; }",
      "#" + SPARKS_ID + " { position:fixed; inset:0; z-index:2147483647; overflow:hidden; pointer-events:none; }",
      "#" + SPARKS_ID + " > span { position:absolute; width:3px; height:3px; border-radius:50%; corner-shape:round; background:#fbd59c; box-shadow:0 0 4px rgba(146,217,255,.6); }",
      "#" + SOUND_ID + " { position:fixed; right:18px; bottom:14px; z-index:100; display:flex; flex-direction:row-reverse; align-items:center; gap:7px; padding:3px; border:1px solid var(--dsw-alias-border-l2); border-radius:18px; corner-shape:round; background:var(--dsw-alias-bg-layer-1); color:var(--dsw-alias-label-secondary); opacity:.72; }",
      "#" + SOUND_ID + ":hover, #" + SOUND_ID + ":focus-within { opacity:1; }",
      "#" + SOUND_ID + " button { display:grid; place-items:center; width:28px; height:28px; padding:0; border:0; border-radius:50%; corner-shape:round; background:transparent; color:inherit; cursor:pointer; }",
      "#" + SOUND_ID + " button:hover { color:var(--dsw-alias-brand-primary); background:var(--dsw-alias-interactive-bg-hover); }",
      "#" + SOUND_ID + " button:focus-visible { outline:2px solid var(--dsw-alias-brand-primary); outline-offset:2px; }",
      "#" + SOUND_ID + " svg { width:16px; height:16px; }",
      "#" + SOUND_ID + " label { display:none; align-items:center; gap:6px; padding-left:8px; font:11px sans-serif; white-space:nowrap; }",
      "#" + SOUND_ID + ":hover label, #" + SOUND_ID + ":focus-within label { display:flex; }",
      "#" + SOUND_ID + " input { width:64px; margin:0; accent-color:var(--dsw-alias-brand-primary); cursor:pointer; }",
      "@media(prefers-reduced-motion:reduce) { #" + SPARKS_ID + " { display:none; } body [data-composer-card] { transition:none; } }",
      "@media(prefers-reduced-motion:reduce) { #" + GLOW_ID + " { transition:none; } }",
      "@media(max-width:700px) { #" + MOON_ID + " { width:112px; right:24px; top:72px; opacity:.9; } }",
      "@media(max-width:700px) { #" + SUN_ID + ", #" + SUN_DUST_ID + " { width:200px; right:12px; top:64px; } }",
      "body[data-ds-dark-theme] ::selection { background:rgba(122,162,255,.30); }"
    ].join("\n");
    Object.keys(RESIZE_AXES).forEach(function (nativeCursor) {
      var cursor = 'url("data:image/svg+xml,' + encodeURIComponent(RESIZE_SVGS[RESIZE_AXES[nativeCursor]]) + '") 16 16, ' + nativeCursor;
      var selector = 'body[' + CURSOR_ATTRIBUTE + '="' + nativeCursor + '"]';
      CSS += "\n" + selector + "," + selector + " * { cursor:" + cursor + " !important; }";
    });

    function mount(theme) {
      if (typeof document === "undefined") return function () {};
      var el = document.createElement("style");
      el.id = STYLE_ID;
      el.textContent = CSS;
      var layer = document.createElement("div");
      layer.id = LAYER_ID;
      layer.setAttribute("aria-hidden", "true");
      var stars = document.createElement("canvas");
      stars.id = STARS_ID;
      var moon = document.createElement("canvas");
      moon.id = MOON_ID;
      moon.setAttribute("aria-hidden", "true");
      var sun = document.createElement("canvas");
      sun.id = SUN_ID;
      sun.width = sun.height = 512;
      sun.setAttribute("aria-hidden", "true");
      var solarDust = document.createElement("div");
      solarDust.id = SUN_DUST_ID;
      solarDust.setAttribute("aria-hidden", "true");
      var astronauts = document.createElement("canvas");
      astronauts.id = ASTRONAUT_ID;
      astronauts.width = 640;
      astronauts.height = 427;
      astronauts.setAttribute("aria-hidden", "true");
      var skeleton = document.createElement("canvas");
      skeleton.id = SKELETON_ID;
      skeleton.width = 640;
      skeleton.height = 427;
      skeleton.setAttribute("aria-hidden", "true");
      var embers = document.createElement("div");
      embers.id = EMBERS_ID;
      embers.setAttribute("aria-hidden", "true");
      var solarParticles = createOrbitSolarParticles(solarDust, embers);
      var meteors = document.createElement("div");
      meteors.id = METEOR_ID;
      meteors.setAttribute("aria-hidden", "true");
      layer.appendChild(stars);
      var glow = document.createElement("div");
      glow.id = GLOW_ID;
      glow.setAttribute("aria-hidden", "true");
      var sparks = document.createElement("div");
      sparks.id = SPARKS_ID;
      sparks.setAttribute("aria-hidden", "true");
      var observer = null;
      var menuObserver = null;
      var menuSheets = [];
      var themeToggle = createOrbitThemeToggle(theme);
      var timer = null;
      var disposed = false;
      var sound = createOrbitSoundscape();
      var soundControl = document.createElement("div");
      soundControl.id = SOUND_ID;
      soundControl.setAttribute("role", "group");
      soundControl.setAttribute("aria-label", "Orbit 主题音效");
      soundControl.innerHTML = '<button type="button" aria-label="静音太空音效"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4 6 8H3v8h3l5 4Z"/><path data-sound-wave d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/><path data-sound-mute d="m15 9 6 6m0-6-6 6"/></svg></button><label>音量<input type="range" min="0" max="100" step="1" aria-label="太空音效音量"></label>';
      var soundButton = soundControl.querySelector("button");
      var soundSlider = soundControl.querySelector("input");
      function updateSoundControl() {
        var settings = sound.settings();
        var silent = settings.muted || settings.volume === 0;
        soundButton.setAttribute("aria-pressed", String(!silent));
        soundButton.setAttribute("aria-label", silent ? "开启太空音效" : "静音太空音效");
        soundButton.title = settings.supported ? (silent ? "太空音效已静音" : "太空音效 " + Math.round(settings.volume * 100) + "%") + " · 悬停调整音量" : "当前环境不支持太空音效";
        soundButton.disabled = !settings.supported;
        soundControl.querySelector("[data-sound-wave]").style.display = silent ? "none" : "";
        soundControl.querySelector("[data-sound-mute]").style.display = silent ? "" : "none";
        soundSlider.value = String(Math.round(settings.volume * 100));
      }
      soundButton.addEventListener("click", function () {
        var settings = sound.settings();
        sound.setMuted(!settings.muted && settings.volume > 0);
        if (!sound.settings().muted) { if (!settings.volume) sound.setVolume(0.18); sound.unlock().then(function (ok) { if (ok && !disposed) sound.click(); }); }
        updateSoundControl();
      });
      soundSlider.addEventListener("input", function () {
        sound.setVolume(Number(soundSlider.value) / 100);
        if (sound.settings().volume > 0) { sound.setMuted(false); sound.unlock(); }
        updateSoundControl();
      });
      updateSoundControl();
      var glowFrame = 0;
      var pointerX = 0;
      var pointerY = 0;
      var cursorTarget = null;
      var cursorNative = "auto";
      var cursorSelectable = true;
      var pointerEvent = null;
      var meteorSlots = [];
      var motionQuery = null;
      var boosting = false;
      var boostTimer = null;
      var boostFrame = 0;
      var boostTarget = null;
      var boostOriginal = "";
      var boostPriority = "";
      var boostApplied = "";
      var sparkNodes = new Set();
      var uiObserver = null;
      var layoutFrame = 0;

      function realTarget(event) {
        var path = typeof event.composedPath === "function" ? event.composedPath() : [];
        return path.find(function (item) { return item && item.nodeType === 1; }) || event.target || document.body;
      }
      function inMenu(target) {
        var root = target && typeof target.getRootNode === "function" ? target.getRootNode() : null;
        return !!(root && root.host && root.host.hasAttribute("data-windows-menu"));
      }
      function releaseBoostTarget() {
        if (!boostTarget) return;
        // Restore only our own override; never overwrite a host's newer style.
        if (boostTarget.style.getPropertyValue("cursor") === boostApplied) {
          if (boostOriginal) boostTarget.style.setProperty("cursor", boostOriginal, boostPriority);
          else boostTarget.style.removeProperty("cursor");
        }
        boostTarget = null;
      }
      function applyBoostCursor(target) {
        if (!target || target.nodeType !== 1 || !target.style) target = document.body;
        if (boostTarget !== target) {
          releaseBoostTarget();
          boostTarget = target;
          boostOriginal = target.style.getPropertyValue("cursor");
          boostPriority = target.style.getPropertyPriority("cursor");
        }
        // Only the hovered element changes once per flame frame. No global
        // cursor rule invalidation, layout, or DOM cursor movement is needed.
        target.style.setProperty("cursor", BOOST_CURSORS[boostFrame], "important");
        boostApplied = target.style.getPropertyValue("cursor");
      }
      function tickBoost() {
        boostTimer = null;
        if (!boosting || disposed || (motionQuery && motionQuery.matches)) return;
        boostFrame = (boostFrame + 1) % BOOST_CURSORS.length;
        if (boostTarget) applyBoostCursor(boostTarget);
        if (boostFrame === 0) emitSpark();
        boostTimer = window.setTimeout(tickBoost, 90);
      }
      function emitSpark() {
        if (!boosting || disposed) return;
        if (!(motionQuery && motionQuery.matches) && sparkNodes.size < 14) {
          var node = document.createElement("span");
          node.style.left = (pointerX + 15) + "px";
          node.style.top = (pointerY + 15) + "px";
          sparks.appendChild(node);
          if (typeof node.animate === "function") {
            sparkNodes.add(node);
            var distance = 18 + Math.random() * 32;
            var spread = (Math.random() - 0.5) * 18;
            var animation = node.animate([
              { transform:"translate(0,0) scale(1)", opacity:0.85 },
              { transform:"translate(" + (distance + spread) + "px," + (distance - spread) + "px) scale(.1)", opacity:0 }
            ], { duration:240 + Math.random() * 220, easing:"ease-out" });
            animation.finished.then(function () { sparkNodes.delete(node); node.remove(); }, function () { sparkNodes.delete(node); node.remove(); });
          } else node.remove();
        }
      }
      function stopBoost() {
        boosting = false;
        if (boostTimer !== null) window.clearTimeout(boostTimer);
        boostTimer = null;
        releaseBoostTarget();
        sound.stopThrust();
        if (document.body) document.body.removeAttribute("data-orbit-boosting");
      }
      function startBoost(event) {
        if (disposed || event.button !== 0 || event.pointerType === "touch") return;
        if (realTarget(event).closest && realTarget(event).closest("#" + SOUND_ID + ",[data-orbit-theme-toggle]")) return;
        updateThemedCursor(event);
        if (document.body.getAttribute(CURSOR_ATTRIBUTE) !== "rocket" && !inMenu(realTarget(event))) return;
        pointerX = event.clientX;
        pointerY = event.clientY;
        if (boosting) return;
        boosting = true;
        boostFrame = 0;
        applyBoostCursor(realTarget(event));
        document.body.setAttribute("data-orbit-boosting", "");
        sound.startThrust();
        emitSpark();
        if (!(motionQuery && motionQuery.matches)) boostTimer = window.setTimeout(tickBoost, 90);
      }
      function endBoost(event) {
        if (!event || event.button === 0 || event.type === "pointercancel") stopBoost();
      }

      function layoutAstronaut() {
        layoutFrame = 0;
        if (disposed || typeof document.querySelector !== "function") return;
        var frame = document.querySelector("[data-sidebar-collapsed],[style*='--dsh-windows-sidebar-width']");
        var sidebar = document.querySelector("aside,[role=navigation]");
        var width = frame ? parseFloat(window.getComputedStyle(frame).getPropertyValue("--dsh-windows-sidebar-width")) : NaN;
        if (!Number.isFinite(width)) width = sidebar ? sidebar.getBoundingClientRect().width : 280;
        if ((frame && frame.getAttribute("data-sidebar-collapsed") === "true") || width < 150) {
          astronauts.setAttribute("data-orbit-hidden", "true");
          skeleton.setAttribute("data-orbit-hidden", "true");
          embers.setAttribute("data-orbit-hidden", "true");
          solarParticles.sync(); return;
        }
        var listBottom = 0;
        document.querySelectorAll("[data-row-key]").forEach(function (row) {
          var rect = row.getBoundingClientRect();
          if (rect.width <= 0 || rect.left >= width || rect.top > window.innerHeight - 58 || rect.bottom < 0) return;
          var y = Math.min(rect.bottom - 2, window.innerHeight - 60);
          var hit = document.elementFromPoint(rect.left + Math.min(24, rect.width / 2), Math.max(0, y));
          if (hit && (row === hit || row.contains(hit))) listBottom = Math.max(listBottom, Math.min(rect.bottom, window.innerHeight - 58));
        });
        var available = window.innerHeight - 58 - listBottom - 14;
        var size = Math.min(258, width - 22, available * 640 / 427);
        astronauts.style.width = Math.max(0, size) + "px";
        astronauts.setAttribute("data-orbit-hidden", size < 135 ? "true" : "false");
        skeleton.style.width = Math.max(0, size) + "px";
        skeleton.setAttribute("data-orbit-hidden", size < 135 ? "true" : "false");
        embers.style.width = Math.max(0, size) + "px";
        embers.setAttribute("data-orbit-hidden", size < 135 ? "true" : "false");
        solarParticles.sync();
      }
      function scheduleLayout() {
        if (!disposed && !layoutFrame && typeof window.requestAnimationFrame === "function") layoutFrame = window.requestAnimationFrame(layoutAstronaut);
      }
      function layoutChanged(records) {
        if (records.some(function (record) {
          return !(record.target.closest && record.target.closest('[id^="dsh-theme-orbit-"],[data-conversation-content]'));
        })) scheduleLayout();
      }
      function layoutScrolled(event) {
        var target = event.target;
        if (target && target.querySelector && (target.matches && target.matches('aside,[role=tree],[role=navigation]') || target.querySelector("[data-row-key]"))) scheduleLayout();
      }

      function installMenuCursor() {
        if (disposed || typeof document.querySelectorAll !== "function") return;
        // Desktop's "Application / Edit" controls live in a preload-owned open
        // shadow root. Document selectors cannot override their cursor:default.
        document.querySelectorAll("[data-windows-menu]").forEach(function (host) {
          var root = host.shadowRoot;
          if (!root) return;
          if (!root.getElementById(STYLE_ID + "-menubar")) {
            var sheet = document.createElement("style");
            sheet.id = STYLE_ID + "-menubar";
            sheet.textContent = ":host, :host * { cursor:" + ROCKET_CURSOR + " !important; }";
            root.appendChild(sheet);
            menuSheets.push(sheet);
          }
          themeToggle.install(root);
        });
      }

      function canRunMeteors() {
        return !disposed && !document.hidden && !(motionQuery && motionQuery.matches);
      }
      function scheduleMeteor(slot) {
        if (!canRunMeteors() || slot.timer !== null || slot.animation) return;
        // Each of the 15 slots owns its countdown and its one active meteor.
        var seconds = 1 + Math.floor(Math.random() * 10);
        slot.node.setAttribute("data-wait-seconds", String(seconds));
        slot.timer = window.setTimeout(function () {
          slot.timer = null;
          if (canRunMeteors()) launchMeteor(slot);
        }, seconds * 1000);
      }
      function launchMeteor(slot) {
        if (slot.animation || !canRunMeteors()) return;
        var w = window.innerWidth;
        var h = window.innerHeight;
        var depth = Math.random();
        var far = depth < 0.68;
        var warm = depth > 0.93;
        var focused = document.activeElement;
        if (warm && (!focused || !isTextInput(focused))) sound.meteor();
        var length = far ? 55 + Math.random() * 65 : 110 + Math.random() * 100;
        var angle = 22 + Math.random() * 24;
        var radians = angle * Math.PI / 180;
        var distance = Math.min(820, Math.max(240, w * (0.22 + Math.random() * 0.3)));
        var dx = Math.cos(radians) * distance;
        var dy = Math.sin(radians) * distance;
        slot.node.style.width = length + "px";
        slot.node.style.setProperty("--meteor-length", length + "px");
        slot.node.style.height = far ? "1px" : "1.8px";
        slot.node.style.setProperty("--meteor-rgb", warm ? "255,218,170" : far ? "137,175,229" : "192,218,255");
        slot.node.style.boxShadow = "0 0 " + (far ? 2 : 6) + "px rgba(" + (warm ? "255,211,151" : "153,199,255") + ",.35)";
        slot.node.setAttribute("data-depth", far ? "far" : "near");
        slot.node.style.left = (Math.random() * w * 0.8 - length) + "px";
        slot.node.style.top = (Math.random() * h * 0.65) + "px";
        slot.node.setAttribute("data-active", "true");
        var animation = slot.node.animate([
          { transform:"translate3d(0,0,0) rotate(" + angle + "deg)", opacity:0, offset:0 },
          { opacity:far ? 0.52 : 0.95, offset:0.14 },
          { opacity:far ? 0.38 : 0.8, offset:0.72 },
          { transform:"translate3d(" + dx + "px," + dy + "px,0) rotate(" + angle + "deg)", opacity:0, offset:1 }
        ], { duration:(far ? 1200 : 850) + Math.random() * 650, easing:"linear" });
        slot.animation = animation;
        var finish = function () {
          if (slot.animation !== animation) return;
          slot.animation = null;
          slot.node.setAttribute("data-active", "false");
          scheduleMeteor(slot);
        };
        animation.finished.then(finish, finish);
      }
      function stopMeteors() {
        meteorSlots.forEach(function (slot) {
          if (slot.timer !== null) window.clearTimeout(slot.timer);
          slot.timer = null;
          var animation = slot.animation;
          slot.animation = null;
          if (animation) animation.cancel();
          slot.node.setAttribute("data-active", "false");
        });
      }
      function syncMeteors() {
        if (!canRunMeteors()) { stopMeteors(); return; }
        meteorSlots.forEach(scheduleMeteor);
      }
      function initMeteors() {
        if (meteorSlots.length || typeof window.setTimeout !== "function") return;
        for (var i = 0; i < 15; i++) {
          var node = document.createElement("span");
          if (typeof node.animate !== "function") return;
          node.setAttribute("data-meteor-slot", String(i));
          node.setAttribute("data-active", "false");
          meteors.appendChild(node);
          meteorSlots.push({ node:node, timer:null, animation:null });
        }
        if (typeof window.matchMedia === "function") {
          motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
          motionQuery.addEventListener("change", syncMeteors);
        }
        syncMeteors();
      }

      function isTextInput(target) {
        var input = target.closest("input,textarea");
        if (input) {
          if (input.disabled) return false;
          if (input.tagName === "TEXTAREA") return true;
          return ["text", "search", "email", "url", "tel", "password", "number"].indexOf(input.type) !== -1;
        }
        return target.isContentEditable || !!target.closest('[role="textbox"]');
      }

      function hitsText(x, y) {
        // CSS cursor:auto becomes an I-beam over glyphs without ever computing
        // to "text". Caret hit testing plus character bounds reproduces this.
        try {
          var node, offset;
          if (typeof document.caretPositionFromPoint === "function") {
            var position = document.caretPositionFromPoint(x, y);
            if (!position) return false;
            node = position.offsetNode;
            offset = position.offset;
          } else if (typeof document.caretRangeFromPoint === "function") {
            var caret = document.caretRangeFromPoint(x, y);
            if (!caret) return false;
            node = caret.startContainer;
            offset = caret.startOffset;
          }
          if (!node || node.nodeType !== 3 || !node.textContent.trim()) return false;
          var parent = node.parentElement;
          if (!parent || window.getComputedStyle(parent).userSelect === "none") return false;
          var range = document.createRange();
          for (var i = Math.max(0, offset - 1); i <= offset && i < node.length; i++) {
            range.setStart(node, i);
            range.setEnd(node, i + 1);
            var rects = range.getClientRects();
            for (var j = 0; j < rects.length; j++) {
              var rect = rects[j];
              if (rect.width > 0 && x >= rect.left - 1 && x <= rect.right + 1 && y >= rect.top && y <= rect.bottom) return true;
            }
          }
        } catch (_) { /* Missing caret support must not interrupt pointer input. */ }
        return false;
      }

      function updateThemedCursor(event) {
        var body = document.body;
        if (!body || typeof window.getComputedStyle !== "function") return;
        var target = realTarget(event);
        if (!target || target.nodeType !== 1) target = body;
        if (cursorTarget !== target) {
          releaseBoostTarget();
          cursorTarget = target;
          body.removeAttribute(CURSOR_ATTRIBUTE);
          var original = window.getComputedStyle(target);
          cursorNative = original.cursor;
          cursorSelectable = original.userSelect !== "none" && !target.closest('button,a[href],label,summary,[role="button"],[role="tab"],[role="menuitem"],[role="option"]');
        }
        // Keep resize direction and native drag behavior, with an orbital skin.
        // Disabled, vertical text and other special drag cursors stay native.
        var mode = null;
        if (inMenu(target)) {
          mode = "rocket";
        } else if (RESIZE_AXES[cursorNative]) {
          mode = cursorNative;
        } else if (cursorNative === "text") {
          mode = "text";
        } else if (cursorNative === "auto" || cursorNative === "default" || cursorNative === "pointer") {
          var text = isTextInput(target) || (cursorNative !== "pointer" && cursorSelectable && hitsText(event.clientX, event.clientY));
          mode = text ? "text" : "rocket";
        }
        // Avoid invalidating body-wide cursor selectors on every display frame.
        if (body.getAttribute(CURSOR_ATTRIBUTE) !== mode) {
          if (mode) body.setAttribute(CURSOR_ATTRIBUTE, mode);
          else body.removeAttribute(CURSOR_ATTRIBUTE);
        }
        if (boosting) {
          if (body.getAttribute(CURSOR_ATTRIBUTE) !== "rocket") stopBoost();
          else if (boostTarget !== target) applyBoostCursor(target);
        }
        var context = isTextInput(target) || target.closest("[data-composer-card]") ? "input" : body.getAttribute(CURSOR_ATTRIBUTE) === "text" || target.closest("[data-chat-flow-key]") ? "reading" : "space";
        if (glow.getAttribute("data-context") !== context) glow.setAttribute("data-context", context);
      }

      // Coalesce pointer events into one composited transform per display frame.
      // Separate from the star layer so it also lights opaque panels and menus.
      function moveGlow(event) {
        if (disposed) return;
        if (event.pointerType === "touch") { hideGlow(); return; }
        if (boosting && !(event.buttons & 1)) stopBoost();
        // composedPath() is cleared after dispatch; preserve shadow-menu hits
        // before the coalesced update instead of retargeting to their host.
        pointerEvent = { target:realTarget(event), clientX:event.clientX, clientY:event.clientY };
        pointerX = event.clientX;
        pointerY = event.clientY;
        if (glowFrame) return;
        glowFrame = window.requestAnimationFrame(function () {
          glowFrame = 0;
          if (disposed) return;
          updateThemedCursor(pointerEvent);
          glow.style.transform = "translate3d(" + (pointerX - 160) + "px," + (pointerY - 160) + "px,0)";
          var context = glow.getAttribute("data-context");
          glow.style.opacity = context === "input" ? "0.28" : context === "reading" ? "0.46" : "1";
        });
      }
      function hideGlow() {
        stopBoost();
        if (glowFrame) window.cancelAnimationFrame(glowFrame);
        glowFrame = 0;
        glow.style.opacity = "0";
        cursorTarget = null;
        pointerEvent = null;
        if (document.body) document.body.removeAttribute(CURSOR_ATTRIBUTE);
      }
      function leaveWindow() { hideGlow(); sound.silence(); }
      function unlockSound(event) {
        if (!event.isTrusted || document.hidden) return;
        var target = realTarget(event);
        if (target.closest && target.closest("#" + SOUND_ID)) return;
        sound.unlock();
      }
      function clickSound(event) {
        if (!event.isTrusted || disposed || document.hidden) return;
        var target = realTarget(event);
        if (!target || !target.closest || target.closest("#" + SOUND_ID) || isTextInput(target)) return;
        var control = target.closest('button,a[href],[role="button"],[role="tab"],[role="menuitem"],[data-row-key]');
        if (control && !control.disabled && control.getAttribute("aria-disabled") !== "true") sound.click();
      }
      function visibility() {
        if (document.hidden) leaveWindow();
        syncMeteors();
        solarParticles.sync();
      }

      function paint() {
        if (disposed) return;
        try { renderStars(stars, document.body.hasAttribute("data-ds-dark-theme")); }
        catch (_) { /* A decorative canvas must never stop the application. */ }
        solarParticles.sync();
        themeToggle.sync();
      }
      function resize() {
        hideGlow();
        scheduleLayout();
        clearTimeout(timer);
        timer = setTimeout(paint, 100);
      }
      function attach() {
        if (disposed) return;
        var head = document.head || document.documentElement;
        var body = document.body || document.documentElement;
        if (head && !el.parentNode) head.appendChild(el);
        if (body && !layer.parentNode) body.appendChild(layer);
        if (body && !moon.parentNode) body.appendChild(moon);
        if (body && !sun.parentNode) body.appendChild(sun);
        if (body && !solarDust.parentNode) body.appendChild(solarDust);
        if (body && !astronauts.parentNode) body.appendChild(astronauts);
        if (body && !skeleton.parentNode) body.appendChild(skeleton);
        if (body && !embers.parentNode) body.appendChild(embers);
        if (body && !meteors.parentNode) body.appendChild(meteors);
        if (body && !glow.parentNode) body.appendChild(glow);
        if (body && !sparks.parentNode) body.appendChild(sparks);
        if (body && !soundControl.parentNode) body.appendChild(soundControl);
        try { renderMoon(moon); } catch (_) {}
        renderAstronauts(astronauts).catch(function () { /* Decorative only. */ });
        renderPackedArt(sun, SUN_PIXELS, 512, 512).catch(function () { /* Decorative only. */ });
        renderPackedArt(skeleton, SKELETON_PIXELS, 640, 427).catch(function () { /* Decorative only. */ });
        paint();
        initMeteors();
        installMenuCursor();
        scheduleLayout();
        if (typeof window.addEventListener === "function") {
          window.addEventListener("resize", resize);
          window.addEventListener("blur", leaveWindow);
          window.addEventListener("pagehide", leaveWindow);
          window.addEventListener("pointerup", endBoost, true);
        }
        if (typeof document.addEventListener === "function") {
          document.addEventListener("pointerdown", unlockSound, { capture:true, passive:true });
          document.addEventListener("keydown", unlockSound, { capture:true, passive:true });
          document.addEventListener("click", clickSound, { capture:true, passive:true });
          document.addEventListener("pointermove", moveGlow, { capture:true, passive:true });
          document.addEventListener("pointerdown", startBoost, { capture:true, passive:true });
          document.addEventListener("scroll", layoutScrolled, { capture:true, passive:true });
          document.addEventListener("pointerleave", leaveWindow);
          document.addEventListener("pointercancel", hideGlow, true);
          document.addEventListener("visibilitychange", visibility);
        }
        if (typeof MutationObserver !== "undefined" && document.body) {
          observer = new MutationObserver(paint);
          observer.observe(document.body, { attributes:true, attributeFilter:["data-ds-dark-theme"] });
          menuObserver = new MutationObserver(installMenuCursor);
          menuObserver.observe(document.body, { childList:true });
          uiObserver = new MutationObserver(layoutChanged);
          uiObserver.observe(document.body, { childList:true, subtree:true, attributes:true, attributeFilter:["data-sidebar-collapsed", "aria-expanded"] });
        }
      }
      if (document.body && document.head) attach();
      else if (typeof document.addEventListener === "function") document.addEventListener("DOMContentLoaded", attach, { once:true });
      else attach();
      return function () {
        disposed = true;
        clearTimeout(timer);
        stopMeteors();
        solarParticles.dispose();
        if (motionQuery) motionQuery.removeEventListener("change", syncMeteors);
        hideGlow();
        sound.dispose();
        themeToggle.dispose();
        if (layoutFrame) window.cancelAnimationFrame(layoutFrame);
        sparkNodes.forEach(function (node) { node.getAnimations().forEach(function (animation) { animation.cancel(); }); node.remove(); });
        sparkNodes.clear();
        if (observer) observer.disconnect();
        if (menuObserver) menuObserver.disconnect();
        if (uiObserver) uiObserver.disconnect();
        menuSheets.forEach(function (sheet) { if (sheet.parentNode) sheet.parentNode.removeChild(sheet); });
        if (typeof window.removeEventListener === "function") {
          window.removeEventListener("resize", resize);
          window.removeEventListener("blur", leaveWindow);
          window.removeEventListener("pagehide", leaveWindow);
          window.removeEventListener("pointerup", endBoost, true);
        }
        if (typeof document.removeEventListener === "function") {
          document.removeEventListener("pointerdown", unlockSound, true);
          document.removeEventListener("keydown", unlockSound, true);
          document.removeEventListener("click", clickSound, true);
          document.removeEventListener("DOMContentLoaded", attach);
          document.removeEventListener("pointermove", moveGlow, true);
          document.removeEventListener("pointerdown", startBoost, true);
          document.removeEventListener("scroll", layoutScrolled, true);
          document.removeEventListener("pointerleave", leaveWindow);
          document.removeEventListener("pointercancel", hideGlow, true);
          document.removeEventListener("visibilitychange", visibility);
        }
        if (el.parentNode) el.parentNode.removeChild(el);
        if (layer.parentNode) layer.parentNode.removeChild(layer);
        if (moon.parentNode) moon.parentNode.removeChild(moon);
        if (sun.parentNode) sun.parentNode.removeChild(sun);
        if (solarDust.parentNode) solarDust.parentNode.removeChild(solarDust);
        if (astronauts.parentNode) astronauts.parentNode.removeChild(astronauts);
        if (skeleton.parentNode) skeleton.parentNode.removeChild(skeleton);
        if (embers.parentNode) embers.parentNode.removeChild(embers);
        if (meteors.parentNode) meteors.parentNode.removeChild(meteors);
        if (glow.parentNode) glow.parentNode.removeChild(glow);
        if (sparks.parentNode) sparks.parentNode.removeChild(sparks);
        if (soundControl.parentNode) soundControl.parentNode.removeChild(soundControl);
      };
    }

    return {
      inject:["theme"],
      apply: (ctx) => {
        var install = () => {
          var disposeTokens = ctx.theme.overrideTokens(SOURCE, TOKENS);
          var disposeStyle = mount(ctx.theme);
          return () => { disposeStyle(); disposeTokens(); };
        };
        if (typeof ctx.effect === "function") ctx.effect(install);
        else install();
      }
    };
  }
});
