import 'server-only';
import {createClient} from '@supabase/supabase-js';
import {env} from './env';
import {AppError} from '../errors';
export function adminDb(){const e=env();if(!e.SUPABASE_URL||!e.SUPABASE_SERVICE_ROLE_KEY)throw new AppError('SETUP',503,'Server database access is not configured.');return createClient(e.SUPABASE_URL,e.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});}
