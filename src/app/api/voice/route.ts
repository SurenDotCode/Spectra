import {z} from 'zod';
import {authenticated,body,handle,rate} from '@/lib/server/guard';
import {speech} from '@/lib/server/providers';
export const runtime='nodejs';
export const maxDuration=30;
const language=z.enum(['en-IN','hi-IN','ta-IN','te-IN','kn-IN','ml-IN','mr-IN','gu-IN','bn-IN','pa-IN']);
export async function POST(request:Request){return handle(async()=>{const{user}=await authenticated(request,true);await rate(`voice:${user.id}`,10);const input=await body(request,z.discriminatedUnion('action',[z.object({action:z.literal('transcribe'),base64:z.string().max(1800000).regex(/^[A-Za-z0-9+/]*={0,2}$/),language}).strict(),z.object({action:z.literal('speak'),text:z.string().min(1).max(1200),language}).strict()]),1900000);const provider=speech(user.id);if(input.action==='transcribe')return Response.json({text:await provider.stt.transcribe(Buffer.from(input.base64,'base64'),input.language)});const audio=await provider.tts.speak(input.text,input.language);return Response.json({base64:Buffer.from(audio).toString('base64')});});}
