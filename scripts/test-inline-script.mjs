// Static syntax check for browser JavaScript; catches broken inline updates
// without requiring a browser, package install or external network.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync('index.html','utf8');
const matches=[...source.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)];
assert(matches.length>0,'No executable inline script found');
let tested=0;
for(const match of matches){
 const script=match[1];
 if(!script.trim())continue;
 new vm.Script(script,{filename:'index.html-inline-'+(++tested)+'.js'});
}
assert(tested>0,'No JavaScript was parsed');
assert(source.includes('const ARIZONA_RULES=REFERENCE_DATA.arizona;'),'Arizona reference missing');
assert(source.includes("REFERENCE_BASELINE.arizona="),'Arizona permanent fallback missing');
assert(source.includes("REFERENCE_BASELINE.payroll="),'Payroll permanent fallback missing');
console.log('PASS: '+tested+' inline browser scripts parse and include safe tax references');
