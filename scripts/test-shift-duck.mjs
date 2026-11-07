// Regression tests for the always-visible, lightweight salary-flow shift duck.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const html=readFileSync('index.html','utf8');
for(const id of ['dashboardDuck','duckScene','duckCaption'])assert(html.includes('id="'+id+'"'),'Missing '+id);
assert(html.includes('<svg class="duck-art" viewBox="0 0 172 154"'),'Mascot must be an inline vector with predefined dimensions');
assert(html.includes('aria-hidden="true"'),'Mascot SVG must not add noisy screenreader markup');
assert(html.includes('prefers-reduced-motion:reduce'),'Reduced motion preference required');
assert(html.includes('.duck-hero{display:grid'),'Ducky must be in card grid');
assert(html.includes('data-duck-theme="before"'),'Reserved initial theme required');
assert(html.includes('if(state===lastDuckState&&lastDuckLang===lang)return;'),'Mascot should not rerender on 200ms ticks');
assert(html.includes('overtimeWorking=true'),'OT must take precedence over normal progress');
assert(html.includes('updateShiftDuck({scheduled:scheduledEnd.length>0,working,overtime:overtimeWorking'),'Mascot must reflect real multi-job schedule');

const start=html.indexOf('function shiftDuckState(');
const end=html.indexOf('\nfunction render(){',start);
assert(start>=0&&end>start,'Duck state function missing');
const ctx={};vm.createContext(ctx);vm.runInContext(html.slice(start,end)+';globalThis.state=shiftDuckState;',ctx);
const base={scheduled:true,working:true,overtime:false,now:12*3600,firstStart:9*3600,latestEnd:17*3600,progress:.35};
const cases=[
 ['off',{...base,scheduled:false,working:false}],
 ['before',{...base,now:8*3600,working:false}],
 ['start',{...base,progress:.1}],
 ['focus',{...base,progress:.35}],
 ['steady',{...base,progress:.65}],
 ['almost',{...base,progress:.9}],
 ['almost',{...base,now:16*3600+30*60}],
 ['done',{...base,now:18*3600,working:false}],
 ['overtime',{...base,now:19*3600,working:true,overtime:true}],
 ['break',{...base,now:13*3600,working:false}]
];
for(const [want,input] of cases)assert.equal(ctx.state(input),want,'Wrong mascot state: '+want);
const sourceCss=html.slice(html.indexOf('<style>'),html.indexOf('</style>'));
assert(!/url\(https?:/i.test(sourceCss),'Mascot must not use third-party heavyweight images');
console.log('PASS: shift duck 10 cases, work/OT conditions, inline vector, reduced-motion and stable rendering');
