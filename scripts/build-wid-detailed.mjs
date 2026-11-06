// Build WID official 2024 thresholds for all countries in the international comparison.
// Only actual WID percentile thresholds are published; never synthesize missing percentiles.
// Usage: node scripts/build-wid-detailed.mjs
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {Readable} from 'node:stream';
import {createInterface} from 'node:readline';
import {pathToFileURL} from 'node:url';

export const YEAR=2024;
export const THRESHOLD='tptinc992j';
export const PRICE='inyixx999i';
const source=JSON.parse(readFileSync('data/income-world-2024.json','utf8'));
export const COUNTRIES=Object.keys(source.values);
export const PCTS=[...Array.from({length:99},(_,i)=>i+1)];

export function parseWidRows(lines,country,year=YEAR){
 const [header,...rows]=lines;
 const names=header.replace(/^\ufeff/,'').split(';').map(x=>x.trim().toLowerCase());
 const col=Object.fromEntries(names.map((x,i)=>[x,i]));
 for(const k of ['country','variable','percentile','year','value','age','pop'])assert(Number.isInteger(col[k]),'Missing WID CSV column: '+k);
 const raw=new Map();let price=null;
 for(const line of rows){
  if(!line)continue;
  const v=line.split(';');
  if(v[col.country]!==country||v[col.year]!==String(year))continue;
  const code=v[col.variable],pct=v[col.percentile],number=Number(v[col.value]);
  if(code===PRICE&&pct==='p0p100'){
   assert(Number.isFinite(number)&&number>0,'Bad WID price index');
   assert(price===null,'Duplicate WID price index');
   price=number;
  }
  if(code!==THRESHOLD)continue;
  assert(v[col.age]==='992'&&v[col.pop]==='j','Wrong age/population group');
  const match=/^p(\d{1,2})p100$/.exec(pct);
  if(!match)continue;
  const p=Number(match[1]);
  if(!PCTS.includes(p))continue;
  assert(Number.isFinite(number)&&number>0,'Bad WID monetary threshold');
  assert(!raw.has(p),'Duplicate WID percentile '+country+' '+pct);
  raw.set(p,number);
 }
 if(price===null)throw Error(country+': missing annual WID currency price index');
 const points=[...raw].sort((a,b)=>a[0]-b[0]).map(([percentile,value])=>[percentile,Math.round(value*price)]);
 if(points.length<6)throw Error(country+': insufficient published percentile thresholds '+points.length);
 assert(points.every(([p,v],i)=>v>0&&(i===0||v>=points[i-1][1])),'Nonmonotone WID thresholds: '+country);
 // Critical: require published upper-tail endpoints (P90, P95, P99) and median.
 for(const p of [50,90,95,99])assert(raw.has(p),country+': missing required official P'+p);
 return points;
}

export async function download(country,year=YEAR){
 const url='https://wid.world/bulk_download/WID_data_'+country+'.csv';
 const response=await fetch(url,{headers:{Accept:'text/csv','User-Agent':'SalaryFlow-WID-Detailed-Data/1.0'},signal:AbortSignal.timeout(120000)});
 if(!response.ok||!response.body)throw Error(country+': WID HTTP '+response.status);
 const reader=createInterface({input:Readable.fromWeb(response.body),crlfDelay:Infinity});
 let header='',columns=null,bytes=0;const filtered=[];
 for await (const line of reader){
  bytes+=Buffer.byteLength(line,'utf8');assert(bytes<125*1024*1024,'Oversized WID file '+country);
  if(!columns){
   header=line;columns=line.replace(/^\ufeff/,'').split(';').map(v=>v.trim().toLowerCase());
   for(const c of ['country','variable','year'])assert(columns.includes(c),country+': missing '+c);
   filtered.push(header);continue;
  }
  const row=line.split(';');
  if(row[columns.indexOf('country')]!==country||row[columns.indexOf('year')]!==String(year))continue;
  const variable=row[columns.indexOf('variable')];
  if(variable===PRICE||variable===THRESHOLD)filtered.push(line);
 }
 return parseWidRows(filtered,country,year);
}

async function main(){
 assert(source.incomeYear===YEAR&&COUNTRIES.length===9,'Unexpected WID baseline');
 const values={};
 for(const code of COUNTRIES){
  const points=await download(code);
  values[code]={points};
  console.log(code,points.length,'official percentile thresholds, P99',points.find(x=>x[0]===99)?.[1],flush);
 }
 const data={schema:1,incomeYear:YEAR,variable:THRESHOLD,priceVariable:PRICE,
  source:'https://wid.world/data/',
  retrieval:'Official WID bulk CSV; equal-split pretax national income thresholds age 20+; yearly WID LCU price index applied; no synthetic percentile interpolation',
  values};
 writeFileSync('data/income-world-wid-percentiles-2024.json',JSON.stringify(data)+'\n');
 console.log('Validated WID detailed data written');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();
