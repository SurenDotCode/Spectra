create function public.start_search(p_user uuid,p_offer uuid,p_key uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare result uuid; offer jsonb; exclusions jsonb; feedback jsonb;
begin
 perform pg_advisory_xact_lock(hashtext('spectra-start:'||p_user::text));
 select id into result from public.searches where user_id=p_user and idempotency_key=p_key;
 if result is not null then return result; end if;
 if exists(select 1 from public.searches where user_id=p_user and status in ('queued','running')) then raise exception 'Active search exists'; end if;
 select data->'profile' into offer from public.offer_profiles where id=p_offer and user_id=p_user and confirmed;
 if offer is null then raise exception 'Confirmed offer required'; end if;
 if not public.reserve_usage(p_user,'research',1) then raise exception 'Quota reached'; end if;
 select coalesce(jsonb_agg(domain),'[]') into exclusions from public.businesses where user_id=p_user;
 select coalesce(jsonb_agg(left(data::text,1000)),'[]') into feedback from (select data from public.outreach_outcomes where user_id=p_user order by created_at desc limit 20) o;
 insert into public.searches(user_id,offer_id,idempotency_key,data) values(p_user,p_offer,p_key,jsonb_build_object('offer',offer,'excluded',exclusions,'feedback',feedback)) returning id into result;
 insert into public.audit_log(user_id,event,data) values(p_user,'research.started',jsonb_build_object('search_id',result));
 return result;
end $$;
revoke all on function public.start_search(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.start_search(uuid,uuid,uuid) to service_role;
