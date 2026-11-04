// Official WID country-bulk CSV collector. Strict, review-only: never edits live data.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {Readable} from 'node:stream';
import {createInterface} from 'node:readline';

const mf=JSON.parse(readFileSync(new URL('../data/manifest.json',import.meta.url)));
const previous=JSON.parse(readFileSync(new URL('../'+mf.world.path,import.meta.url)));
const target=Number(process.env.WID_YEAR||mf.world.year+1);
assert(Number.isInteger(target)&&target>mf.world.year&&target<=new Date().getUTCFullYear(),'Invalid WID target year');
const perc=['p25p100','p50p100','p75p100','p90p100','p95p100','p99p100'];
const varcode='tptinc992j';
const pricecode='inyixx999i';
const countries=Object.keys(previous.values);
assert.equal(countries.length,9);
export function extractCountryRows(text,country,year){
 const rows=text.trim().split(/\r?\n/);
 const names=rows.shift().split(';').map(x=>x.trim().toLowerCase().replace(/^\ufeff/,''));
 const col=Object.fromEntries(names.map((n,i)=>[n,i]));
 for(const x of ['country','variable','percentile','year','value','age','pop'])assert(Number.isInteger(col[x]),'Missing WID CSV field '+x);
 const points=new Map(),prices=[];
 for(const line of rows){
  const v=line.split(';');
  if(v[col.country]!==country||v[col.year]!==String(year))continue;
  const code=v[col.variable],p=v[col.percentile],n=Number(v[col.value]);
  if(code===varcode&&perc.includes(p)){
   assert(v[col.age]==='992'&&v[col.pop]==='j','Wrong WID population or age');
   assert(Number.isFinite(n)&&n>0,'Bad WID threshold');
   assert(!points.has(p),'Duplicate WID threshold '+country+' '+p);
   points.set(p,n);
  }
  if(code===pricecode&&p==='p0p100'){
   assert(Number.isFinite(n)&&n>0,'Invalid CPI index');
   prices.push(n);
  }
 }
 if(points.size===0){
  const error=new Error('WID thresholds not published for '+country+' '+year);
  error.code='WID_NOT_RELEASED';
  throw error;
 }
 assert.equal(points.size,6,'Partial WID thresholds '+country+': '+perc.filter(p=>!points.has(p)));
 assert.equal(prices.length,1,'Missing/duplicate WID price index '+country+' '+year);
 // WID amounts are expressed in constant LCU of a database reference year. Only accept a year
 // whose index is 1, so thresholds can safely be interpreted in that year's nominal local currency.
 assert(prices[0]>0.05&&prices[0]<5,'Implausible WID CPI index '+country+' '+year);
 // WID thresholds use constant LCU in a reference-year price level. WID's
 // price index is 1 for the reference year; multiplying by the index of
 // the requested year converts them to nominal local-currency thresholds.
 const arr=perc.map(p=>Math.round(points.get(p)*prices[0]));
 assert(arr.every((x,i)=>x>0&&(i===0||x>arr[i-1])),'Invalid WID percentile ordering '+country);
 return arr;
}
export async function downloadCountry(country,year){
 const url='https://wid.world/bulk_download/WID_data_'+country+'.csv';
 const ctl=new AbortController(),timeout=setTimeout(()=>ctl.abort(),90000);
 try{
  const res=await fetch(url,{signal:ctl.signal,headers:{'Accept':'text/csv','User-Agent':'SalaryFlow-WID-Reference-Collector/1.0'}});
  if(!res.ok||!res.body)throw Error('WID CSV HTTP '+res.status+' for '+country);
  const lines=createInterface({input:Readable.fromWeb(res.body),crlfDelay:Infinity});
  let cols,byteCount=0;
  const filtered=[];
  for await (const line of lines){
   byteCount+=Buffer.byteLength(line,'utf8');
   assert(byteCount<120*1024*1024,'WID country CSV too large: '+country);
   if(!cols){
    cols=line.replace(/^\ufeff/,'').split(';').map(s=>s.trim().toLowerCase());
    const needed=['country','variable','percentile','year','value','age','pop'];
    for(const c of needed)assert(cols.includes(c),'WID CSV lacks '+c);
    filtered.push(cols.join(';'));continue;
   }
   const v=line.split(';');
   if(v[cols.indexOf('country')]!==country)continue;
   if(v[cols.indexOf('year')]!==String(year))continue;
   const variable=v[cols.indexOf('variable')];
   if(variable!==varcode&&variable!==pricecode)continue;
   filtered.push(line);
  }
  return {values:extractCountryRows(filtered.join('\n'),country,year),source:url};
 }finally{clearTimeout(timeout)}
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 const next={};
 let ready=true;
 for(const code of countries){
  try{
   const res=await downloadCountry(code,target);
   next[code]={...previous.values[code],points:res.values};
   console.log(code+' '+target+': '+res.values.join(', '));
  }catch(error){
   if(error.code!=='WID_NOT_RELEASED')throw error;
   console.log(error.message+'; no data proposal will be generated');
   ready=false;break;
  }
 }
 if(!ready){
  if(process.env.GITHUB_OUTPUT)writeFileSync(process.env.GITHUB_OUTPUT,'found=false\n',{flag:'a'});
  process.exit(0);
 }
 const candidate={
  schema:1,incomeYear:target,source:'https://wid.world/data/',
  retrieval:'WID official country bulk CSV; tptinc992j for equal-split adults aged 20+, p25/p50/p75/p90/p95/p99 thresholds; multiplied constant-price LCU thresholds by yearly WID price index inyixx999i to obtain nominal year LCU; all nine countries required',
  values:next
 };
 mkdirSync('candidates',{recursive:true});
 const dest='candidates/world-'+target+'.json';
 writeFileSync(dest,JSON.stringify(candidate,null,2)+'\n');
 console.log('WID candidate written for human review: '+dest);
 if(process.env.GITHUB_OUTPUT)writeFileSync(process.env.GITHUB_OUTPUT,'found=true\n',{flag:'a'});
}
