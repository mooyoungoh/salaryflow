// Monthly unattended IRS bulletin search. Produces a candidate only when a complete official table is found.
// No candidate means no PR and no change to the public website.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {parseIrsBulletin} from './irs-tax-parser.mjs';
const mf=JSON.parse(readFileSync(new URL('../data/manifest.json',import.meta.url)));
const year=mf.tax.year+1;
const fetchPage=async url=>{
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),18000);
 try{
  const res=await fetch(url,{signal:controller.signal,headers:{Accept:'text/html','User-Agent':'SalaryFlow IRS Tax Reference Monitor'}});
  if(!res.ok)throw Error('HTTP '+res.status);
  return await res.text();
 }finally{clearTimeout(timer)}
};
const index=await fetchPage('https://www.irs.gov/irb');
const paths=[...index.matchAll(/href=["']([^"'?#]*\/irb\/20\d\d-\d{2}_irb)["']/gi)].map(m=>m[1]);
const urls=[...new Set(paths.map(p=>new URL(p,'https://www.irs.gov').href))].slice(0,20);
if(!urls.length)throw Error('IRS index layout changed: found no bulletin links');
let found=false;
for(const url of urls){
 try{
  const html=await fetchPage(url);
  // A bulletin may refer to upcoming years in unrelated contexts; the parser verifies a complete section.
  const candidate=parseIrsBulletin(html,year,url);
  mkdirSync('candidates',{recursive:true});
  writeFileSync('candidates/tax-'+year+'.json',JSON.stringify(candidate,null,2)+'\n');
  console.log('New complete IRS rate table found for '+year+' at '+url);
  found=true;break;
 }catch(error){console.log('No complete target tax tables in '+url+': '+error.message)}
}
if(process.env.GITHUB_OUTPUT)writeFileSync(process.env.GITHUB_OUTPUT,'found='+(found?'true':'false')+'\n',{flag:'a'});
if(!found)console.log('No complete IRS tables found for '+year+'; no PR created');
