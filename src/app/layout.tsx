import type {Metadata} from 'next';
import './globals.css';
import './components.css';
import {Shell} from '@/components/shell';
export const metadata:Metadata={title:{default:'Rajvya Jewellers · Everyday, made special',template:'%s · Rajvya Jewellers'},description:'Explore an illustrative collection of gold and silver jewellery. Thoughtful recommendations, transparent demo pricing and reserve-and-visit shopping.',robots:{index:false,follow:false}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en" data-scroll-behavior="smooth"><body><Shell>{children}</Shell></body></html>;}
