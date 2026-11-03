import {NextResponse} from 'next/server';
import {userDb} from '@/lib/server/db';
import {env} from '@/lib/server/env';
import {rate} from '@/lib/server/guard';
export async function GET(request:Request){try{await rate('callback',30);const url=new URL(request.url);const code=url.searchParams.get('code');if(!code||code.length>2048)throw new Error('code');const db=await userDb();const{error}=await db.auth.exchangeCodeForSession(code);if(error)throw error;return NextResponse.redirect(new URL('/workspace',env().APP_URL));}catch{return NextResponse.redirect(new URL('/login?error=callback',env().APP_URL));}}
