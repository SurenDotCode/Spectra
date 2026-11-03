import {z} from 'zod';
import {authenticated,body,handle,rate} from '@/lib/server/guard';
import {documentText} from '@/lib/server/documents';
export const runtime='nodejs';
export const maxDuration=15;
export async function POST(request:Request){return handle(async()=>{const{user}=await authenticated(request,true);await rate(`upload:${user.id}`,5);const input=await body(request,z.object({name:z.string().min(1).max(150),base64:z.string().max(2700000).regex(/^[A-Za-z0-9+/]*={0,2}$/)}).strict(),2800000);return Response.json({text:await documentText(input.name,Buffer.from(input.base64,'base64'))});});}
