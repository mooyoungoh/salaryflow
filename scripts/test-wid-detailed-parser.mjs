import assert from 'node:assert/strict';
import {parseWidRows,THRESHOLD,PRICE} from './build-wid-detailed.mjs';
const header='country;variable;percentile;year;value;age;pop';
const lines=[header,...Array.from({length:99},(_,i)=>'US;'+THRESHOLD+';p'+(i+1)+'p100;2024;'+(i+1)*1000+';992;j'),
 'US;'+PRICE+';p0p100;2024;1.2;999;i',
 'KR;'+THRESHOLD+';p99p100;2024;9999999;992;j',
 'US;'+THRESHOLD+';p99p100;2023;999;992;j'
];
const rows=parseWidRows(lines,'US');
assert.equal(rows.length,99);
assert.deepEqual(rows[49],[50,60000]);
assert.deepEqual(rows[98],[99,118800]);
assert.throws(()=>parseWidRows(lines.filter(v=>!v.includes('p99p100;2024')),'US'),/missing required/);
assert.throws(()=>parseWidRows(lines.filter(v=>!v.includes(';p0p100;')),'US'),/price index/);
assert.throws(()=>parseWidRows(lines.concat('US;'+THRESHOLD+';p90p100;2024;90000;992;j'),'US'),/Duplicate/);
console.log('PASS: official WID rows, price conversion, target year and completeness');
