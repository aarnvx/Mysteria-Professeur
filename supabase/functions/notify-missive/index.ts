import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

const portalUrl = Deno.env.get('PORTAL_URL') || 'https://aarnvx.github.io/Mysteria-Professeur/index.html';

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
  const botToken = Deno.env.get('DISCORD_BOT_TOKEN');
  if (!supabaseUrl || !serviceRoleKey || !botToken) {
    return json({ error: 'Configuration Discord incomplète' }, 500);
  }

  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Authentification requise' }, 401);
  const authClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') || '', {
    global: { headers: { Authorization: authHeader } }
  });
  const { data: authData } = await authClient.auth.getUser();
  if (!authData.user) return json({ error: 'Session invalide' }, 401);

  const { missive } = await request.json();
  if (!missive?.message) return json({ error: 'Missive invalide' }, 400);

  if (String(missive.author || '').toLowerCase() !== String(authData.user.email || '').toLowerCase()) {
    return json({ error: 'Auteur invalide' }, 403);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const recipientQuery = admin.from('professors').select('name, rank, email, discord_id');
  const { data: recipients, error: recipientError } = missive.recipient
    ? await recipientQuery.ilike('email', missive.recipient)
    : await recipientQuery.not('discord_id', 'is', null);
  if (recipientError) return json({ error: recipientError.message }, 500);
  const validRecipients = (recipients || []).filter(recipient => recipient.discord_id);
  if (validRecipients.length === 0) return json({ ok: true, skipped: true, reason: 'Aucun discord_id pour ce professeur' });

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

  const discord = async (path: string, options: RequestInit = {}) => fetch(`https://discord.com/api/v10${path}`, {
    ...options,
    headers: { Authorization: `Bot ${botToken}`, 'Content-Type': 'application/json', ...(options.headers || {}) }
  });

  let sent = 0;
  for (const recipient of validRecipients) {
    const dmChannel = await discord('/users/@me/channels', {
      method: 'POST', body: JSON.stringify({ recipient_id: String(recipient.discord_id) })
    });
    if (!dmChannel.ok) return json({ error: `Discord DM impossible (${dmChannel.status})` }, 502);
    const channel = await dmChannel.json();
    const messageResponse = await discord(`/channels/${channel.id}/messages`, {
      method: 'POST',
      body: JSON.stringify({
        embeds: [{
          title: 'Vous avez reçu un hibou',
          description: `**${senderName}** vous a envoyé une missive.\n\n${String(missive.message).slice(0, 4000)}`,
          color: 13216844,
          fields: [
            { name: 'Grade du professeur', value: senderRank, inline: true },
            { name: 'Heure de réception', value: time, inline: true }
          ],
          footer: { text: 'Portail Académique Mysteria' }
        }],
        components: [{ type: 1, components: [{ type: 2, style: 5, label: 'Portail académique', url: portalUrl }] }]
      })
    });
    if (!messageResponse.ok) return json({ error: `Message Discord impossible (${messageResponse.status})` }, 502);
    sent += 1;
  }
  return json({ ok: true, sent });
});