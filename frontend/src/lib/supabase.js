import { createClient } from '@supabase/supabase-js';
import imageCompression from 'browser-image-compression';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Compression d'image ──────────────────────────────────────────────────────

export async function compressImage(file, { maxSizeKB = 80, maxDimension = 400 } = {}) {
  const compressed = await imageCompression(file, {
    maxSizeMB: maxSizeKB / 1024,
    maxWidthOrHeight: maxDimension,
    useWebWorker: true,
    fileType: 'image/jpeg',
  });
  return compressed;
}

// ── Upload photos ────────────────────────────────────────────────────────────

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

export async function uploadArticlePhoto(file, articleId) {
  const compressed = await compressImage(file);
  const path = `${articleId}.jpg`;
  const { error } = await supabase.storage
    .from('article-photos')
    .upload(path, compressed, { upsert: true, contentType: 'image/jpeg' });
  if (error) throw error;
  const { data } = supabase.storage.from('article-photos').getPublicUrl(path);
  // Ajouter un cache-buster pour forcer le rafraîchissement après upload
  return `${data.publicUrl}?t=${Date.now()}`;
}

export function deleteArticlePhoto(articleId) {
  return supabase.storage.from('article-photos').remove([`${articleId}.jpg`]);
}
