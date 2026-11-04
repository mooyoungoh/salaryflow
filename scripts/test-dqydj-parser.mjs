import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseDqydj,sourceEdition,STATE_NAMES} from './collect-dqydj.mjs';
const snapshot=JSON.parse(readFileSync('data/income-us-2026.json'));
const fmt=n=>'$'+n.toLocaleString('en-US');
const rows=Object.entries(STATE_NAMES).map(([name,abbr])=>{
 const a=snapshot.values[abbr];
 return '<tr><td>'+name+'</td>'+a.map(v=>'<td>'+fmt(v)+'</td>').join('')+'<td>$123,456</td></tr>';
}).join('\n');
const summary='<p>Nationwide in 2026, here is a summary of individual income statistics:</p><ul>'+
 '<li>Average individual income was $82,031</li>'+
 '<li>Median individual income was $55,584</li>'+
 '<li>Top 1% individual income was $507,102</li>'+
 '<li>25th percentile individual income was $30,000</li>'+
 '<li>75th percentile individual income was $99,500</li></ul>';
const html='<h1>Income by State</h1><p>On this page are 2026 income by state statistics.</p>'+
 '<p>Enter pre-tax (gross) income earned between January and December 2025.</p>'+
 '<h2>Household income by state: average, median, and top 1%</h2><table><tr><td>Arizona</td><td>$1</td></tr></table>'+
 '<h2>Individual income by state: average, median, and top 1%</h2>'+summary+
 '<table><thead><tr><th>State</th><th>25%</th><th>Median</th><th>75%</th><th>Top 1%</th><th>Average</th></tr></thead><tbody>'+rows+'</tbody></table>'+
 '<h2>Estimates of number of workers and households</h2>';
assert.equal(sourceEdition(html),2026);
assert.deepEqual(parseDqydj(html,2026),snapshot.values);
assert.throws(()=>parseDqydj(html.replace('December 2025','December 2024'),2026),/income period mismatch/);
assert.throws(()=>parseDqydj(html.replace(rows.split('\n')[0],''),2026),/(Incomplete|too short)/);
assert.throws(()=>parseDqydj(html.replace('Individual income by state:','Household income by state:'),2026),/individual income section/);
assert.throws(()=>parseDqydj(html.replace('2026 income by state statistics','2025 income by state statistics'),2026),/edition year missing/);
console.log('PASS: DQYDJ individual income section parser, exact 52-row mapping, year mismatch and missing data rejection');
