import Link from 'next/link';
export default function NotFound(){return <div className="empty-state"><p className="eyebrow" style={{justifyContent:'center'}}>A LITTLE DETOUR</p><h1 className="page-title">This piece of the story is missing.</h1><p>Let’s find your way back to the collection.</p><Link className="button primary" href="/" style={{marginTop:24}}>Back to Rajvya</Link></div>;}
