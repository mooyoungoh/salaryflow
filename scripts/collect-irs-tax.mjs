// Given a trusted IRS bulletin URL, extract next-year rate tables into a review-only candidate.
// The workflow will open a draft PR. This script NEVER updates the live manifest or website.
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {parseIrsBulletin} from './irs-tax-parser.mjs';
const [url,yearString]=process.argv.slice(2);
const year=Number(yearString);
assert(Number.isInteger(year)&&year>=2026&&year<=2100,'Expected supported tax year');
const manifest=JSON.parse(readFileSync(new URL('../data/manifest.json',import.meta.url)));
assert(year>manifest.tax.year,'Only newer tax years may be proposed');
if(!/^https:\/\/www\.irs\.gov\/irb\/20\d\d-\d{2}_IRB(?:\?.*)?$/i.test(url||''))throw Error('Only official IRS Revenue Bulletin URLs are accepted');
const controller=new AbortController();
const timeout=setTimeout(()=>controller.abort(),30000);
let response;
try{response=await fetch(url,{signal:controller.signal,headers:{Accept:'text/html','User-Agent':'SalaryFlow Tax Data Reviewer (GitHub Actions)'}})}
finally{clearTimeout(timeout)}
if(!response.ok)throw Error('IRS source returned HTTP '+response.status);
const html=await response.text();
assert(html.length>5000,'IRS bulletin response too short');
const data=parseIrsBulletin(html,year,url);
mkdirSync('candidates',{recursive:true});
const output='candidates/tax-'+year+'.json';
writeFileSync(output,JSON.stringify(data,null,2)+'\n');
console.log('Extracted IRS tax year '+year+' to '+output+'. Candidate must be reviewed and merged manually.');
