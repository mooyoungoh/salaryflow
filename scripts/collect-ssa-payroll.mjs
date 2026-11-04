// Read official Social Security Administration COLA fact sheets.
// Payroll reference changes only when the matching IRS tax year is active.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,appendFileSync} from 'node:fs';
const mf=JSON.parse(readFileSync(new URL('../data/manifest.json',import.meta.url)));
const previous=JSON.parse(readFileSync(new URL('../'+mf.payroll.path,import.meta.url)));
export function parseSSAFactsheet(html,year){
 assert(Number.isInteger(year)&&year>=2026,'Invalid SSA tax year');
 const clean=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ')
 .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ')
 .replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ')
 .replace(/&amp;/gi,'&').replace(/\s+/g,' ').trim();
 assert(new RegExp('\\b'+year+'\\s+(?:SOCIAL SECURITY CHANGES|Cost-of-Living Adjustment)','i').test(clean),'Missing requested SSA year');
 assert(/Social Security portion[\s\S]{0,130}\b6\.2 percent/i.test(clean),'Missing SSA 6.2% rate');
 assert(/Medicare portion[\s\S]{0,120}\b1\.45 percent/i.test(clean),'Missing Medicare 1.45% rate');
 assert(/additional\s+0\.9 percent|additional\s+0\.9%|pay an additional 0\.9 percent/i.test(clean),'Missing additional Medicare tax rate');
 const match=clean.match(/Maximum Taxable Earnings[\s\S]{0,400}?Social Security\s*\(OASDI only\)\s*\$?([\d,]+)\s*\$?([\d,]+)/i);
 assert(match,'Missing SSA taxable earnings row');
 const [prior,current]=[match[1],match[2]].map(n=>Number(n.replaceAll(',','')));
 assert(prior>=100000&&prior<500000&&current>=prior&&current<500000,'Implausible SSA taxable wage maximum');
 return current;
}
export async function officialPayroll(year){
 const url='https://www.ssa.gov/news/en/cola/factsheets/'+year+'.html';
 const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),25000);
 try{
  const r=await fetch(url,{signal:ctl.signal,headers:{Accept:'text/html','User-Agent':'SalaryFlowPayrollMonitor/1.0'}});
  if(r.status===404)return null;
  if(!r.ok)throw Error('SSA official source HTTP '+r.status);
  const html=await r.text();
  const socialSecurityWageBase=parseSSAFactsheet(html,year);
  return {...previous,taxYear:year,source:url,retrieval:'Official SSA '+year+' cost-of-living adjustment fact sheet; compare OASDI employee contribution and taxable maximum; Medicare rates and statutory thresholds held constant.',socialSecurityWageBase};
 }finally{clearTimeout(timer)}
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 const year=mf.tax.year;
 if(year<=mf.payroll.year){console.log('SSA current payroll year '+mf.payroll.year+' matches active IRS year '+year+'; skip.');if(process.env.GITHUB_OUTPUT)appendFileSync(process.env.GITHUB_OUTPUT,'found=false\n');process.exit(0);}
 assert.equal(year,mf.payroll.year+1,'SSA updates must advance one year');
 const candidate=await officialPayroll(year);
 if(!candidate){console.log('SSA '+year+' COLA factsheet not released; preserving default');if(process.env.GITHUB_OUTPUT)appendFileSync(process.env.GITHUB_OUTPUT,'found=false\n');process.exit(0);}
 assert(Math.abs(candidate.socialSecurityWageBase/previous.socialSecurityWageBase-1)<0.15,'SSA annual wage-cap change too large');
 mkdirSync('candidates',{recursive:true});
 writeFileSync('candidates/payroll-'+year+'.json',JSON.stringify(candidate,null,2)+'\n');
 console.log('SSA '+year+' proposed taxable wage max '+candidate.socialSecurityWageBase);
 if(process.env.GITHUB_OUTPUT)appendFileSync(process.env.GITHUB_OUTPUT,'found=true\nyear='+year+'\n');
}
