export function price(netMg:number,ratePaise:number,makingBps:number,stonePaise=0,fixedPaise:number|null=null){
 const round=(n:bigint,d:bigint)=>(n+d/2n)/d;
 const metal=round(BigInt(netMg)*BigInt(ratePaise),1000n);
 const making=fixedPaise===null?round(metal*BigInt(makingBps),10000n):BigInt(fixedPaise);
 const subtotal=metal+making+BigInt(stonePaise);const tax=round(subtotal*300n,10000n);
 return {metalPaise:Number(metal),makingPaise:Number(making),stonePaise,subtotalPaise:Number(subtotal),taxPaise:Number(tax),totalPaise:Number(subtotal+tax)};
}
