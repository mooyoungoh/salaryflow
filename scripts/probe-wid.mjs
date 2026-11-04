const url='https://wid.world/bulk_download/WID_data_KR.csv';
const res=await fetch(url,{headers:{Range:'bytes=0-65535',Accept:'text/csv'}});
console.log('HTTP',res.status,'type',res.headers.get('content-type'),'size',res.headers.get('content-length'));
if(!res.ok)process.exit(1);
const reader=res.body.getReader();
const {value}=await reader.read();
console.log('SAMPLE',new TextDecoder().decode(value).slice(0,3800));
await reader.cancel();