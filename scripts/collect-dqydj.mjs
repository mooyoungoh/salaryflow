// DQYDJ individual pre-tax income by state (25th, 50th, 75th, top-1%).
// Strict source review: never auto-merge DQYDJ candidates into staging or production.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,appendFileSync} from 'node:fs';
const SOURCE='https://dqydj.com/income-by-state/';
const manifest=JSON.parse(readFileSync(new URL('../data/manifest.json',import.meta.url)));
const current=JSON.parse(readFileSync(new URL('../'+manifest.us.path,import.meta.url)));
const names=[
['AL','Alabama'],['AK','Alaska'],['AZ','Arizona'],['AR','Arkansas'],['CA','California'],
['CO','Colorado'],['CT','Connecticut'],['DE','Delaware'],['DC','District of Columbia'],
['FL','Florida'],['GA','Georgia'],['HI','Hawaii'],['ID','Idaho'],['IL','Illinois'],
['IN','Indiana'],['IA','Iowa'],['KS','Kansas'],['KY','Kentucky'],['LA','Louisiana'],
['ME','Maine'],['MD','Maryland'],['MA','Massachusetts'],['MI','Michigan'],
['MN','Minnesota'],['MS','Mississippi'],['MO','Missouri'],['MT','Montana'],
['NE','Nebraska'],['NV','Nevada'],['NH','New Hampshire'],['NJ','New Jersey'],
['NM','New Mexico'],['NY','New York'],['NC','North Carolina'],['ND','North Dakota'],
['OH','Ohio'],['OK','Oklahoma'],['OR','Oregon'],['PA','Pennsylvania'],
['RI','Rhode Island'],['SC','South Carolina'],['SD','South Dakota'],
['TN','Tennessee'],['TX','Texas'],['UT','Utah'],['VT','Vermont'],
['VA','Virginia'],['WA','Washington'],['WV','West Virginia'],['WI','Wisconsin'],
['WY','Wyoming']];
export const STATE_NAMES=Object.fromEntries(names.map(([code,name])=>[name,code]));
const clean=s=>s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'')
 .replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/gi,'&')
 .replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/\s+/g,' ').trim();
