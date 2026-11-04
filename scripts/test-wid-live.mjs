import {downloadCountry} from './collect-wid.mjs';
const year=2024;
const r=await downloadCountry('KR',year);
console.log('WID live KR '+year+' extracted percentiles:',r.values);
