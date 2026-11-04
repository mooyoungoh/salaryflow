// Integration test against actual IRS 2026 bulletin; does not write any data.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseIrsBulletin} from './irs-tax-parser.mjs';
const source='https://www.irs.gov/irb/2025-45_IRB';
const controller=new AbortController();
const timeout=setTimeout(()=>controller.abort(),25000);
let resp;
try{resp=await fetch(source,{signal:controller.signal,headers:{'User-Agent':'SalaryFlow Tax Reference Validator','Accept':'text/html'}})}
finally{clearTimeout(timeout)}
assert(resp.ok,'IRS HTTP '+resp.status);
const raw=await resp.text();
try{const {htmlToLines}=await import('./irs-tax-parser.mjs');const lines=htmlToLines(raw);const k=lines.findIndex(x=>x.includes('SECTION 4. 2026 ADJUSTED'));console.log('DEBUG section index '+k+' nearby headings '+JSON.stringify(lines.slice(k,k+55).filter(x=>/TABLE|Tax Rate Tables|not over|Standard Deduction|Section 1\(j\)/i.test(x)).slice(0,30)));}catch(e){console.log('DEBUG parse '+e.message)}
const actual=parseIrsBulletin(raw,2026,source);
const expected=JSON.parse(readFileSync(new URL('../data/tax-2026.json',import.meta.url)));
assert.deepEqual(actual.values,expected.values,'Live IRS data does not match the current 2026 baseline');
console.log('PASS: official IRS page returns all 2026 deductions and 24 boundaries matching current stored data');
