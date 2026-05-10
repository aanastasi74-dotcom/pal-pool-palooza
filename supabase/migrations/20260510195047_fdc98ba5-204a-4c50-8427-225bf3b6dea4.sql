CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.unschedule('gerar-boletim-diario') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'gerar-boletim-diario');
SELECT cron.unschedule('lembrete-palpite') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'lembrete-palpite');

SELECT cron.schedule(
  'gerar-boletim-diario',
  '0 1 * * *',
  $$
    SELECT net.http_post(
      url := 'https://sngdtpwpxpjfmkmqnuyi.supabase.co/functions/v1/gerar-boletim-diario',
      headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNuZ2R0cHdweHBqZm1rbXFudXlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzODE5MDksImV4cCI6MjA5Mzk1NzkwOX0.4J5Xmq97puW7Smj0BreaoUsZJ5ASiYrKG3RuSiScXjY"}'::jsonb,
      body := '{}'::jsonb
    );
  $$
);

SELECT cron.schedule(
  'lembrete-palpite',
  '0 * * * *',
  $$
    SELECT net.http_post(
      url := 'https://sngdtpwpxpjfmkmqnuyi.supabase.co/functions/v1/lembrete-palpite',
      headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNuZ2R0cHdweHBqZm1rbXFudXlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzODE5MDksImV4cCI6MjA5Mzk1NzkwOX0.4J5Xmq97puW7Smj0BreaoUsZJ5ASiYrKG3RuSiScXjY"}'::jsonb,
      body := '{}'::jsonb
    );
  $$
);