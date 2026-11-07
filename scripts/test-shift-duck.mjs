// Regression tests for the always-visible, lightweight salary-flow shift duck.
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import vm from 'node:vm';
process.env.TZ='UTC'; // shiftDuckState uses local wall-clock hours
const html=readFileSync('index.html','utf8');
for(const id of ['dashboardDuck','duckScene','duckCaption'])assert(html.includes('id="'+id+'"'),'Missing '+id);
assert(/<img class="duck-art" id="duckStateArt" src="assets\/ducks\/[A-Za-z0-9_]+\.svg"/.test(html),'Mascot must be a local SVG asset');
{const block=html.slice(html.indexOf('const DUCK_STATE_ASSETS={'),html.indexOf('};',html.indexOf('const DUCK_STATE_ASSETS={')));
 const files=[...block.matchAll(/'([A-Za-z0-9_]+\.svg)'/g)].map(m=>m[1]);
 assert(files.length>=18,'Duck asset map too small');
 for(const f of files)assert(existsSync('assets/ducks/'+f),'Missing duck asset '+f);}
assert(html.includes('aria-hidden="true"'),'Mascot SVG must not add noisy screenreader markup');
assert(html.includes('prefers-reduced-motion:reduce'),'Reduced motion preference required');
assert(html.includes('.duck-hero{display:grid'),'Ducky must be in card grid');
assert(html.includes('data-duck-theme="before"'),'Reserved initial theme required');
assert(html.includes("if(state===lastDuckState&&lastDuckLang===lang&&$('#duckScene').dataset.duckPose===pose)return;"),'Mascot should not rerender on 200ms ticks');
assert(html.includes('overtimeWorking=true'),'OT must take precedence over normal progress');
assert(html.includes('updateShiftDuck({scheduled:scheduledEnd.length>0,working,overtime:overtimeWorking'),'Mascot must reflect real multi-job schedule');

const start=html.indexOf('function shiftDuckState(');
const end=html.indexOf('\nfunction render(){',start);
assert(start>=0&&end>start,'Duck state function missing');
const ctx={$:()=>null};vm.createContext(ctx);vm.runInContext(html.slice(start,end)+';globalThis.state=shiftDuckState;',ctx);
const base={scheduled:true,working:true,overtime:false,now:12*3600,firstStart:9*3600,latestEnd:17*3600,progress:.35};
const cases=[
 ['off',{...base,scheduled:false,working:false}],
 ['before',{...base,now:8*3600,working:false}],
 ['start',{...base,progress:.1}],
 ['focus',{...base,now:13.5*3600,progress:.5}],
 ['lunch',{...base,now:11.75*3600,progress:.35}],
 ['afternoon',{...base,now:15.5*3600,progress:.7}],
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
console.log('PASS: shift duck '+cases.length+' cases, work/OT conditions, local SVG assets, reduced-motion and stable rendering');
