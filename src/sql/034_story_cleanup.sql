-- 034: Nightly story clean-up
--
-- Stories disappear from the app after 24 hours but their files were never
-- deleted. Every night at 03:15 UTC pg_cron asks the cleanup-stories edge
-- function to remove the files and rows of expired stories, and old files
-- that no story points to.

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

-- Re-running this file replaces the job instead of adding a second one.
select cron.unschedule(jobid) from cron.job where jobname = 'cleanup-expired-stories';

select cron.schedule(
  'cleanup-expired-stories',
  '15 3 * * *',
  $$
    select net.http_post(
      url := 'https://xrgyqsfnaquypahiyqzb.supabase.co/functions/v1/cleanup-stories',
      body := '{}'::jsonb,
      headers := '{"Content-Type": "application/json"}'::jsonb
    );
  $$
);
