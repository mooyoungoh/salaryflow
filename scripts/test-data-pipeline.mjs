// An isolated dry-run of the PR preparation logic; never modifies tracked data.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync,copyFileSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
const base=new URL('../',import.meta.url);
const root=mkdtempSync(join(tmpdir(),'salaryflow-review-test-'));
const copy=(from,to)=>{
 const dest=join(root,to);
 mkdirSync(dest.slice(0,dest.lastIndexOf('/')),{recursive:true});
 copyFileSync(new URL(from,base),dest);
};
const run=()=>spawnSync(process.execPath,['scripts/prepare-data-pr.mjs','tax','2027'],{cwd:root,encoding:'utf8'});
try{
 copy('scripts/prepare-data-pr.mjs','scripts/prepare-data-pr.mjs');
 copy('data/manifest.json','data/manifest.json');
 for(const file of ['tax-2026.json','income-us-2026.json','income-world-2024.json'])copy('data/'+file,'data/'+file);
 const tax=JSON.parse(readFileSync(join(root,'data/tax-2026.json'),'utf8'));
 mkdirSync(join(root,'candidates'),{recursive:true});
 const target=join(root,'candidates/tax-2027.json');
 const candidate=structuredClone(tax);
 candidate.taxYear=2027;
 candidate.source='https://www.irs.gov/';
 candidate.retrieval='TEST ONLY: synthetic +2% thresholds, not real IRS values';
 for(const v of Object.values(candidate.values)){
  v.ded=Math.round(v.ded*1.02);
  v.br=v.br.map(x=>Math.round(x*1.02));
 }
 writeFileSync(target,JSON.stringify(candidate));
 let result=run();
 assert.equal(result.status,0,result.stderr||result.stdout);
 assert(existsSync(join(root,'data/tax-2027.json')));
 const manifest=JSON.parse(readFileSync(join(root,'data/manifest.json')));
 assert.equal(manifest.tax.year,2027);
 assert.equal(manifest.tax.path,'data/tax-2027.json');
 assert(readFileSync(join(root,'data-review-report.md'),'utf8').includes('largest changes'));
 // Malformed proposal should fail before modifying the published reference manifest.
 copy('data/manifest.json','data/manifest.json');
 candidate.values.single.br=[1,2,3];
 writeFileSync(target,JSON.stringify(candidate));
 result=run();
 assert.notEqual(result.status,0,'Malformed candidate must be rejected');
 assert.equal(JSON.parse(readFileSync(join(root,'data/manifest.json'))).tax.year,2026);
 console.log('PASS: synthetic candidate generates versioned JSON and review report');
 console.log('PASS: malformed candidate rejected without manifest changes');
}finally{rmSync(root,{recursive:true,force:true})}
