import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync('index.html','utf8');
const start=html.indexOf('function drawJobs(){');
const end=html.indexOf(" $$('.job').forEach",start);
assert(start>=0&&end>start,'Could not find Job renderer');
const draw=html.slice(start,end);
assert(draw.includes(".join('')}</div></div></div><section class=\"overtime-panel\""),'Close workday field and schedule grid before overtime panel');
assert(draw.includes('<section class="overtime-panel" aria-label='),'Use dedicated overtime panel');
assert(draw.includes('<div class="overtime-grid">'),'Overtime requires its own grid');
assert(draw.includes('</p></div></section><p class="job-note">예상 연간 보너스:'),'Close overtime panel before pay summary');
assert(draw.includes("tr('사용 여부','Enable overtime')"),'Avoid repeating overtime title');
for(const control of ['enabled','hours','multiplier','custom']){
 assert(draw.includes('data-ot="'+control+'"'),'Missing overtime '+control+' control');
}
assert(html.includes('.overtime-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))'),'Desktop: two columns');
assert(html.includes('@media(max-width:520px){.overtime-panel{padding:13px}.overtime-grid{grid-template-columns:1fr}'),'Mobile: one column');
assert(html.includes('.overtime-grid .field{min-width:0}'),'Prevent overflow');
const overtimeMarkup=draw.slice(draw.indexOf('<section class="overtime-panel"'),draw.indexOf('</section>')+10);
assert(!overtimeMarkup.includes('<div class="form">'),'Avoid nested generic form grid');
console.log('PASS: isolated overtime panel, responsive grid, preserved controls');
