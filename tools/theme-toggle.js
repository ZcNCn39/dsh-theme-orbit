// A theme-owned caption control next to the preload's Application/Edit menus.
// Use the host service so settings, tokens, native caption colors and theme
// artwork all change together, and the host persists the user's preference.
function createOrbitThemeToggle(theme) {
  var ID = "dsh-theme-orbit-ratio";
  var mounts = [], disposed = false;
  function isDark() {
    try {
      var snapshot = theme && typeof theme.getTheme === "function" ? theme.getTheme() : null;
      if (snapshot && snapshot.active) return snapshot.active.colorScheme === "dark";
    } catch (_) {}
    return !!document.body && document.body.hasAttribute("data-ds-dark-theme");
  }
  function sync() {
    if (disposed) return;
    var dark = isDark();
    mounts.forEach(function (item) {
      item.button.setAttribute("aria-checked", String(dark));
      item.button.setAttribute("data-mode", dark ? "dark" : "light");
      item.button.title = (dark ? "当前深色 · 点击切换浅色模式" : "当前浅色 · 点击切换深色模式");
    });
  }
  function remove(item) {
    item.button.removeEventListener("pointerdown", item.keepFocus);
    item.button.removeEventListener("mousedown", item.keepFocus);
    item.button.removeEventListener("click", item.toggle);
    item.button.remove(); item.sheet.remove();
  }
  return {
    install:function (root) {
      if (disposed || !root || !root.querySelector('[role="menubar"]') || !theme || typeof theme.setTheme !== "function") return;
      mounts = mounts.filter(function (item) { if (item.root.host.isConnected) return true; remove(item); return false; });
      if (root.getElementById(ID)) return;
      var sheet = document.createElement("style");
      sheet.id = ID + "-style";
      sheet.textContent = '#' + ID + '{display:inline-flex;align-items:center;gap:6px;margin-left:4px;white-space:nowrap;-webkit-app-region:no-drag}' +
        '#' + ID + ' svg{width:14px;height:14px;flex:none;stroke:currentColor;fill:none;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}' +
        '#' + ID + '[data-mode=dark] [data-ratio-sun],#' + ID + '[data-mode=light] [data-ratio-moon]{display:none}' +
        '#' + ID + ' svg{color:var(--dsw-alias-brand-primary)}';
      var button = document.createElement("button");
      button.id = ID; button.type = "button";
      button.setAttribute("data-orbit-theme-toggle", "");
      button.setAttribute("role", "switch");
      button.setAttribute("aria-label", "Ratio 深色模式");
      button.innerHTML = '<span>Ratio</span><svg data-ratio-sun viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></svg><svg data-ratio-moon viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 14a8.6 8.6 0 0 1-10.5-10.5A8.7 8.7 0 1 0 20.5 14Z"/></svg>';
      var item = {root:root,button:button,sheet:sheet};
      item.keepFocus = function (event) { if (event.button === 0) event.preventDefault(); };
      item.toggle = function () {
        if (disposed) return;
        try {
          var result = theme.setTheme(isDark() ? "light" : "dark");
          sync();
          if (result && typeof result.then === "function") result.then(sync, function () { button.title = "主题切换失败，请重试"; });
        } catch (_) { button.title = "主题切换失败，请重试"; }
      };
      button.addEventListener("pointerdown", item.keepFocus);
      button.addEventListener("mousedown", item.keepFocus);
      button.addEventListener("click", item.toggle);
      // A sibling of the menubar preserves its existing arrow-key navigation.
      root.appendChild(sheet); root.appendChild(button); mounts.push(item); sync();
    },
    sync:sync,
    dispose:function () { if (disposed) return; disposed = true; mounts.forEach(remove); mounts = []; }
  };
}
