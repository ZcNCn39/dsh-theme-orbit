import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=fs.readFileSync(path.join(root,'lib/client.js'),'utf8');
const html=`<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Orbit · Theme Preview</title><style>
*{box-sizing:border-box}html,body{height:100%;margin:0}body{font:15px/1.6 "Segoe UI","Microsoft YaHei",sans-serif;color:var(--dsw-alias-label-primary)}
.app{position:fixed;inset:0;display:flex;background:var(--dsw-specific-sidebar-fill)}
aside{width:280px;flex:none;padding:26px 20px;background:var(--dsw-specific-sidebar-fill);border-right:1px solid var(--dsw-alias-border-l1)}
.brand{font-size:25px;font-weight:650;letter-spacing:1px;margin-bottom:30px}.brand small{font-size:10px;font-weight:400;letter-spacing:2px;color:var(--dsw-alias-label-secondary)}
button{font:inherit;color:inherit;border:1px solid var(--dsw-alias-border-l2);border-radius:12px;background:var(--dsw-alias-bg-layer-1);padding:10px 14px;cursor:pointer}
aside button{width:100%;margin-bottom:30px}.muted{color:var(--dsw-alias-label-secondary)}.label{font-size:12px;letter-spacing:2px;margin:26px 0 10px}
.item{padding:10px 12px;margin-bottom:4px;border-radius:9px}.selected{background:var(--dsw-alias-bg-layer-2)}
main{position:relative;flex:1;min-width:0;background:var(--dsw-alias-bg-base)}header{height:62px;padding:0 30px;display:flex;align-items:center;gap:20px;border-bottom:1px solid var(--dsw-alias-border-l1);font-size:13px}
header button{margin-left:auto;padding:5px 12px}.intro{position:absolute;top:38%;left:12%;right:12%;text-align:center}.intro h1{font-size:46px;letter-spacing:8px;margin:0 0 8px}.intro p{color:var(--dsw-alias-label-secondary);letter-spacing:3px;margin:0}
.compose{position:absolute;top:59%;left:12%;right:12%;border:1px solid var(--dsw-alias-border-l2);border-radius:22px;background:var(--dsw-alias-bg-layer-1);padding:18px 20px}
textarea{display:block;width:100%;height:65px;border:0;resize:none;background:transparent;color:inherit;font:inherit;outline:none}textarea::placeholder{color:var(--dsw-alias-label-secondary)}
.toolbar{display:flex;align-items:center;justify-content:space-between;margin-top:10px;color:var(--dsw-alias-label-secondary);font-size:12px}.toolbar button{border-radius:50%;padding:4px 12px;color:var(--dsw-alias-brand-primary)}
.caption{position:absolute;bottom:20px;left:0;right:0;text-align:center;color:var(--dsw-alias-label-secondary);font-size:11px;letter-spacing:1px}
@media(max-width:900px){aside{width:200px}.intro,.compose{left:7%;right:7%}.intro h1{font-size:32px}}
</style></head><body data-ds-dark-theme>
<div class="app"><aside><div class="brand">ORBIT <small>SPACE THEME</small></div><button>＋ 新会话</button>
<div class="muted">◇ 插件</div><div class="label muted">工作区</div><div class="item selected" data-row-key="workspace:demo">▱ orbit-demo</div><div class="item muted">▱ theme-preview</div>
<div class="label muted">探索</div><div class="item muted" data-preview-celestial>月面与星空</div><div class="item muted">随机流星</div><div class="item muted" data-preview-character>漂浮宇航员</div></aside>
<main><header><span>Orbit · 轨道</span><span class="muted">独立主题演示</span><button id="scheme">切换明暗</button></header>
<section class="intro"><h1>探索深空</h1><p>把灵感留在星河之间</p></section>
<div class="compose" data-composer-card><textarea aria-label="演示输入框" placeholder="从这里开始，写下你的下一个想法…"></textarea><div class="toolbar"><span>＋　太空主题 · 演示工作区</span><button aria-label="演示按钮">↑</button></div></div>
<div class="caption">ORBIT / COMMUNITY THEME / INDEPENDENT PREVIEW</div></main></div>
<script>window.__ModuleLoader__={load:d=>window.orbitModule=d};</script>
<script>${source.replace(/<\/script/gi,'<\\/script')}</script>
<script>
var tokens;function syncScheme(){var mode=document.body.hasAttribute('data-ds-dark-theme')?'dark':'light';Object.entries(tokens).forEach(([name,pair])=>document.body.style.setProperty(name,pair[mode]));document.querySelector('[data-preview-celestial]').textContent=mode==='dark'?'月面与星空':'太阳与星云';document.querySelector('[data-preview-character]').textContent=mode==='dark'?'漂浮宇航员':'燃烧的骷髅';}
window.orbitPreviewTheme={overrideTokens:(source,t)=>{tokens=t;syncScheme();return ()=>{};},getTheme:()=>({active:{colorScheme:document.body.hasAttribute('data-ds-dark-theme')?'dark':'light'}}),setTheme:mode=>{document.body.toggleAttribute('data-ds-dark-theme',mode==='dark');syncScheme();}};
window.orbitModule.factory().apply({effect:f=>window.disposeOrbit=f(),theme:window.orbitPreviewTheme});
document.getElementById('scheme').onclick=()=>{document.body.toggleAttribute('data-ds-dark-theme');syncScheme();};
</script></body></html>`;
fs.mkdirSync(path.join(root,'docs'),{recursive:true});
fs.writeFileSync(path.join(root,'docs/preview.html'),html);
console.log('Open docs/preview.html in a browser.');
