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
  const botApiUrl = Deno.env.get('BOT_API_URL');
  const botApiSecret = Deno.env.get('BOT_API_SECRET');
  if (!supabaseUrl || !serviceRoleKey || !botApiUrl || !botApiSecret) {
    return json({ error: 'Configuration de l’API bot incomplète' }, 500);
  }

  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Authentification requise' }, 401);
  const admin = createClient(supabaseUrl, serviceRoleKey);
  const accessToken = authHeader.replace(/^Bearer\s+/i, '').trim();
  const { data: authData } = await admin.auth.getUser(accessToken);
  if (!authData.user) return json({ error: 'Session invalide' }, 401);

  const { missive } = await request.json();
  if (!missive?.message) return json({ error: 'Missive invalide' }, 400);

  if (String(missive.author || '').toLowerCase() !== String(authData.user.email || '').toLowerCase()) {
    return json({ error: 'Auteur invalide' }, 403);
  }

  const recipientQuery = admin.from('professors').select('name, rank, email, discord_id');
  const { data: recipients, error: recipientError } = missive.recipient
    ? await recipientQuery.ilike('email', missive.recipient)
    : await recipientQuery.not('discord_id', 'is', null);
  if (recipientError) return json({ error: recipientError.message }, 500);
  const validRecipients = (recipients || []).filter(recipient => recipient.discord_id);
  if (validRecipients.length === 0) {
    const target = missive.recipient ? ` pour ${missive.recipient}` : '';
    return json({
      ok: false,
      error: `Aucun compte Discord relié${target}. Le destinataire doit cliquer sur « Connecter mon Discord » depuis le tableau de bord.`
    }, 422);
  }

  const { data: sender } = await admin
    .from('professors')
    .select('name, rank')
    .ilike('email', missive.author || '')
    .maybeSingle();
  const sentAt = new Date(missive.created_at || Date.now());
  const time = sentAt.toLocaleString('fr-FR', {
    timeZone: 'Europe/Paris', day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
  const senderName = sender?.name || missive.author || 'un professeur';
  const senderRank = sender?.rank || 'Professeur';

  const botResponse = await fetch(`${botApiUrl.replace(/\/$/, '')}/send-missive`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Bot-Secret': botApiSecret },
    body: JSON.stringify({
      recipients: validRecipients.map(recipient => ({
        discord_id: String(recipient.discord_id || '').trim(),
        name: recipient.name || recipient.email || 'Professeur'
      })),
      sender_name: senderName,
      sender_rank: senderRank,
      sent_at: time
    })
  });
  const botResult = await botResponse.json().catch(() => ({}));
  if (!botResponse.ok || !botResult.ok) {
    const failure = botResult.failures?.[0];
    return json({
      ok: false,
      error: failure?.error
        ? `Le bot n’a pas pu envoyer le MP à ${failure.name || 'ce professeur'} : ${failure.error}`
        : botResult.detail || botResult.error || `API bot indisponible (${botResponse.status})`
    }, 502);
  }
  return json({ ok: true, sent: botResult.sent || 0 });
});