window.__ModuleLoader__.load({
  id: "dsh-theme-orbit",
  factory: () => {
    var SOURCE = "dsh-theme-orbit";
    var STYLE_ID = SOURCE + "-style";
    var LAYER_ID = SOURCE + "-layer";
    var MOON_ID = SOURCE + "-moon";
    var STARS_ID = SOURCE + "-stars";
    var GLOW_ID = SOURCE + "-cursor-glow";
    var ASTRONAUT_ID = SOURCE + "-astronauts";
    var METEOR_ID = SOURCE + "-meteors";
    var EXHAUST_ID = SOURCE + "-exhaust";
    var SPARKS_ID = SOURCE + "-sparks";
    var CURSOR_ATTRIBUTE = "data-orbit-rocket-cursor";
    // Keep the native cursor <=32 DIP: Chromium drops larger images when
    // they cross viewport edges (including the right-hand conversation rail).
    // The 32px SVG scales its 36-unit drawing; the nose hotspot is now (6,6).
    var ROCKET_CURSOR = 'url("data:image/svg+xml,' + encodeURIComponent(__ORBIT_ROCKET_SVG__) + '") 6 6, auto';
    var TEXT_CURSOR = 'url("data:image/svg+xml,' + encodeURIComponent(__ORBIT_TEXT_CURSOR_SVG__) + '") 16 16, text';
    var TOKENS = __ORBIT_TOKENS__;

    // Orthographic near-side rendering from NASA SVS / LRO LROC + LOLA maps.
    // Pixels are bundled directly: no network, image decoding, or img-src exception.
    var MOON_SIZE = 384;
    var MOON_PIXELS = "__ORBIT_MOON_PIXELS__";
    var ASTRONAUT_PIXELS = "__ORBIT_ASTRONAUT_PIXELS__";
    async function renderAstronauts(canvas) {
      if (typeof DecompressionStream === "undefined") return;
      var binary = atob(ASTRONAUT_PIXELS);
      var packed = new Uint8Array(binary.length);
      for (var i = 0; i < binary.length; i++) packed[i] = binary.charCodeAt(i);
      var stream = new Blob([packed]).stream().pipeThrough(new DecompressionStream("deflate"));
      var rgba = new Uint8ClampedArray(await new Response(stream).arrayBuffer());
      if (!canvas.isConnected) return;
      var ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.putImageData(new ImageData(rgba, 640, 427), 0, 0);
      canvas.setAttribute("data-ready", "true");
    }
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
                        : ["78,100,145", "98,112,145", "85,110,159", "130,118,105"];
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
        if (!dark) alpha *= 0.6;
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
      "body:not([data-ds-dark-theme]) { background-color: #f4f6fc !important;",
      " background-image: radial-gradient(ellipse at 78% 10%, rgba(140,160,200,.12), transparent 56%) !important; }",
      "body[data-ds-dark-theme] [data-chat-flow-key] { background:linear-gradient(90deg,transparent,rgba(5,9,18,.64) 6%,rgba(5,9,18,.64) 94%,transparent); border-radius:12px; }",
      "body [data-composer-card] { background:linear-gradient(145deg,rgba(23,35,56,.97),rgba(11,18,33,.97)) !important;",
      " border:1px solid rgba(147,182,230,.24) !important; border-radius:22px !important; corner-shape:round;",
      " box-shadow:inset 0 1px 0 rgba(219,236,255,.07),0 12px 40px rgba(0,0,0,.16) !important; transition:border-color 180ms ease,box-shadow 180ms ease; }",
      "body [data-composer-card]:focus-within { border-color:rgba(142,191,255,.65) !important; box-shadow:inset 0 1px 0 rgba(219,236,255,.1),0 0 0 3px rgba(126,178,247,.08),0 12px 40px rgba(0,0,0,.18) !important; }",
      "body:not([data-ds-dark-theme]) [data-composer-card] { background:linear-gradient(145deg,rgba(255,255,255,.97),rgba(242,247,255,.97)) !important; border-color:rgba(77,112,168,.2) !important; box-shadow:inset 0 1px 0 #fff,0 10px 30px rgba(37,65,105,.07) !important; }",
      "body:not([data-ds-dark-theme]) [data-composer-card]:focus-within { border-color:rgba(64,113,193,.6) !important; box-shadow:0 0 0 3px rgba(64,113,193,.09),0 10px 30px rgba(37,65,105,.07) !important; }",
      "body :is([data-composer-input],textarea,input) { caret-color:var(--dsw-alias-brand-primary); }",
      "body [data-row-key^='session:'] { border-radius:10px; font-size:13.5px; transition:background-color 140ms ease,box-shadow 140ms ease; }",
      "body [data-row-key^='session:'][aria-selected=true] { background:linear-gradient(90deg,rgba(104,157,233,.18),rgba(104,157,233,.06)) !important; box-shadow:inset 2px 0 0 var(--dsw-alias-brand-primary); }",
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
      "body:not([data-ds-dark-theme]) #" + MOON_ID + " { opacity:.76; filter:none; }",
      "#" + METEOR_ID + " { position:fixed; inset:0; z-index:-1; overflow:hidden; pointer-events:none; }",
      "#" + METEOR_ID + " > span { position:absolute; width:140px; height:2px; opacity:0;",
      " transform-origin:100% 50%; border-radius:50%; corner-shape:round;",
      " background:linear-gradient(90deg,transparent,rgba(var(--meteor-rgb,189,219,255),.15) 35%,rgba(var(--meteor-rgb,189,219,255),.75) 85%,#f2f8ff);",
      " box-shadow:0 0 5px rgba(153,199,255,.35); }",
      "body:not([data-ds-dark-theme]) #" + METEOR_ID + " > span {",
      " background:linear-gradient(90deg,transparent,rgba(78,112,181,.2) 35%,rgba(78,112,181,.65) 85%,#5674af); }",
      "#" + ASTRONAUT_ID + " { position:fixed; z-index:-1; left:10px; bottom:58px;",
      " width:clamp(180px,17vw,258px); height:auto; aspect-ratio:640/427; display:block;",
      " pointer-events:none; filter:brightness(1.14) drop-shadow(0 0 3px rgba(133,184,238,.22)); transform-origin:50% 50%;",
      " animation:orbit-astronaut-drift 14s ease-in-out infinite; }",
      "@keyframes orbit-astronaut-drift { 0%,100% { transform:translate3d(0,2px,0) rotate(-1deg); }",
      " 50% { transform:translate3d(3px,-4px,0) rotate(1deg); } }",
      "@media(prefers-reduced-motion:reduce) { #" + ASTRONAUT_ID + " { animation:none; } }",
      "@media(prefers-reduced-motion:reduce) { #" + METEOR_ID + " { display:none; } }",
      "@media(max-width:900px), (max-height:620px) { #" + ASTRONAUT_ID + " { display:none; } }",
      "#" + ASTRONAUT_ID + "[data-orbit-hidden=true] { visibility:hidden; }",
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
      "#" + EXHAUST_ID + " { position:fixed; left:0; top:0; width:0; height:0; z-index:2147483647; pointer-events:none; opacity:0; transition:opacity 70ms linear; }",
      "#" + EXHAUST_ID + "[data-active=true] { opacity:1; }",
      "#" + EXHAUST_ID + " > span { position:absolute; top:-1px; transform-origin:50% 0; clip-path:polygon(16% 0,84% 0,100% 25%,65% 76%,50% 100%,35% 76%,0 25%); }",
      "#" + EXHAUST_ID + " > span:first-child { left:-7px; width:14px; height:34px; background:linear-gradient(#c5edff,#6dcfff 22%,#ffc36e 55%,rgba(255,123,48,0)); filter:drop-shadow(0 0 3px rgba(112,204,255,.6)); }",
      "#" + EXHAUST_ID + " > span:last-child { left:-3px; width:6px; height:23px; background:linear-gradient(#fff,#c2f4ff 35%,rgba(255,239,173,.7) 65%,transparent); }",
      "#" + EXHAUST_ID + "[data-active=true] > span:first-child { animation:orbit-thrust 110ms ease-in-out infinite alternate; }",
      "#" + EXHAUST_ID + "[data-active=true] > span:last-child { animation:orbit-thrust 75ms ease-in-out infinite alternate-reverse; }",
      "@keyframes orbit-thrust { from { transform:scale(.85,.7); } to { transform:scale(1.06,1.12); } }",
      "#" + SPARKS_ID + " { position:fixed; inset:0; z-index:2147483647; overflow:hidden; pointer-events:none; }",
      "#" + SPARKS_ID + " > span { position:absolute; width:3px; height:3px; border-radius:50%; corner-shape:round; background:#fbd59c; box-shadow:0 0 4px rgba(146,217,255,.6); }",
      "@media(prefers-reduced-motion:reduce) { #" + EXHAUST_ID + " > span { animation:none !important; } #" + SPARKS_ID + " { display:none; } body [data-composer-card] { transition:none; } }",
      "@media(prefers-reduced-motion:reduce) { #" + GLOW_ID + " { transition:none; } }",
      "@media(max-width:700px) { #" + MOON_ID + " { width:112px; right:24px; top:72px; opacity:.9; } }",
      "body[data-ds-dark-theme] ::selection { background:rgba(122,162,255,.30); }"
    ].join("\n");

    function mount() {
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
      var astronauts = document.createElement("canvas");
      astronauts.id = ASTRONAUT_ID;
      astronauts.width = 640;
      astronauts.height = 427;
      astronauts.setAttribute("aria-hidden", "true");
      var meteors = document.createElement("div");
      meteors.id = METEOR_ID;
      meteors.setAttribute("aria-hidden", "true");
      layer.appendChild(stars);
      var glow = document.createElement("div");
      glow.id = GLOW_ID;
      glow.setAttribute("aria-hidden", "true");
      var exhaust = document.createElement("div");
      exhaust.id = EXHAUST_ID;
      exhaust.setAttribute("aria-hidden", "true");
      exhaust.setAttribute("data-active", "false");
      exhaust.appendChild(document.createElement("span"));
      exhaust.appendChild(document.createElement("span"));
      var sparks = document.createElement("div");
      sparks.id = SPARKS_ID;
      sparks.setAttribute("aria-hidden", "true");
      var observer = null;
      var menuObserver = null;
      var menuSheets = [];
      var timer = null;
      var disposed = false;
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
      function positionExhaust() {
        exhaust.style.transform = "translate3d(" + (pointerX + 15) + "px," + (pointerY + 15) + "px,0) rotate(-45deg)";
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
        if (!(motionQuery && motionQuery.matches)) boostTimer = window.setTimeout(emitSpark, 65);
      }
      function stopBoost() {
        boosting = false;
        if (boostTimer !== null) window.clearTimeout(boostTimer);
        boostTimer = null;
        exhaust.setAttribute("data-active", "false");
      }
      function startBoost(event) {
        if (disposed || event.button !== 0 || event.pointerType === "touch") return;
        updateThemedCursor(event);
        if (document.body.getAttribute(CURSOR_ATTRIBUTE) !== "rocket" && !inMenu(realTarget(event))) return;
        pointerX = event.clientX;
        pointerY = event.clientY;
        positionExhaust();
        if (boosting) return;
        boosting = true;
        exhaust.setAttribute("data-active", "true");
        emitSpark();
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
          astronauts.setAttribute("data-orbit-hidden", "true"); return;
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
          if (!root || root.getElementById(STYLE_ID + "-menubar")) return;
          var sheet = document.createElement("style");
          sheet.id = STYLE_ID + "-menubar";
          sheet.textContent = ":host, :host * { cursor:" + ROCKET_CURSOR + " !important; }";
          root.appendChild(sheet);
          menuSheets.push(sheet);
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
        var length = far ? 55 + Math.random() * 65 : 110 + Math.random() * 100;
        var angle = 22 + Math.random() * 24;
        var radians = angle * Math.PI / 180;
        var distance = Math.min(820, Math.max(240, w * (0.22 + Math.random() * 0.3)));
        var dx = Math.cos(radians) * distance;
        var dy = Math.sin(radians) * distance;
        slot.node.style.width = length + "px";
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
          cursorTarget = target;
          body.removeAttribute(CURSOR_ATTRIBUTE);
          var original = window.getComputedStyle(target);
          cursorNative = original.cursor;
          cursorSelectable = original.userSelect !== "none" && !target.closest('button,a[href],label,summary,[role="button"],[role="tab"],[role="menuitem"],[role="option"]');
        }
        // Resize, disabled, vertical text and drag cursors stay native.
        if (inMenu(target)) {
          body.setAttribute(CURSOR_ATTRIBUTE, "rocket");
        } else if (cursorNative === "text") {
          body.setAttribute(CURSOR_ATTRIBUTE, "text");
        } else if (cursorNative === "auto" || cursorNative === "default" || cursorNative === "pointer") {
          var text = isTextInput(target) || (cursorNative !== "pointer" && cursorSelectable && hitsText(event.clientX, event.clientY));
          body.setAttribute(CURSOR_ATTRIBUTE, text ? "text" : "rocket");
        } else {
          body.removeAttribute(CURSOR_ATTRIBUTE);
        }
        if (boosting && body.getAttribute(CURSOR_ATTRIBUTE) !== "rocket") stopBoost();
        var context = isTextInput(target) || target.closest("[data-composer-card]") ? "input" : body.getAttribute(CURSOR_ATTRIBUTE) === "text" || target.closest("[data-chat-flow-key]") ? "reading" : "space";
        glow.setAttribute("data-context", context);
      }

      // Coalesce pointer events into one composited transform per display frame.
      // Separate from the star layer so it also lights opaque panels and menus.
      function moveGlow(event) {
        if (disposed) return;
        if (event.pointerType === "touch") { hideGlow(); return; }
        if (boosting && !(event.buttons & 1)) stopBoost();
        pointerEvent = event;
        pointerX = event.clientX;
        pointerY = event.clientY;
        if (glowFrame) return;
        glowFrame = window.requestAnimationFrame(function () {
          glowFrame = 0;
          if (disposed) return;
          updateThemedCursor(pointerEvent);
          if (boosting) positionExhaust();
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
      function visibility() {
        if (document.hidden) hideGlow();
        syncMeteors();
      }

      function paint() {
        if (disposed) return;
        try { renderStars(stars, document.body.hasAttribute("data-ds-dark-theme")); }
        catch (_) { /* A decorative canvas must never stop the application. */ }
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
        if (body && !astronauts.parentNode) body.appendChild(astronauts);
        if (body && !meteors.parentNode) body.appendChild(meteors);
        if (body && !glow.parentNode) body.appendChild(glow);
        if (body && !sparks.parentNode) body.appendChild(sparks);
        if (body && !exhaust.parentNode) body.appendChild(exhaust);
        try { renderMoon(moon); } catch (_) {}
        renderAstronauts(astronauts).catch(function () { /* Decorative only. */ });
        paint();
        initMeteors();
        installMenuCursor();
        scheduleLayout();
        if (typeof window.addEventListener === "function") {
          window.addEventListener("resize", resize);
          window.addEventListener("blur", hideGlow);
          window.addEventListener("pagehide", hideGlow);
          window.addEventListener("pointerup", endBoost, true);
        }
        if (typeof document.addEventListener === "function") {
          document.addEventListener("pointermove", moveGlow, { capture:true, passive:true });
          document.addEventListener("pointerdown", startBoost, { capture:true, passive:true });
          document.addEventListener("scroll", layoutScrolled, { capture:true, passive:true });
          document.addEventListener("pointerleave", hideGlow);
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
        if (motionQuery) motionQuery.removeEventListener("change", syncMeteors);
        hideGlow();
        if (layoutFrame) window.cancelAnimationFrame(layoutFrame);
        sparkNodes.forEach(function (node) { node.getAnimations().forEach(function (animation) { animation.cancel(); }); node.remove(); });
        sparkNodes.clear();
        if (observer) observer.disconnect();
        if (menuObserver) menuObserver.disconnect();
        if (uiObserver) uiObserver.disconnect();
        menuSheets.forEach(function (sheet) { if (sheet.parentNode) sheet.parentNode.removeChild(sheet); });
        if (typeof window.removeEventListener === "function") {
          window.removeEventListener("resize", resize);
          window.removeEventListener("blur", hideGlow);
          window.removeEventListener("pagehide", hideGlow);
          window.removeEventListener("pointerup", endBoost, true);
        }
        if (typeof document.removeEventListener === "function") {
          document.removeEventListener("DOMContentLoaded", attach);
          document.removeEventListener("pointermove", moveGlow, true);
          document.removeEventListener("pointerdown", startBoost, true);
          document.removeEventListener("scroll", layoutScrolled, true);
          document.removeEventListener("pointerleave", hideGlow);
          document.removeEventListener("pointercancel", hideGlow, true);
          document.removeEventListener("visibilitychange", visibility);
        }
        if (el.parentNode) el.parentNode.removeChild(el);
        if (layer.parentNode) layer.parentNode.removeChild(layer);
        if (moon.parentNode) moon.parentNode.removeChild(moon);
        if (astronauts.parentNode) astronauts.parentNode.removeChild(astronauts);
        if (meteors.parentNode) meteors.parentNode.removeChild(meteors);
        if (glow.parentNode) glow.parentNode.removeChild(glow);
        if (exhaust.parentNode) exhaust.parentNode.removeChild(exhaust);
        if (sparks.parentNode) sparks.parentNode.removeChild(sparks);
      };
    }

    return {
      inject:["theme"],
      apply: (ctx) => {
        var install = () => {
          var disposeTokens = ctx.theme.overrideTokens(SOURCE, TOKENS);
          var disposeStyle = mount();
          return () => { disposeStyle(); disposeTokens(); };
        };
        if (typeof ctx.effect === "function") ctx.effect(install);
        else install();
      }
    };
  }
});
