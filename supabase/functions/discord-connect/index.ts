import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Méthode non autorisée' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const clientId = Deno.env.get('DISCORD_CLIENT_ID');
  const clientSecret = Deno.env.get('DISCORD_CLIENT_SECRET');
  if (!supabaseUrl || !serviceRoleKey || !clientId || !clientSecret) {
    return json({ error: 'Configuration OAuth Discord incomplète' }, 500);
  }

  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Authentification requise' }, 401);
  const authClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') || '', {
    global: { headers: { Authorization: authHeader } }
  });
  const { data: authData } = await authClient.auth.getUser();
  if (!authData.user?.email) return json({ error: 'Session invalide' }, 401);

  const { code, redirect_uri: redirectUri, profile_table: profileTable = 'professors' } = await request.json();
  if (!code || !redirectUri) return json({ error: 'Code OAuth manquant' });
  if (profileTable !== 'professors' && profileTable !== 'club_members') {
    return json({ error: 'Table de profil invalide' }, 400);
  }

  const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri
    })
  });
  if (!tokenResponse.ok) return json({ error: `Échange OAuth refusé (${tokenResponse.status})` });
  const tokenData = await tokenResponse.json();
  const profileResponse = await fetch('https://discord.com/api/users/@me', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` }
  });
  if (!profileResponse.ok) return json({ error: 'Profil Discord inaccessible' });
  const discordProfile = await profileResponse.json();

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const discordId = String(discordProfile.id);
  let profile = null;
  let profileUpdateError = null;
  if (profileTable === 'club_members') {
    const result = await admin
      .from(profileTable)
      .update({ discord_id: discordId })
      .eq('user_id', authData.user.id)
      .select('id')
      .maybeSingle();
    profile = result.data;
    profileUpdateError = result.error;
  }
  if (profileUpdateError) return json({ error: profileUpdateError.message });

  if (!profile) {
    const { data: profileByEmail, error: emailUpdateError } = await admin
      .from(profileTable)
      .update({ discord_id: discordId })
      .ilike('email', authData.user.email)
      .select('id')
      .maybeSingle();
    if (emailUpdateError) return json({ error: emailUpdateError.message });
    if (!profileByEmail) return json({ error: 'Profil introuvable dans la table demandée' }, 404);
  }

  return json({ ok: true, discord_id: discordId, username: discordProfile.username });
});