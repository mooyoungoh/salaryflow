// Advisory-only data release monitor. Never changes production or reference JSON.
// GitHub Actions provides GITHUB_TOKEN, GITHUB_REPOSITORY, and this script uses GitHub's Issues API.
import {readFileSync} from 'node:fs';
const json=(f)=>JSON.parse(readFileSync(new URL('../'+f,import.meta.url),'utf8'));
const manifest=json('data/manifest.json');
const current={
 tax:manifest.tax.year,
 us:manifest.us.year,
 wid:manifest.world.year
};
const sources=[
 {id:'tax',label:'IRS federal income tax',url:'https://www.irs.gov/newsroom/working-families-tax-cuts-individuals-and-workers',
   match:(html)=>[...html.matchAll(/Tax year\s+(20\d{2})/gi)].map(x=>Number(x[1]))},
 {id:'us',label:'DQYDJ US individual-income statistics',url:'https://dqydj.com/income-by-state/',
   match:(html)=>[...html.matchAll(/(20\d{2})\s+income by state statistics/gi)].map(x=>Number(x[1]))},
 // WID releases often revise previously published years: do not infer threshold updates from a report title.
 {id:'wid',label:'WID income distribution data',url:'https://wid.world/news/',
   match:(html)=>[...html.matchAll(/World Inequality Database\s+(20\d{2})\s+Update/gi)].map(x=>Number(x[1])),
   note:'A news release is only a candidate; verify country, population, income concept and 6 thresholds before updating.'}
];
const repo=process.env.GITHUB_REPOSITORY,token=process.env.GITHUB_TOKEN;
const dryRun=!repo||!token||process.env.DRY_RUN==='1';
let issues=[];
async function github(path,options={}){
 const res=await fetch('https://api.github.com/repos/'+repo+path,{
   ...options,headers:{Accept:'application/vnd.github+json',Authorization:'Bearer '+token,'X-GitHub-Api-Version':'2022-11-28',...(options.headers||{})}
 });
 if(!res.ok)throw new Error('GitHub '+res.status+' '+path+': '+(await res.text()).slice(0,200));
 return res.json();
}
if(!dryRun)issues=await github('/issues?state=all&per_page=100');
let found=0;
for(const source of sources){
 try{
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),20000);
  let html;
  try{
   const resp=await fetch(source.url,{signal:controller.signal,headers:{'User-Agent':'SalaryFlowReferenceMonitor/1.0 (GitHub Actions)',Accept:'text/html'}});
   if(!resp.ok)throw new Error('HTTP '+resp.status);
   html=await resp.text();
  }finally{clearTimeout(timeout)}
  const matches=source.match(html).filter(y=>y>=2020&&y<=new Date().getUTCFullYear()+2);
  if(matches.length===0){console.log(source.id+': no trustworthy release year detected; no action');continue}
  const latest=Math.max(...matches);
  console.log(source.id+': current='+current[source.id]+' candidate='+latest);
  if(latest<=current[source.id])continue;
  const title='[Data review] '+source.label+' '+latest+' candidate';
  if(issues.some(i=>i.title===title)){console.log('Already tracked: '+title);continue}
  const body=[
   'Automated **review request**, not an automatic data update.',
   'Current dataset year: **'+current[source.id]+'**.',
   'Candidate release year: **'+latest+'**.',
   'Source: '+source.url,
   source.note||'Verify source data, tax definitions, state applicability and numeric thresholds before approving a change.',
   'Steps: inspect the source; build a new versioned JSON file; run validate-data.mjs and compare existing output; submit a PR.',
   'Never replace reference data based on the detected year alone.'
  ].join('\n\n');
  if(dryRun){console.log('DRY RUN: '+title);continue}
  await github('/issues',{method:'POST',body:JSON.stringify({title,body})});
  console.log('Created issue: '+title);found++;
 }catch(error){console.warn('Monitor failed for '+source.id+': '+error.message)}
}
console.log('New review issues: '+found);
