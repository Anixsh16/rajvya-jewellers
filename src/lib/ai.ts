import {GoogleGenAI} from '@google/genai';
import {db,plain} from './db';
import {AppError} from './auth';
import type {Actor,Product} from './types';
let client:GoogleGenAI;
export const gemini=()=>client??=new GoogleGenAI({apiKey:process.env.GEMINI_API_KEY});
export async function consumeAI(a:Actor,kind='chat'){
 const [{ok}]=await db()`select allow_request(${kind+':'+a.id},${kind==='chat'?30:15},600) as ok`;
 const [{daily}]=await db()`select allow_request(${'ai-global:'+new Date().toISOString().slice(0,10)},${Number(process.env.AI_DAILY_LIMIT??150)},86400) as daily`;
 if(!ok||!daily)throw new AppError('The demo AI allowance is resting. You can still browse, filter and check out normally.',429);
}
export async function embed(text?:string,image?:{data:string;mimeType:string}){
 const parts:any[]=image?[{inlineData:image}]:[{text:'RETRIEVAL_QUERY: '+text}];
 const result=await gemini().models.embedContent({model:process.env.EMBEDDING_MODEL??'gemini-embedding-2',contents:{parts},config:{outputDimensionality:768}});
 const values=result.embeddings?.[0]?.values;if(!values||values.length!==768)throw new AppError('Search indexing is temporarily unavailable',503);return values;
}
export async function indexProduct(id:string){
 const [p]=await db()`select * from products where id=${id}`;if(!p)return;
 try{
  const text=await embed(`RETRIEVAL_DOCUMENT: ${p.name} ${p.description} ${p.category} ${p.purity} ${p.tags.join(' ')}`);
  let image:number[]|null=null;
  if(p.image_url.startsWith(process.env.NEXT_PUBLIC_SUPABASE_URL+'/storage/v1/object/public/catalogue/')){
   const r=await fetch(p.image_url,{signal:AbortSignal.timeout(12000)});const b=Buffer.from(await r.arrayBuffer());
   if(r.ok&&b.length<=8*1024*1024)image=await embed(undefined,{data:b.toString('base64'),mimeType:r.headers.get('content-type')??'image/png'});
  }
  await db()`update products set text_embedding=${'['+text.join(',')+']'}::vector,image_embedding=${image?'['+image.join(',')+']':null}::vector,embedding_status='ready' where id=${id}`;
 }catch{await db()`update products set embedding_status='failed' where id=${id}`;throw new AppError('Product saved. Embedding failed; use Retry indexing in the dashboard.',503);}
}
export async function hybridSearch(query:string,filters:{maxPaise?:number;purity?:string;category?:string;image?:{data:string;mimeType:string};method?:'keyword'|'vector'|'hybrid'}={}){
 const synonyms=query.replace(/halka|halke|lightweight/gi,'light daily').replace(/roz|rozana/gi,'everyday').replace(/jhumka|bali|kaan/gi,'earrings').replace(/haar|gale/gi,'chain');
 let vector:number[]|undefined;
 if(filters.method!=='keyword')try{vector=await embed(synonyms,filters.image);}catch{if(filters.image)throw new AppError('Photo search is temporarily unavailable. Please try describing the piece.',503);}
 const vec=vector?'['+vector.join(',')+']':null;
 const rows=await db()`with eligible as (select * from catalogue where status<>'draft' and availability='live' and price is not null and (${filters.maxPaise??0}=0 or (price->>'totalPaise')::bigint<=${filters.maxPaise??0}) and (${filters.purity??''}='' or purity=${filters.purity??''}) and (${filters.category??''}='' or category=${filters.category??''})),
 kw as (select id,row_number() over(order by ts_rank(search_document,websearch_to_tsquery('simple',${synonyms})) desc,sku) as rank from eligible where search_document @@ websearch_to_tsquery('simple',${synonyms}) limit 20),
 vs as (select id,row_number() over(order by case when ${!!filters.image} then image_embedding <=> ${vec}::vector else text_embedding <=> ${vec}::vector end,sku) as rank from eligible where ${vec}::vector is not null and case when ${!!filters.image} then image_embedding else text_embedding end is not null limit 20)
 select e.*,coalesce(case when ${filters.method??'hybrid'}<>'vector' then 1.0/(60+kw.rank) end,0)+coalesce(case when ${filters.method??'hybrid'}<>'keyword' then 1.0/(60+vs.rank) end,0) as score from eligible e left join kw using(id) left join vs using(id) where (kw.id is not null and ${filters.method??'hybrid'}<>'vector') or (vs.id is not null and ${filters.method??'hybrid'}<>'keyword') order by score desc,sku limit 6`;
 await db()`insert into search_events(query,result_count) values(${query.slice(0,200)},${rows.length})`;
 return plain(rows) as unknown as Product[];
}
