import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

function decodeBase64(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  return Uint8Array.from(atob(normalized), character => character.charCodeAt(0));
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Méthode non autorisée' }, 405);
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const cloudName = Deno.env.get('CLOUDINARY_CLOUD_NAME');
  const uploadPreset = Deno.env.get('CLOUDINARY_UPLOAD_PRESET');
  if (!supabaseUrl || !anonKey || !cloudName || !uploadPreset) return json({ error: 'Configuration Cloudinary incomplète' }, 500);
  const authorization = request.headers.get('Authorization');
  if (!authorization) return json({ error: 'Authentification requise' }, 401);
  const authClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } });
  const { data: authData } = await authClient.auth.getUser();
  if (!authData.user) return json({ error: 'Session invalide' }, 401);
  const body = await request.json();
  const base64 = String(body.base64 || '').replace(/^data:image\/[^;]+;base64,/, '');
  const fileName = String(body.fileName || 'course-page.jpg').replace(/[^a-zA-Z0-9_.-]/g, '_');
  if (!base64) return json({ error: 'Image manquante' }, 400);
  try {
    const form = new FormData();
    form.append('file', new Blob([decodeBase64(base64)], { type: 'image/jpeg' }), fileName);
    form.append('upload_preset', uploadPreset);
    form.append('public_id', `mysteria/${authData.user.id}/${crypto.randomUUID()}`);
    const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`, {
      method: 'POST',
      body: form
    });
    const uploaded = await uploadResponse.json();
    if (!uploadResponse.ok || !uploaded.secure_url) {
      throw new Error(uploaded.error?.message || 'Cloudinary a refusé l’image.');
    }
    return json({ ok: true, fileId: uploaded.public_id, publicUrl: uploaded.secure_url });
  } catch (error) {
    console.error('Erreur Cloudinary:', error);
    return json({ error: error instanceof Error ? error.message : 'Erreur Cloudinary' }, 502);
  }
});
