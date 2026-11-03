import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
export const metadata:Metadata={title:'Spectra — Find the reason to reach out',description:'Evidence-led client discovery. Real businesses, public sources, clearer conversations.'};
export const dynamic='force-dynamic';
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><a href="#main" className="skip">Skip to content</a><header className="mast"><Link className="brand" href="/">◈ <span>Spectra</span></Link><nav aria-label="Main"><Link href="/workspace">Workspace</Link><Link href="/history">History</Link><Link href="/settings">Settings</Link><Link className="nav-cta" href="/login">Sign in ↗</Link></nav></header><main id="main">{children}</main><footer><span>Spectra · Evidence before outreach.</span><div><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></div></footer></body></html>}
