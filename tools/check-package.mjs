import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const pkg=JSON.parse(fs.readFileSync(root+'package.json','utf8'));
const source=fs.readFileSync(root+'lib/client.js','utf8');
let definition;
vm.runInNewContext(source,{window:{__ModuleLoader__:{load:value=>definition=value}}});
assert.equal(definition.id,pkg.name);
assert.doesNotMatch(source,/__ORBIT_[A-Z_]+__/);
const plugin=definition.factory();let captured,disposed=false;
plugin.apply({effect:install=>{const dispose=install();dispose();},theme:{overrideTokens:(name,tokens)=>{captured=tokens;assert.equal(name,pkg.name);return()=>disposed=true;}}});
assert.equal(disposed,true);
assert.equal(Object.keys(captured).length,14);
for(const [name,value]of Object.entries(captured)){assert.match(name,/^--dsw-(alias|specific)-/);assert.equal(typeof value.light,'string');assert.equal(typeof value.dark,'string');}
for(const file of ['lib/index.js','lib/client.js','cordis.patch.yml','README.md','LICENSE','THIRD_PARTY_NOTICES.md','CHANGELOG.md'])assert.ok(fs.statSync(root+file).isFile());
const host=await import(new URL('../lib/index.js',import.meta.url));assert.equal(typeof host.apply,'function');
console.log('PASS:',pkg.name,pkg.version,'loader, host/client exports, 14 light/dark tokens, no-DOM lifecycle, build placeholders and package files.');
