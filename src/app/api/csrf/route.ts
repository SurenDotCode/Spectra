import {cookies} from 'next/headers';
import {randomBytes} from 'node:crypto';
import {env} from '@/lib/server/env';
export async function GET(){const token=randomBytes(32).toString('hex');(await cookies()).set('spectra-csrf',token,{httpOnly:true,secure:new URL(env().APP_URL).protocol==='https:',sameSite:'strict',path:'/',maxAge:3600});return Response.json({token},{headers:{'Cache-Control':'no-store'}});}
