import {config} from 'dotenv';config({path:'.env.local',quiet:true});
import fs from 'node:fs/promises';
async function main(){const {db}=await import('../src/lib/db');const {hybridSearch}=await import('../src/lib/ai');const items=await db()`select id,sku,name,category,purity,image_url from catalogue where availability='live' order by sku`;const photoImages=new Map<string,{data:string;mimeType:string}>();const cases:any[]=[];
 const english=['simple daily earrings','gold pendant chain','sterling silver ring','floral office studs','minimal everyday chain','classic silver band','small gold earrings','gift gold necklace'];const hinglish=['halka daily earrings','roz silver ring','simple gold chain','office ke liye earrings','gift silver band'];
 for(let i=0;i<40;i++)cases.push({id:'english-'+i,query:english[i%english.length],category:i%8===1||i%8===4||i%8===7?'Chains':i%8===2||i%8===5?'Rings':'Earrings'});
 for(let i=0;i<25;i++)cases.push({id:'hinglish-'+i,query:hinglish[i%hinglish.length],category:i%5===2?'Chains':i%5===1||i%5===4?'Rings':'Earrings'});
 for(let i=0;i<15;i++){const p=items[i%items.length];cases.push({id:'photo-'+i,query:'Photo similarity',category:p.category,imageUrl:p.image_url});}
 const results:any[]=[];
 for(const c of cases){const relevant=items.filter(p=>p.category===c.category).map(p=>p.id);let image;
  if(c.imageUrl){if(!photoImages.has(c.imageUrl)){const r=await fetch(c.imageUrl);photoImages.set(c.imageUrl,{data:Buffer.from(await r.arrayBuffer()).toString('base64'),mimeType:r.headers.get('content-type')??'image/png'});}image=photoImages.get(c.imageUrl);}
  for(const method of ['keyword','vector','hybrid'] as const){if(image&&method==='keyword')continue;try{const found=await hybridSearch(c.query,{method,image});const top=found.slice(0,5).map(p=>p.id);const hits=top.filter(id=>relevant.includes(id)).length;results.push({id:c.id,method,hit5:hits>0,recall5:hits/relevant.length,status:'complete'});}catch{results.push({id:c.id,method,status:'incomplete'});}}
  console.log('Search case',c.id);await new Promise(r=>setTimeout(r,3000));
 }
 const metrics=Object.fromEntries(['keyword','vector','hybrid'].map(method=>{const all=results.filter(r=>r.method===method);const done=all.filter(r=>r.status==='complete');return [method,{completed:done.length,requested:all.length,hitAt5:done.length?done.filter(r=>r.hit5).length/done.length:null,recallAt5:done.length?done.reduce((n,r)=>n+r.recall5,0)/done.length:null}];}));
 await fs.writeFile('.local/search-eval.json',JSON.stringify({metrics,results,labels:'Category-based synthetic demo relevance, not human-annotated real shop judgments',photoLimitation:'Photos repeat generated catalogue images and do not measure generalization to unseen jewellery'},null,2));console.log(JSON.stringify(metrics));await db().end();process.exit(0);
}main().catch(()=>{console.error('Search evaluation incomplete');process.exit(1);});
