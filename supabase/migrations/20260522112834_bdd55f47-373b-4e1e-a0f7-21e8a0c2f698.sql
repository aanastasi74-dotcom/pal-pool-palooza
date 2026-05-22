
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname='sync-placares';
SELECT cron.schedule('sync-placares', '* * * * *', $cron$
SELECT net.http_post(
  url:='https://sngdtpwpxpjfmkmqnuyi.supabase.co/functions/v1/sync-match-scores',
  headers:='{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNuZ2R0cHdweHBqZm1rbXFudXlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzODE5MDksImV4cCI6MjA5Mzk1NzkwOX0.4J5Xmq97puW7Smj0BreaoUsZJ5ASiYrKG3RuSiScXjY","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNuZ2R0cHdweHBqZm1rbXFudXlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzODE5MDksImV4cCI6MjA5Mzk1NzkwOX0.4J5Xmq97puW7Smj0BreaoUsZJ5ASiYrKG3RuSiScXjY"}'::jsonb,
  body:='{"action":"cron"}'::jsonb
);
$cron$);
