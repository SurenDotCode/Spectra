-- Tenant identity is repeated on every relation, including composite foreign keys.
create table public.profiles (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 data jsonb not null default '{}' check (octet_length(data::text) <= 200000), created_at timestamptz not null default now(),
 unique(id,user_id), unique(user_id)
);
create table public.offer_profiles (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 version integer not null default 1 check(version>0), confirmed boolean not null default false,
 data jsonb not null default '{}' check(octet_length(data::text)<=200000), created_at timestamptz not null default now(),unique(id,user_id)
);
create table public.searches (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 offer_id uuid not null, idempotency_key uuid not null, status text not null default 'queued' check(status in ('queued','running','completed','failed','quota')),
 stage integer not null default 0 check(stage between 0 and 4), lease_until timestamptz, lease_token uuid, attempts integer not null default 0,
 data jsonb not null default '{}' check(octet_length(data::text)<=2000000),created_at timestamptz not null default now(),
 unique(id,user_id),unique(user_id,idempotency_key),foreign key(offer_id,user_id) references public.offer_profiles(id,user_id) on delete cascade
);
create unique index searches_one_active on public.searches(user_id) where status in ('queued','running');
create table public.search_stages (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,search_id uuid not null,
 stage integer not null check(stage between 0 and 3),item_key text not null,status text not null default 'pending' check(status in ('pending','completed','failed')),
 attempts integer not null default 0, next_attempt_at timestamptz not null default now(),data jsonb not null default '{}' check(octet_length(data::text)<=1000000),
 created_at timestamptz not null default now(),unique(id,user_id),unique(search_id,stage,item_key),foreign key(search_id,user_id) references public.searches(id,user_id) on delete cascade
);
create table public.businesses (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,search_id uuid not null,
 domain text not null,name text not null,data jsonb not null default '{}' check(octet_length(data::text)<=1000000),created_at timestamptz not null default now(),
 unique(id,user_id),unique(user_id,domain),foreign key(search_id,user_id) references public.searches(id,user_id) on delete cascade
);
create table public.evidence_items (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,business_id uuid not null,
 type text not null check(type in ('verified','inference','unknown')),source_url text,fetched_at timestamptz not null default now(),
 data jsonb not null default '{}' check(octet_length(data::text)<=500000),created_at timestamptz not null default now(),unique(id,user_id),
 check(type<>'verified' or source_url is not null),foreign key(business_id,user_id) references public.businesses(id,user_id) on delete cascade
);
create table public.contacts (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,business_id uuid not null,
 channel text not null check(channel in ('email','phone','whatsapp','form','social')),value text not null,source_url text not null,checked_at timestamptz not null default now(),
 data jsonb not null default '{}',created_at timestamptz not null default now(),unique(id,user_id),foreign key(business_id,user_id) references public.businesses(id,user_id) on delete cascade
);
create table public.people (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,business_id uuid not null,
 data jsonb not null default '{}' check(octet_length(data::text)<=200000),created_at timestamptz not null default now(),unique(id,user_id),foreign key(business_id,user_id) references public.businesses(id,user_id) on delete cascade
);
create table public.prospect_states (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,business_id uuid not null,
 status text not null default 'new' check(status in ('new','saved','dismissed','contacted')),
 data jsonb not null default '{}',created_at timestamptz not null default now(),unique(id,user_id),unique(user_id,business_id),foreign key(business_id,user_id) references public.businesses(id,user_id) on delete cascade
);
create table public.outreach_outcomes (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,business_id uuid not null,
 data jsonb not null default '{}' check(octet_length(data::text)<=20000),created_at timestamptz not null default now(),unique(id,user_id),foreign key(business_id,user_id) references public.businesses(id,user_id) on delete cascade
);
create table public.conversations (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,search_id uuid not null,
 data jsonb not null default '{}' check(octet_length(data::text)<=200000),created_at timestamptz not null default now(),unique(id,user_id),foreign key(search_id,user_id) references public.searches(id,user_id) on delete cascade
);
create table public.messages (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,conversation_id uuid not null,
 data jsonb not null default '{}' check(octet_length(data::text)<=20000),created_at timestamptz not null default now(),unique(id,user_id),foreign key(conversation_id,user_id) references public.conversations(id,user_id) on delete cascade
);
create table public.usage_counters (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 day date not null default current_date,feature text not null,amount integer not null default 0 check(amount>=0),data jsonb not null default '{}',created_at timestamptz not null default now(),unique(id,user_id),unique(user_id,day,feature)
);
create table public.research_cache (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 cache_key text not null,expires_at timestamptz not null,data jsonb not null default '{}' check(octet_length(data::text)<=1000000),created_at timestamptz not null default now(),unique(id,user_id),unique(user_id,cache_key)
);
create table public.audit_log (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 event text not null,data jsonb not null default '{}' check(octet_length(data::text)<=20000),created_at timestamptz not null default now(),unique(id,user_id)
);
create table public.exports (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 data jsonb not null default '{}',created_at timestamptz not null default now(),unique(id,user_id)
);
do $$ declare t text; begin
 foreach t in array array['profiles','offer_profiles','searches','search_stages','businesses','evidence_items','contacts','people','prospect_states','outreach_outcomes','conversations','messages','usage_counters','research_cache','audit_log','exports'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('alter table public.%I force row level security',t);
 execute format('revoke all on public.%I from anon, authenticated',t);
 execute format('grant select on public.%I to authenticated',t);
 execute format('grant all on public.%I to service_role',t);
 execute format('create policy own_rows on public.%I for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id)',t);
 execute format('create index on public.%I(user_id,created_at desc)',t);
 end loop;
 foreach t in array array['profiles','offer_profiles','prospect_states','outreach_outcomes','conversations','messages'] loop
 execute format('grant insert, update, delete on public.%I to authenticated',t);
 end loop;
end $$;
create index on searches(offer_id,user_id);
create index on searches(status,lease_until);
create index on search_stages(search_id,user_id);
create index on search_stages(status,next_attempt_at);
create index on businesses(search_id,user_id);
create index on evidence_items(business_id,user_id);
create index on contacts(business_id,user_id);
create index on people(business_id,user_id);
create index on prospect_states(business_id,user_id);
create index on prospect_states(user_id,status);
create index on outreach_outcomes(business_id,user_id);
create index on conversations(search_id,user_id);
create index on messages(conversation_id,user_id);
create index on research_cache(expires_at);
create index on usage_counters(day,feature);

-- Caller cannot choose its limit; the privileged server passes only a feature name.
create function public.reserve_usage(p_user uuid,p_feature text,p_amount integer default 1) returns boolean
language plpgsql security definer set search_path='' as $$
declare per_limit integer; global_limit integer; used integer; total integer;
begin
 if p_amount<1 or p_amount>1000 then raise exception 'invalid amount'; end if;
 select case p_feature when 'research' then 5 when 'search' then 25 when 'fetch' then 100 when 'reasoning' then 60 when 'stt_seconds' then 300 when 'tts_chars' then 6000 else 0 end into per_limit;
 global_limit:=per_limit*10;
 if per_limit=0 then return false; end if;
 perform pg_advisory_xact_lock(hashtext('spectra:'||p_feature||current_date::text));
 select coalesce(sum(amount),0) into total from public.usage_counters where day=current_date and feature=p_feature;
 select coalesce(sum(amount),0) into used from public.usage_counters where day=current_date and feature=p_feature and user_id=p_user;
 if used+p_amount>per_limit or total+p_amount>global_limit then return false; end if;
 insert into public.usage_counters(user_id,day,feature,amount) values(p_user,current_date,p_feature,p_amount)
 on conflict(user_id,day,feature) do update set amount=public.usage_counters.amount+excluded.amount;
 return true;
end $$;
revoke all on function public.reserve_usage(uuid,text,integer) from public,anon,authenticated;
grant execute on function public.reserve_usage(uuid,text,integer) to service_role;

create function public.claim_search(p_id uuid default null) returns setof public.searches
language plpgsql security definer set search_path='' as $$
begin
 return query with candidate as (
 select id from public.searches where status in ('queued','running') and (lease_until is null or lease_until<now()) and (p_id is null or id=p_id)
 order by created_at for update skip locked limit 1
 ) update public.searches s set status='running',lease_until=now()+interval '90 seconds',lease_token=gen_random_uuid()
 from candidate c where s.id=c.id returning s.*;
end $$;
revoke all on function public.claim_search(uuid) from public,anon,authenticated;
grant execute on function public.claim_search(uuid) to service_role;
