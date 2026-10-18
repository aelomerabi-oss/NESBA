-- NESBA consolidated platform foundation: notifications and admin metrics.
-- Run after migrations 001-010.
begin;

-- Notify recipients without exposing message contents outside the conversation.
create or replace function public.notify_direct_message_recipient()
returns trigger language plpgsql security definer set search_path = public as $$
declare sender_name text;
begin
  select full_name into sender_name from public.profiles where id = new.sender_id;
  insert into public.notifications(user_id,type,title,body,data)
  values (new.recipient_id,'message','New message',coalesce(sender_name,'A NESBA member') || ' sent you a message.',jsonb_build_object('sender_id',new.sender_id));
  return new;
end; $$;
drop trigger if exists direct_message_notification on public.direct_messages;
create trigger direct_message_notification after insert on public.direct_messages
for each row execute function public.notify_direct_message_recipient();

-- Event hosts receive a lightweight registration notification.
create or replace function public.notify_event_host_registration()
returns trigger language plpgsql security definer set search_path = public as $$
declare host uuid; event_title text; attendee text;
begin
  select host_id,title into host,event_title from public.events where id = new.event_id;
  select full_name into attendee from public.profiles where id = new.user_id;
  if host is not null and host <> new.user_id then
    insert into public.notifications(user_id,type,title,body,data)
    values(host,'event_registration','New event registration',coalesce(attendee,'A member') || ' registered for ' || coalesce(event_title,'your event') || '.',jsonb_build_object('event_id',new.event_id));
  end if;
  return new;
end; $$;
drop trigger if exists event_registration_notification on public.event_registrations;
create trigger event_registration_notification after insert on public.event_registrations
for each row execute function public.notify_event_host_registration();

create or replace function public.get_admin_platform_metrics()
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') then raise exception 'Admin access required'; end if;
  return jsonb_build_object(
    'users',(select count(*) from public.profiles),
    'organizations',(select count(*) from public.organizations),
    'courses',(select count(*) from public.courses),
    'published_courses',(select count(*) from public.courses where is_published),
    'enrollments',(select count(*) from public.enrollments),
    'completed_enrollments',(select count(*) from public.enrollments where progress_percent >= 100),
    'posts',(select count(*) from public.posts),
    'events',(select count(*) from public.events),
    'event_registrations',(select count(*) from public.event_registrations),
    'messages',(select count(*) from public.direct_messages)
  );
end; $$;
commit;
