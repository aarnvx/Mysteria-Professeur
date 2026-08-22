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
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return json({ error: 'Configuration Supabase incomplète' }, 500);

  const authorization = request.headers.get('Authorization');
  if (!authorization) return json({ error: 'Authentification requise' }, 401);
  const authClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } });
  const { data: authData } = await authClient.auth.getUser();
  if (!authData.user?.email) return json({ error: 'Session invalide' }, 401);

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const authEmail = authData.user.email.trim().toLowerCase();
  const profileEmails = [...new Set([authEmail, authEmail.replace(/^[@^]/, '')])];
  const { data: profiles, error: clubMemberError } = await admin
    .from('club_members')
    .select('role, rank, email')
    .in('email', profileEmails)
    .limit(5);
  if (clubMemberError) return json({ error: clubMemberError.message }, 500);
  const clubProfiles = profiles || [];
  const signals = clubProfiles
    .map((profile: { role?: string; rank?: string }) => `${profile.role || ''} ${profile.rank || ''}`)
    .join(' ') + ` ${authEmail}`;
  const hasManagerRole = /(club_manager|gerant|gérant|prof_manager|grand professeur|\bgp\b|directeur|co_directeur|co-directeur|admin|fonda)/i.test(signals);
  if (!clubProfiles.length || !hasManagerRole) {
    return json({ error: 'Permission insuffisante pour créer un club' }, 403);
  }

  const body = await request.json();
  const name = String(body.name || '').trim();
  const clubId = String(body.club_id || '').trim();
  const description = String(body.description || '').trim() || null;
  const type = String(body.type || '').trim();
  const managerEmail = String(body.manager_email || '').trim().toLowerCase();
  if (!name || !clubId || !type || !managerEmail.endsWith('.prof')) {
    return json({ error: 'Nom, type et gérant .prof requis' }, 400);
  }

  const { data: club, error } = await admin
    .from('clubs')
    .insert({ club_id: clubId, name, description, type, manager_email: managerEmail, status: 'active' })
    .select()
    .single();
  if (error) return json({ error: error.message }, 409);
  return json({ ok: true, club });
});
