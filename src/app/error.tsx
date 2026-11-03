'use client';
export default function ErrorPage({reset}:{error:Error & {digest?:string};reset:()=>void}){return <section className="page empty"><h1>Something interrupted this view.</h1><p>Your saved work remains in your account. Try loading this view again.</p><button className="primary" onClick={reset}>Try again</button></section>;}
