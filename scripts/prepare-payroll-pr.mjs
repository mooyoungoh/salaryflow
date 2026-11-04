// Usage: node scripts/prepare-payroll-pr.mjs 2027
// A reviewed official SSA source is always required. Never guess figures.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,appendFileSync} from 'node:fs';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const year=Number(process.argv[2]);
const manifest=read('data/manifest.json');
const previous=read(manifest.payroll.path);
const candidate=read('candidates/payroll-'+year+'.json');
assert(Number.isInteger(year)&&year===manifest.payroll.year+1&&year===manifest.tax.year,'Payroll must match active tax year');
assert.equal(candidate.schema,1);
assert.equal(candidate.taxYear,year);
assert.equal(candidate.source,'https://www.ssa.gov/news/en/cola/factsheets/'+year+'.html');
assert.equal(candidate.socialSecurityRate,previous.socialSecurityRate);
assert.equal(candidate.medicareRate,previous.medicareRate);
assert.equal(candidate.additionalMedicareRate,previous.additionalMedicareRate);
assert.deepEqual(candidate.additionalMedicareThresholds,previous.additionalMedicareThresholds);
assert(candidate.retrieval.length>=30);
const old=previous.socialSecurityWageBase,newBase=candidate.socialSecurityWageBase;
assert(Number.isSafeInteger(newBase)&&newBase>old&&newBase<500000);
const diff=Math.abs(newBase/old-1)*100;
const autoSafe=diff<=15;
if(process.env.GITHUB_OUTPUT)appendFileSync(process.env.GITHUB_OUTPUT,'auto_safe='+(autoSafe?'true':'false')+'\n');
const target='data/payroll-'+year+'.json';
writeFileSync(target,JSON.stringify(candidate,null,2)+'\n');
manifest.payroll={path:target,year};
writeFileSync('data/manifest.json',JSON.stringify(manifest,null,2)+'\n');
const report=[
 '# Salary Flow payroll tax update: '+year,
 '',
 '@mooyoungoh — Official SSA payroll tax year update.',
 '',
 '- [Open staging website](https://mooyoungoh.github.io/salaryflow/) — will reflect this update AFTER merge and Pages deployment',
 '- Official source: '+candidate.source,
 '- Current cap: $'+old.toLocaleString('en-US'),
 '- Proposed cap: $'+newBase.toLocaleString('en-US'),
 '- Cap increase: '+diff.toFixed(2)+'%',
 '- Automatic merge eligible: '+autoSafe,
 '- Other rates and Medicare thresholds unchanged and verified',
 '- Federal income-tax year matches SSA payroll-tax year: '+year,
 '',
 '## Review',
 '',
 '- [ ] Confirm SSA wage maximum from the source',
 '- [ ] Verify 401(k), FICA and AZ state-specific deductions still match app expectations',
 '- [ ] Production site not automatically updated',
 ''
];
writeFileSync('data-review-report.md',report.join('\n'));
console.log(report.join('\n'));
