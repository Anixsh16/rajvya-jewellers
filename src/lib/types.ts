export type Price={productId:string;name:string;sku:string;imageUrl:string;purity:string;netMg:number;ratePaise:number;metalPaise:number;makingPaise:number;stonePaise:number;subtotalPaise:number;taxPaise:number;totalPaise:number;taxBps:number};
export type Product={id:string;sku:string;name:string;description:string;description_hi:string;category:string;purity:string;net_mg:number;gross_mg:number;making_bps:number;making_fixed_paise:number|null;stone_paise:number;huid:string|null;tags:string[];image_url:string;status:string;availability:string;price:Price|null;embedding_status:string;extraction?:Record<string,unknown>;review_confirmed:boolean};
export type Actor={id:string;role:'customer'|'staff'|'owner';email?:string;name:string};
export type Card={id:string;name:string;imageUrl:string;purity:string;netMg:number;totalPaise:number;available:boolean};
export const money=(n:number|string)=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(Number(n)/100);
export const preciseMoney=(n:number|string)=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',minimumFractionDigits:2}).format(Number(n)/100);
export const card=(p:Product):Card=>({id:p.id,name:p.name,imageUrl:p.image_url,purity:p.purity,netMg:p.net_mg,totalPaise:p.price?.totalPaise??0,available:p.availability==='live'&&!!p.price});
