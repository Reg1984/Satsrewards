/*
  # Enable pg_cron and pg_net, then schedule weekly outreach

  1. Enables pg_cron for job scheduling
  2. Enables pg_net for making HTTP requests from within PostgreSQL
  3. Creates a cron job named 'weekly-outreach' that fires every Monday at 08:00 UTC
     - Calls the weekly-outreach-scheduler edge function
     - The function checks how many emails were sent this week and tops up to 10
*/

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule(
  'weekly-outreach',
  '0 8 * * 1',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url' LIMIT 1) || '/functions/v1/weekly-outreach-scheduler',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
    ),
    body := '{}'::jsonb
  );
  $$
);
