create or replace function public.save_prospect(p_user uuid,p_search uuid,p_prospect jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare business uuid; item jsonb; source jsonb;
begin
 if not exists(select 1 from public.searches where id=p_search and user_id=p_user) then raise exception 'Search not found'; end if;
 select id into business from public.businesses where user_id=p_user and domain=p_prospect->>'domain';
 if business is not null then
   if not exists(select 1 from public.businesses where id=business and search_id=p_search and user_id=p_user) then return business; end if;
   update public.businesses set name=p_prospect->>'name', data=p_prospect || jsonb_build_object('id',business) where id=business and user_id=p_user;
   delete from public.evidence_items where business_id=business and user_id=p_user;
   delete from public.contacts where business_id=business and user_id=p_user;
   delete from public.people where business_id=business and user_id=p_user;
 else
 business:=(p_prospect->>'id')::uuid;
 insert into public.businesses(id,user_id,search_id,domain,name,data) values(business,p_user,p_search,p_prospect->>'domain',p_prospect->>'name',p_prospect);
 end if;
 for item in select * from jsonb_array_elements(p_prospect->'assessment'->'observations') loop
 select value into source from jsonb_array_elements(p_prospect->'sources') where value->>'url'=item->>'sourceUrl' limit 1;
 if source is null then raise exception 'Missing source'; end if;
 insert into public.evidence_items(user_id,business_id,type,source_url,fetched_at,data) values(p_user,business,'verified',item->>'sourceUrl',(source->>'fetchedAt')::timestamptz,item);
 end loop;
 for item in select * from jsonb_array_elements(p_prospect->'assessment'->'inferences') loop
 insert into public.evidence_items(user_id,business_id,type,data) values(p_user,business,'inference',jsonb_build_object('text',item));
 end loop;
 for item in select * from jsonb_array_elements(p_prospect->'assessment'->'unknowns') loop
 insert into public.evidence_items(user_id,business_id,type,data) values(p_user,business,'unknown',jsonb_build_object('text',item));
 end loop;
 for item in select * from jsonb_array_elements(p_prospect->'assessment'->'contacts') loop
 insert into public.contacts(user_id,business_id,channel,value,source_url,checked_at,data) values(p_user,business,item->>'channel',item->>'value',item->>'sourceUrl',(item->>'checkedAt')::timestamptz,item);
 end loop;
 for item in select * from jsonb_array_elements(p_prospect->'assessment'->'people') loop
 insert into public.people(user_id,business_id,data) values(p_user,business,item);
 end loop;
 return business;
end $$;
revoke all on function public.save_prospect(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.save_prospect(uuid,uuid,jsonb) to service_role;