const amounts=s=>{
 const text=clean(s).replace(/[,$]/g,'').trim();
 assert(/^\d+(?:\.\d+)?$/.test(text),'Invalid DQYDJ amount '+text);
 const value=Number(text);
 assert(Number.isSafeInteger(value)&&value>=1000&&value<=10000000,'Out-of-range DQYDJ income '+value);
 return value;
};
export function parseDqydj(html,edition){
 assert(Number.isInteger(edition)&&edition>=2026,'Invalid edition year');
 const plain=clean(html);
 assert(new RegExp('\\b'+edition+' income by state statistics\\b','i').test(plain),'DQYDJ edition year missing');
 assert(new RegExp('January\\s+(?:and|to|through|–|-)\\s+December\\s+'+(edition-1),'i').test(plain),'DQYDJ income period mismatch');
 const headers=[...html.matchAll(/<h[2-4]\b[^>]*>([\s\S]*?)<\/h[2-4]>/gi)];
 const header=headers.find(x=>/^Individual income by state:/i.test(clean(x[1])));
 assert(header,'DQYDJ individual income section not found');
 const after=html.slice(header.index+header[0].length);
 const nextHeader=/<h[2-4]\b/i.exec(after);
 const section=nextHeader?after.slice(0,nextHeader.index):after;
 const tables=[...section.matchAll(/<table\b[^>]*>[\s\S]*?<\/table>/gi)];
 assert.equal(tables.length,1,'Expected one individual-income table');
 const rows=[...tables[0][0].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)];
 assert(rows.length>=52,'DQYDJ state table too short');
 const vals={};
 for(const row of rows){
  const cells=[...row[1].matchAll(/<(?:td|th)\b[^>]*>([\s\S]*?)<\/(?:td|th)>/gi)].map(m=>m[1]);
  if(cells.length<5)continue;
  const name=clean(cells[0]);
  const state=STATE_NAMES[name];
  if(!state)continue;
  assert.equal(cells.length,6,'Wrong DQYDJ column count '+state);
  assert(!vals[state],'Duplicate state '+state);
  const arr=cells.slice(1,5).map(amounts);
  assert(arr.every((v,i)=>i===0||v>arr[i-1]),'Percentile order invalid '+state);
  vals[state]=arr;
 }
 assert.equal(Object.keys(vals).length,51,'Incomplete 50 states + DC');
 const normalizedSection=clean(section);
 const match=normalizedSection.match(/Nationwide\s+in\s+\d{4}.{0,500}?summary\s+of\s+individual\s+income\s+statistics:/i);
 assert(match,'Missing individual-income nationwide summary');
 const summary=normalizedSection.slice(match.index,match.index+1400);
 function extract(label){
  const re=new RegExp(label+'\\s+(?:individual\\s+)?income\\s+was\\s+\\$([\\d,]+)','i');
  const m=summary.match(re);
  assert(m,'Missing US '+label+' from individual summary');
  return Number(m[1].replace(/,/g,''));
 }
 const us=[extract('25th percentile'),extract('Median'),extract('75th percentile'),extract('Top 1%')];
 assert(us.every((v,i)=>i===0||v>us[i-1]),'Invalid US percentile ordering');
 vals.US=us;
 assert.deepEqual(Object.keys(vals).sort(),Object.keys(current.values).sort(),'State coverage mismatch');
 return vals;
}
export function sourceEdition(html){
 const intro=clean(html.slice(0,250000));
 const m=intro.match(/On this page are\s+(20\d{2})\s+income by state statistics/i);
 assert(m,'Cannot find DQYDJ source edition');
 return Number(m[1]);
}
async function fetchSource(){
 const control=new AbortController(),timer=setTimeout(()=>control.abort(),25000);
 try{
  const response=await fetch(SOURCE,{signal:control.signal,headers:{Accept:'text/html','User-Agent':'SalaryFlow-ReferenceMonitor/1.0'}});
  if(!response.ok)throw Error('DQYDJ returned HTTP '+response.status);
  const content=await response.text();
  assert(content.length>10000&&content.length<3000000,'Unexpected DQYDJ HTML length');
  return content;
 }finally{clearTimeout(timer)}
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 const source=await fetchSource();
 const year=sourceEdition(source);
 const values=parseDqydj(source,year);
 const same=JSON.stringify(values)===JSON.stringify(current.values);
 console.log('Official DQYDJ edition='+year+' current='+manifest.us.year+' states='+Object.keys(values).length+' same='+same);
 if(year<manifest.us.year)throw Error('Source regressed to an older edition');
 if(year===manifest.us.year){
  assert.deepEqual(values,current.values,'DQYDJ source changed its currently active 2026 statistics: review source revision before replacing');
  console.log('Current edition matches all 52 stored percentile rows; no PR.');
  if(process.env.GITHUB_OUTPUT)appendFileSync(process.env.GITHUB_OUTPUT,'found=false\n');
  process.exit(0);
 }
 assert(year===manifest.us.year+1,'Skipped multiple DQYDJ editions; manually verify');
 assert(year-1<=new Date().getUTCFullYear(),'DQYDJ income year is in the future');
 const candidate={schema:1,editionYear:year,incomeYear:year-1,source:SOURCE,
  retrieval:'Official DQYDJ income-by-state individual pre-tax (gross) income table; 25th, median, 75th, top 1% (99th), all 50 states and DC; national summary for US; income earned in previous calendar year. Candidate requires manual review.',values};
 mkdirSync('candidates',{recursive:true});
 writeFileSync('candidates/us-'+year+'.json',JSON.stringify(candidate,null,2)+'\n');
 if(process.env.GITHUB_OUTPUT)appendFileSync(process.env.GITHUB_OUTPUT,'found=true\nedition='+year+'\n');
 console.log('Generated review candidate: candidates/us-'+year+'.json');
}
