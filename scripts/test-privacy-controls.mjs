// Regression guards for privacy control latency and layout across staging/production.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const html=readFileSync('index.html','utf8');
const css=html.slice(html.indexOf('<style>'),html.indexOf('</style>'));
assert(css.includes('grid-template-columns:minmax(0,1fr) 40px'),'Privacy button column must be stable');
assert(css.includes('align-self:center'),'Eye button must stay vertically centered');
assert(!css.includes('margin-top:20px}.amount'),'Old shifted dashboard eye rule remains');
const apply=html.match(/function applyPrivacy\(\)\{[\s\S]*?\}\nfunction setMoney\(/);
assert(apply,'Privacy update function missing');
const privacyCode=apply[0].replace(/\nfunction setMoney\($/,'');
assert(privacyCode.includes('button.dataset.concealed!==String(concealed)'),'Eye DOM should only replace SVG on state change');
const clickStart=html.indexOf("document.querySelectorAll('[data-hide]').forEach(");
const clickEnd=html.indexOf("$('#privacyAll').onclick",clickStart);
assert(clickStart>=0&&clickEnd>clickStart,'Privacy click handler missing');
const handler=html.slice(clickStart,clickEnd);
assert(handler.includes('applyPrivacy()}));'),'Click should update immediately');
assert(!handler.includes('applyPrivacy();render()'),'Click must not trigger expensive full render');
const elems=new Map();
let svgWrites=0;
const makeEl=()=>({
 dataset:{raw:'$100'},
 classList:{_s:new Set(),toggle(c,on){(on??!this._s.has(c))?this._s.add(c):this._s.delete(c)},contains(c){return this._s.has(c)}},
 setAttribute(){},
 get textContent(){return this._text||''},
 set textContent(v){this._text=v},
 get innerHTML(){return this._html||''},
 set innerHTML(v){svgWrites++;this._html=v},
 title:''
});
for(const key of ['today','target','remaining','rate','lifetime','week','year','day']){
 elems.set('[data-money="'+key+'"]',makeEl());
 elems.set('[data-hide="'+key+'"]',makeEl());
}
elems.set('#privacyAll',makeEl());
const hidden=new Set();
const context={hidden,moneyKeys:['today','target','remaining','rate','lifetime','week','year','day'],
 $:query=>elems.get(query),eyeOn:'eye-visible',eyeOff:'eye-concealed',tr:a=>a};
vm.createContext(context);
vm.runInContext(privacyCode+';globalThis.update=applyPrivacy;',context);
context.update();
const initial=svgWrites;
for(let i=0;i<10;i++)context.update();
assert.equal(svgWrites,initial,'Unchanged icon SVG was unnecessarily replaced during render');
hidden.add('today');
context.update();
assert.equal(elems.get('[data-money="today"]').textContent,'••••••');
assert.equal(svgWrites,initial+1,'Only the changed eye icon should update');
hidden.delete('today');
context.update();
assert.equal(elems.get('[data-money="today"]').textContent,'$100');
assert.equal(svgWrites,initial+2,'Reveal should update the relevant eye once');
console.log('PASS: privacy layout, immediate click path, stable SVG DOM, hide and reveal regression');
