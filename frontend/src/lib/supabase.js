import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qyjlqrwoofynicaidjxu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5amxxcndvb2Z5bmljYWlkanh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxMzk1MzgsImV4cCI6MjA5MDcxNTUzOH0.0RSDB7AeRjeCR-ck3QL42rb0Gd-WCdgxVEwsADRdbdY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function uploadLotPhoto(file, lotId) {
  const ext = file.name.split('.').pop();
  const path = `${lotId}.${ext}`;
  const { error } = await supabase.storage
    .from('lot-photos')
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  const { data } = supabase.storage.from('lot-photos').getPublicUrl(path);
  return data.publicUrl;
}
