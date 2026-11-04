// Verify Arizona wage-tax estimates use the enacted 2026 filing-status deductions.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const html=readFileSync('index.html','utf8');
const az=JSON.parse(readFileSync('data/arizona-2026.json','utf8'));
const federal=JSON.parse(readFileSync('data/tax-2026.json','utf8'));
const payroll=JSON.parse(readFileSync('data/payroll-2026.json','utf8'));
const start=html.indexOf('const standardArizonaDeduction=');
const end=html.indexOf('\nlet config=',start);
assert(start>0&&end>start,'Arizona filing-status deduction helper not found');
const deductionHelper=html.slice(start,end);
const estimateStart=html.indexOf('function taxEstimate(){');
const estimateEnd=html.indexOf('\nfunction displayTax()',estimateStart);
assert(estimateStart>0&&estimateEnd>estimateStart,'Actual tax estimator source unavailable');
const estimate=html.slice(estimateStart,estimateEnd);
assert(estimate.includes('ARIZONA_RULES.rate'),'Arizona calculator must use official state tax rate');
assert(!estimate.includes('Math.min(184500'),'Federal payroll cap should not be hardcoded');
const ctx={
 ARIZONA_RULES:az,TAX2026:federal.values,PAYROLL_RULES:payroll,
 ZERO_WAGE_STATES:new Set(['AK','FL','NV','NH','SD','TN','TX','WA','WY']),
 num:(x,max=1e9)=>Math.max(0,Math.min(max,Number(x)||0)),
 config:{taxState:'AZ',filing:'single',jobs:[{gross:100000,aipPercent:0,extraBonus:0,pretax401:0}],outside:0,hsa:0,extraDeduction:0,azDeduction:15750},
 progressive:(amount,limits)=>{let total=0,prev=0;for(let i=0;i<7;i++){const rates=[.10,.12,.22,.24,.32,.35,.37];const upper=limits[i]??Infinity;total+=Math.max(0,Math.min(amount,upper)-prev)*rates[i];prev=upper;if(amount<=upper)break}return total}
};
vm.createContext(ctx);
vm.runInContext(deductionHelper+estimate+';globalThis.calc=taxEstimate;globalThis.azDefault=standardArizonaDeduction;',ctx);
for(const [status,ded] of Object.entries(az.standardDeduction))assert.equal(ctx.azDefault(status),ded,status+' standard deduction');
let out=ctx.calc();
assert(Math.abs(out.az-(100000-15750)*.025)<1e-8,'Single 100k Arizona tax');
assert(Math.abs(out.fica-(100000*(.062+.0145)))<1e-8,'Payroll tax regression');
ctx.config.filing='mfj';ctx.config.azDeduction=ctx.azDefault('mfj');
out=ctx.calc();
assert(Math.abs(out.az-(100000-31500)*.025)<1e-8,'MFJ Arizona estimate');
ctx.config.taxState='TX';
out=ctx.calc();
assert.equal(out.az,0,'Texas wage tax should be zero');
ctx.config.taxState='AZ';ctx.config.azDeduction=20000;
out=ctx.calc();
assert(Math.abs(out.az-2000)<1e-8,'User-provided Arizona deduction must be respected');
const configStart=html.indexOf('let config={');
const configEnd=html.indexOf('\nlet hidden=',configStart);
assert(configStart>0&&configEnd>configStart,'Config persistence block not found');
const configBlock=html.slice(configStart,configEnd);
for(const [name,oldDed,custom,expected] of [
 ['legacy default',16100,undefined,15750],
 ['old custom',25000,undefined,25000],
 ['flagged custom',16100,true,16100]
]){
 const store={getItem:()=>JSON.stringify({filing:'single',azDeduction:oldDed,...(custom===undefined?{}:{azDeductionCustomized:custom}),jobs:[{gross:100000}]})};
 const ctx2={ARIZONA_RULES:az,localStorage:store,newJob:()=>({id:'x',gross:0}),Number,isFinite:Number.isFinite};
 vm.createContext(ctx2);
 vm.runInContext(deductionHelper+configBlock+';globalThis.savedConfig=config;',ctx2);
 assert.equal(ctx2.savedConfig.azDeduction,expected,name);
}
console.log('PASS: Arizona enacted 2026 standard deductions, tax estimates, zero-wage states, and saved override migration');
