import { createHmac,timingSafeEqual } from 'node:crypto';
import { AppError } from './auth';
export function signatureOK(body:string,signature:string,secret:string){const expected=createHmac('sha256',secret).update(body).digest('hex');return /^[a-f0-9]{64}$/i.test(signature)&&timingSafeEqual(Buffer.from(expected),Buffer.from(signature.toLowerCase()));}
export async function razor<T=Record<string,unknown>>(path:string,body?:unknown,headers:Record<string,string>={}):Promise<T>{
 if(!process.env.RAZORPAY_KEY_ID?.startsWith('rzp_test_'))throw new AppError('Only test-mode payments are enabled',503);
 const res=await fetch('https://api.razorpay.com/v1/'+path,{method:body===undefined?'GET':'POST',headers:{Authorization:'Basic '+Buffer.from(process.env.RAZORPAY_KEY_ID+':'+process.env.RAZORPAY_KEY_SECRET).toString('base64'),'Content-Type':'application/json',...headers},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(18000),cache:'no-store'});
 if(!res.ok)throw new AppError('Payment provider did not confirm the operation. Its status will be reconciled before a retry.',502);
 return res.json();
}
