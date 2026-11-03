import { NextRequest, NextResponse } from 'next/server';
import { securityHeaders } from './lib/security/headers';
export function proxy(request:NextRequest){const nonce=Buffer.from(crypto.randomUUID()).toString('base64');const headers=new Headers(request.headers);const secure=securityHeaders(nonce);headers.set('x-nonce',nonce);headers.set('Content-Security-Policy',secure['Content-Security-Policy']);const response=NextResponse.next({request:{headers}});for(const[k,v]of Object.entries(secure))response.headers.set(k,v);return response;}
export const config={matcher:['/((?!_next/static|_next/image|favicon.ico).*)']};
