// Bounded, reusable pools. Only transform/opacity animate on the compositor;
// there is no JS animation loop, per-pointer work, or recurring DOM allocation.
function createOrbitSolarParticles(solarRoot, emberRoot) {
  var disposed = false;
  var motion = typeof window.matchMedia === "function" ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  var corona = [], embers = [];
  function particle(root, kind, x, y, dx, dy, duration, phase, streak) {
    var node = document.createElement("span");
    node.setAttribute("data-solar-particle", kind);
    if (streak) node.setAttribute("data-streak", "true");
    node.style.left = x + "%"; node.style.top = y + "%";
    root.appendChild(node);
    var rotation = kind === "corona" ? Math.atan2(dy, dx) * 180 / Math.PI - 90 : -20 + Math.random() * 40;
    return {
      node:node, animation:null,
      frames:[
        { transform:"translate3d(0,0,0) rotate(" + rotation + "deg) scale(.4)", opacity:0, offset:0 },
        { opacity:kind === "corona" ? 0.95 : 1, offset:0.16 },
        { transform:"translate3d(" + dx * 0.55 + "px," + dy * 0.55 + "px,0) rotate(" + (rotation + 12) + "deg) scale(1)", opacity:0.7, offset:0.58 },
        { transform:"translate3d(" + dx + "px," + dy + "px,0) rotate(" + (rotation + 28) + "deg) scale(.15)", opacity:0, offset:1 }
      ],
      timing:{ duration:duration, delay:-phase * duration, iterations:Infinity, easing:"linear" }
    };
  }
  function buildCorona() {
    if (corona.length) return;
    for (var i = 0; i < 16; i++) {
      var angle = i / 16 * Math.PI * 2 + (Math.random() - 0.5) * 0.22;
      var reach = 26 + Math.random() * 38;
      corona.push(particle(solarRoot, "corona", 50 + Math.cos(angle) * 42, 50 + Math.sin(angle) * 42,
        Math.cos(angle) * reach, Math.sin(angle) * reach, 2600 + Math.random() * 2000, Math.random(), i % 4 === 0));
    }
  }
  function buildEmbers() {
    if (embers.length) return;
    // Match the skull, raised hands, ribcage and feet of the pose reference.
    var origins = [[23,20],[8,14],[59,12],[37,43],[52,60],[73,83],[92,72]];
    for (var i = 0; i < 18; i++) {
      var origin = origins[i % origins.length];
      embers.push(particle(emberRoot, "ember", origin[0] + (Math.random() - 0.5) * 7,
        origin[1] + (Math.random() - 0.5) * 9, (Math.random() - 0.5) * 40,
        -32 - Math.random() * 54, 2200 + Math.random() * 1900, Math.random(), i % 5 === 0));
    }
  }
  function setRunning(root, pool, enabled) {
    pool.forEach(function (slot) {
      if (enabled && !slot.animation && typeof slot.node.animate === "function") slot.animation = slot.node.animate(slot.frames, slot.timing);
      else if (!enabled && slot.animation) { slot.animation.cancel(); slot.animation = null; }
    });
    var state = enabled ? "true" : "false";
    if (root.getAttribute("data-active") !== state) root.setAttribute("data-active", state);
  }
  function sync() {
    if (disposed) return;
    var enabled = !document.hidden && document.body && !document.body.hasAttribute("data-ds-dark-theme") && !(motion && motion.matches);
    var showEmbers = enabled && window.innerWidth > 900 && window.innerHeight > 620 && emberRoot.getAttribute("data-orbit-hidden") !== "true";
    if (enabled) buildCorona();
    if (showEmbers) buildEmbers();
    setRunning(solarRoot, corona, enabled);
    setRunning(emberRoot, embers, showEmbers);
  }
  if (motion) motion.addEventListener("change", sync);
  return {
    sync:sync,
    dispose:function () {
      if (disposed) return;
      disposed = true;
      if (motion) motion.removeEventListener("change", sync);
      setRunning(solarRoot, corona, false); setRunning(emberRoot, embers, false);
      corona.concat(embers).forEach(function (slot) { slot.node.remove(); });
      corona = []; embers = [];
    }
  };
}
