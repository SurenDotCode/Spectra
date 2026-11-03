import {env} from '@/lib/server/env';
import {tick} from '@/lib/server/jobs';
import {handle} from '@/lib/server/guard';
import {AppError} from '@/lib/errors';
export const runtime='nodejs';export const maxDuration=90;
export async function GET(request:Request){return handle(async()=>{const secret=env().CRON_SECRET;if(!secret||request.headers.get('authorization')!==`Bearer ${secret}`)throw new AppError('AUTH',401);await tick();return Response.json({ok:true});});}
