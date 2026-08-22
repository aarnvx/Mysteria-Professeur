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
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json({ error: 'Configuration Supabase incomplète' }, 500);
  }

  const authorization = request.headers.get('Authorization');
  if (!authorization) return json({ error: 'Authentification requise' }, 401);

  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } }
  });
  const { data: authData } = await authClient.auth.getUser();
  if (!authData.user?.email) return json({ error: 'Session invalide' }, 401);

  const body = await request.json();
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const name = String(body.name || '').trim();
  const role = String(body.role || 'Membre de club').trim();
  const clubId = String(body.club_id || '').trim();

  if (!email.endsWith('@mysteria.club') || password.length < 6 || !name || !clubId) {
    return json({ error: 'Identifiant .club, mot de passe, nom et club requis' }, 400);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const normalizedCallerEmail = authData.user.email.trim().toLowerCase();
  const { data: callerProfile, error: callerError } = await admin
    .from('professors')
    .select('role, rank')
    .ilike('email', normalizedCallerEmail)
    .maybeSingle();
  if (callerError) return json({ error: callerError.message }, 500);

  const { data: callerClubProfile, error: callerClubError } = await admin
    .from('club_members')
    .select('role, rank, email')
    .ilike('email', normalizedCallerEmail)
    .maybeSingle();
  if (callerClubError) return json({ error: callerClubError.message }, 500);

  const callerSignals = [
    callerProfile?.role,
    callerProfile?.rank,
    callerClubProfile?.role,
    callerClubProfile?.rank,
    normalizedCallerEmail
  ].filter(Boolean).join(' ').toLowerCase();
  const canCreateMember = /(club_manager|gerant|gérant|prof_manager|grand professeur|\bgp\b|directeur|co_directeur|co-directeur|admin|fonda)/i.test(callerSignals);
  if (!canCreateMember) return json({ error: 'Permission insuffisante pour créer un identifiant club' }, 403);

  const { data: club, error: clubError } = await admin
    .from('clubs')
    .select('club_id')
    .eq('club_id', clubId)
    .maybeSingle();
  if (clubError) return json({ error: clubError.message }, 500);
  if (!club) return json({ error: 'Club introuvable' }, 404);

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });
  if (createError) return json({ error: createError.message }, 409);

  const { data: member, error: memberError } = await admin
    .from('club_members')
    .insert({
      user_id: created.user.id,
      email,
      name,
      rank: 'Membre de club',
      role,
      club_id: clubId,
      status: 'active',
      avatar: '🎭'
    })
    .select()
    .single();

  if (memberError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return json({ error: memberError.message }, 500);
  }

  return json({ ok: true, member, email });
});
