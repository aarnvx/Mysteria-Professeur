/**
 * data.js - Données persistantes via Supabase
 * Version française : commentaires traduits pour la maintenance du projet.
 */

const DataStore = {

  // ── Points de Maison ─────────────────────────────────────────────

  async getPoints() {
    const { data, error } = await window.supabaseClient.from('house_points').select('*');
    if (error) { console.error('Error fetching points:', error); return {}; }
    const pointsMap = {};
    data.forEach(row => { pointsMap[row.house] = { points: row.points, blames: row.blames }; });
    return pointsMap;
  },

  async addPoints(house, amount, reason, actorName) {
    const { data: currentData, error: fetchErr } = await window.supabaseClient
      .from('house_points').select('points, blames').eq('house', house).single();
    if (fetchErr) { console.error('Error fetching house:', fetchErr); return; }
    const newPoints = Math.max(0, currentData.points + amount);
    const newBlames = amount < 0 ? currentData.blames + 1 : currentData.blames;
    await window.supabaseClient.from('house_points')
      .update({ points: newPoints, blames: newBlames, updated_at: new Date().toISOString() }).eq('house', house);
    await window.supabaseClient.from('house_log').insert([{ house, amount, reason, actor: actorName }]);
  },

  async getLog() {
    const { data, error } = await window.supabaseClient
      .from('house_log').select('*').order('created_at', { ascending: false }).limit(100);
    if (error) { console.error('Error fetching log:', error); return []; }
    return data.map(r => ({ house: r.house, amount: r.amount, reason: r.reason, actor: r.actor, ts: r.created_at }));
  },

  async getAuthUserEmail() {
    try {
      const { data: sessionData, error: sessionError } = await window.supabaseClient.auth.getSession();
      if (sessionError) {
        console.warn('Unable to retrieve Supabase auth session:', sessionError);
      }
      console.debug('Supabase auth session data:', sessionData);
      const sessionUser = sessionData?.session?.user || sessionData?.user;
      const emailFromSession = sessionUser?.email;
      if (emailFromSession) {
        const normalizedEmail = emailFromSession.trim().toLowerCase();
        console.debug('Supabase session user email:', normalizedEmail);
        return normalizedEmail;
      }

      const { data: userData, error: userError } = await window.supabaseClient.auth.getUser();
      if (userError) {
        console.warn('Unable to retrieve Supabase auth user:', userError);
        return null;
      }
      const emailFromUser = userData?.user?.email;
      if (emailFromUser) {
        const normalizedEmail = emailFromUser.trim().toLowerCase();
        console.debug('Supabase user email from auth.getUser():', normalizedEmail);
        return normalizedEmail;
      }
      return null;
    } catch (err) {
      console.warn('Unable to retrieve Supabase auth user:', err);
      return null;
    }
  },

  subscribeTable({ schema = 'public', table, events = ['INSERT'], filter = null, onEvent }) {
    if (!table || typeof onEvent !== 'function') return null;
    if (!window.supabaseClient || typeof window.supabaseClient.channel !== 'function') {
      console.warn(`Impossible d'initialiser le realtime pour ${table} : Supabase client indisponible.`);
      return null;
    }

    // Utilise un nom de canal unique pour éviter de réutiliser le même canal
    // et empêcher l'ajout de nouveaux gestionnaires après un subscribe().
    const uniq = Math.random().toString(36).slice(2, 9);
    const channelName = `realtime-${schema}-${table}-${Array.isArray(events) ? events.join('-') : events}-${uniq}`;
    const channel = window.supabaseClient.channel(channelName);
    const eventList = Array.isArray(events) ? events : [events];

    eventList.forEach(eventType => {
      const payloadFilter = { schema, table, event: eventType };
      if (filter) payloadFilter.filter = filter;
      channel.on('postgres_changes', payloadFilter, payload => {
        try {
          onEvent({ event: eventType, payload });
        } catch (err) {
          console.error(`Erreur dans le callback realtime ${table} ${eventType} :`, err);
        }
      });
    });

    channel.on('subscription_succeeded', () => {
      console.info(`Realtime ${table} activé (${eventList.join(', ')}).`);
    });

    channel.on('subscription_error', status => {
      console.error(`Erreur Realtime ${table} :`, status);
    });

    channel.subscribe();
    return channel;
  },


  unsubscribeChannel(subscription) {
    if (!subscription) return;
    try {
      if (typeof subscription.unsubscribe === 'function') {
        subscription.unsubscribe();
      }
      if (typeof window.supabaseClient?.removeChannel === 'function') {
        window.supabaseClient.removeChannel(subscription);
      }
    } catch (err) {
      console.warn('Erreur lors de la suppression du canal realtime :', err);
    }
  },

  async resetPoints() {
    await window.supabaseClient.from('house_points').update({ points: 0, blames: 0 }).neq('house', '');
    await window.supabaseClient.from('house_log').delete().neq('house', '');
  },

  // ── Cours ────────────────────────────────────────────────────────

  async getCourses() {
    const { data, error } = await window.supabaseClient
      .from('courses').select('*').order('id', { ascending: true });
    if (error) { console.error('Error fetching courses:', error); return []; }
    return data;
  },

  async addCourse(course) {
    const { error } = await window.supabaseClient.from('courses').insert([course]);
    if (error) { console.error('Error adding course:', error); return false; }
    return true;
  },

  async deleteCourse(id) {
    const { error } = await window.supabaseClient.from('courses').delete().eq('id', id);
    if (error) { console.error('Error deleting course:', error); return false; }
    return true;
  },

  // ── Blâmes ───────────────────────────────────────────────────────

  async getBlames() {
    const { data, error } = await window.supabaseClient
      .from('blames').select('*').order('created_at', { ascending: false }).limit(100);
    if (error) { console.error('Error fetching blames:', error); return []; }
    return data;
  },

  async addBlame(studentName, steamId, house, reason, teacherName) {
    const { error } = await window.supabaseClient.from('blames')
      .insert([{ student_name: studentName, steam_id: steamId || null, house, reason, teacher: teacherName }]);
    if (error) { console.error('Error adding blame:', error); return { ok: false, error: error.message }; }
    return { ok: true };
  },

  async deleteBlame(id) {
    if (!id) return { ok: false, error: 'Missing id' };
    try {
      const { data, error, status } = await window.supabaseClient.from('blames').delete().eq('id', id).select().maybeSingle();
      console.log('DataStore.deleteBlame response', { id, data, error, status });
      if (error) return { ok: false, error: error.message || error, data, status };
      return { ok: true, data };
    } catch (err) {
      console.error('Error deleting blame:', err);
      return { ok: false, error: String(err) };
    }
  },

  async countStudentBlames(studentName) {
    const { count, error } = await window.supabaseClient.from('blames')
      .select('*', { count: 'exact', head: true }).eq('student_name', studentName);
    if (error) { console.error('Error counting blames:', error); return 0; }
    return count || 0;
  },

  // ── Professeurs / Rôles ──────────────────────────────────────────

  async getRoles() {
    const { data, error } = await window.supabaseClient
      .from('professors').select('*').order('id', { ascending: true });
    if (error) { console.error('Error fetching roles:', error); return []; }
    return data;
  },

  async getProfessorByEmail(email) {
    if (!email) return null;
    const normalizedEmail = email.trim().toLowerCase();
    const { data, error } = await window.supabaseClient
      .from('professors')
      .select('*')
      .or(`email.eq.${normalizedEmail},email.eq.${email}`)
      .maybeSingle();
    if (error) { console.error('Error fetching professor:', error); return null; }
    return data;
  },

  async getClubMembers() {
    const { data, error } = await window.supabaseClient
      .from('club_members').select('*').order('id', { ascending: true });
    if (error) { console.error('Error fetching club members:', error); return []; }
    return data;
  },

  async getClubMembersByRole(role) {
    if (!role) return [];
    try {
      const pattern = `%${role.trim().toLowerCase()}%`;
      const { data, error } = await window.supabaseClient
        .from('club_members')
        .select('*')
        .ilike('role', pattern)
        .order('id', { ascending: true });
      if (error) { console.error('Error fetching club members by role:', error); return []; }
      return data || [];
    } catch (err) {
      console.error('Exception fetching club members by role:', err);
      return [];
    }
  },

  async getClubMemberByEmail(email) {
    if (!email) return null;
    const normalizedEmail = email.trim().toLowerCase();
    const { data, error } = await window.supabaseClient
      .from('club_members')
      .select('*')
      .ilike('email', normalizedEmail)
      .maybeSingle();
    if (error) { console.error('Error fetching club member:', error); return null; }
    return data;
  },

  async upsertClubMember(member) {
    if (!member || !member.email) return null;
    const normalizedEmail = member.email.trim().toLowerCase();
    const { data, error } = await window.supabaseClient
      .from('club_members')
      .upsert([{ ...member, email: normalizedEmail }], { onConflict: 'email' })
      .select().single();
    if (error) { console.error('Error upserting club member:', error); return null; }
    return data;
  },

  async copyProfessorToClub(email) {
    const professor = await this.getProfessorByEmail(email);
    if (!professor) return null;
    const clubRow = {
      email: professor.email,
      name: professor.name,
      rank: professor.rank,
      role: professor.role,
      house: professor.house,
      avatar: professor.avatar
    };
    return this.upsertClubMember(clubRow);
  },

  async getAllProfessors() {
    const { data, error } = await window.supabaseClient.from('professors').select('*').order('name');
    if (error) console.error('Error fetching professors:', error);
    return data || [];
  },

  // ── Missives (Hiboux) ───────────────────────────────────────────

  async getMissives(limit = 100) {
    const { data, error } = await window.supabaseClient
      .from('missives')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit || 100);
    if (error) { console.error('Error fetching missives:', error); return []; }
    return data || [];
  },

  async addMissive(missive) {
    if (!missive || !missive.message) return { ok: false, error: 'Message manquant' };
    try {
      const payload = {
        title: missive.title || null,
        message: missive.message,
        author: (missive.author || null),
        recipient: (missive.recipient || ''),
      };
      const { data, error } = await window.supabaseClient.from('missives').insert([payload]).select().single();
      if (error) return { ok: false, error: error.message || error };
      return { ok: true, missive: data };
    } catch (err) {
      console.error('Error inserting missive:', err);
      return { ok: false, error: String(err) };
    }
  },

  // Delete a missive by id. RLS will enforce author-only deletion if configured.
  async deleteMissive(id) {
    if (!id) return { ok: false, error: 'Missing id' };
    try {
      // Request deletion and return the deleted row when possible for debugging
      const { data, error, status } = await window.supabaseClient.from('missives').delete().eq('id', id).select().maybeSingle();
      console.log('DataStore.deleteMissive response', { id, data, error, status });
      if (error) return { ok: false, error: error.message || error, data, status };
      return { ok: true, data };
    } catch (err) {
      console.error('Error deleting missive:', err);
      return { ok: false, error: String(err) };
    }
  },

  // Upload a file to Supabase Storage and return a public URL.
  // bucket: name of the bucket (create it in Supabase if missing)
  // path: destination path (string), file: File object
  async uploadFileToStorage(bucket, path, file) {
    if (!bucket || !path || !file) return { ok: false, error: 'Missing upload params' };
    try {
      const storage = window.supabaseClient.storage;
      if (!storage) return { ok: false, error: 'Storage client not available' };
      const { data, error } = await storage.from(bucket).upload(path, file, { upsert: true });
      if (error) return { ok: false, error: error.message || error };
      const { data: publicData, error: publicErr } = storage.from(bucket).getPublicUrl(path);
      if (publicErr) return { ok: false, error: publicErr.message || publicErr };
      return { ok: true, publicUrl: publicData.publicUrl, object: data };
    } catch (err) {
      console.error('Error uploading file to storage:', err);
      return { ok: false, error: String(err) };
    }
  },

  // Subscribe to missives with optional recipient filtering.
  // options: { email: 'user@example.com', name: 'Display Name' }
  // Returns an array of channel subscriptions (may be empty).
  subscribeMissives(onNew, options = {}) {
    if (!this.subscribeTable) return [];
    const email = options.email ? String(options.email).trim() : '';
    const name = options.name ? String(options.name).trim() : '';
    const channels = [];

    const makeHandler = () => ({ event, payload }) => {
      try {
        const newRow = payload?.new || payload?.record || (payload?.record?.new ? payload.record.new : null);
        if (!newRow) return;
        if (typeof onNew === 'function') onNew(newRow);
      } catch (err) {
        console.error('subscribeMissives callback error:', err);
      }
    };

    // Subscribe to missives targeted at user's email
    if (email) {
      try {
        const ch = this.subscribeTable({ table: 'missives', events: ['INSERT'], filter: `recipient=eq.${email}`, onEvent: makeHandler() });
        if (ch) channels.push(ch);
      } catch (err) { console.warn('Failed to subscribe by email filter:', err); }
    }

    // Subscribe to missives targeted at user's display name
    if (name) {
      try {
        const ch = this.subscribeTable({ table: 'missives', events: ['INSERT'], filter: `recipient=eq.${name}`, onEvent: makeHandler() });
        if (ch) channels.push(ch);
      } catch (err) { console.warn('Failed to subscribe by name filter:', err); }
    }

    // Subscribe to global missives (recipient IS NULL or empty string)
    try {
      const chGlobalNull = this.subscribeTable({ table: 'missives', events: ['INSERT'], filter: `recipient=is.null`, onEvent: makeHandler() });
      if (chGlobalNull) channels.push(chGlobalNull);
    } catch (err) { console.warn('Failed to subscribe to null-recipient missives:', err); }

    try {
      const chGlobalEmpty = this.subscribeTable({ table: 'missives', events: ['INSERT'], filter: `recipient=eq.`, onEvent: makeHandler() });
      if (chGlobalEmpty) channels.push(chGlobalEmpty);
    } catch (err) { /* ignore */ }

    return channels;
  },

  async updateProfessor(id, updates) {
    try {
      const { data, error, status } = await window.supabaseClient.from('professors').update(updates).eq('id', id).select().maybeSingle();
      if (error) {
        console.error('Error updating professor:', { id, updates, error, status });
        return { ok: false, error: error.message || error, status, data };
      }
      if (!data) {
        console.warn('Update returned no rows (possible RLS or no match)', { id, updates, status, data });
        return { ok: false, error: 'No rows updated (possible RLS policy or no matching row)', status, data };
      }
      return { ok: true, data };
    } catch (err) {
      console.error('Exception updating professor:', err);
      return { ok: false, error: String(err) };
    }
  },

  // ── Sessions ─────────────────────────────────────────────────────

  async createSession(code, label, type, teacher) {
    const { data, error } = await window.supabaseClient
      .from('session_codes').insert([{ code, label, type, teacher, active: false }]).select().single();
    if (error) return { ok: false, error: error.message };
    return { ok: true, session: data };
  },

  async getSessionByCode(code) {
    const { data, error } = await window.supabaseClient
      .from('session_codes').select('*').eq('code', code).maybeSingle();
    if (error) return null;
    return data;
  },

  async updateSession(id, updates) {
    const { data, error } = await window.supabaseClient
      .from('session_codes').update(updates).eq('id', id).select().single();
    if (error) {
      console.error('Error updating session:', error);
      return null;
    }
    return data;
  },

  async getSessions(teacher) {
    let q = window.supabaseClient.from('session_codes').select('*').order('created_at', { ascending: false });
    if (teacher) q = q.eq('teacher', teacher);
    const { data, error } = await q;
    if (error) return [];
    return data;
  },

  async deleteSession(id) {
    const { error } = await window.supabaseClient.from('session_codes').delete().eq('id', id);
    return !error;
  },

  // ── Slides (questions/étapes d'une session) ──────────────────────

  async getSlides(sessionId) {
    const { data, error } = await window.supabaseClient
      .from('session_slides').select('*').eq('session_id', sessionId).order('position', { ascending: true });
    if (error) return [];
    return (data || []).map(row => ({
      ...row,
      options: row.options && typeof row.options === 'string' ? JSON.parse(row.options) : row.options
    }));
  },

  async addSlide(sessionId, slide) {
    const normalizedSlide = {
      ...slide,
      options: slide.options && typeof slide.options === 'string' ? JSON.parse(slide.options) : slide.options
    };

    const { data, error } = await window.supabaseClient
      .from('session_slides').insert([{ session_id: sessionId, ...normalizedSlide }]).select().single();
    if (error) {
      console.error('Erreur SQL addSlide:', error);
      return null;
    }
    return data;
  },

  async updateSlide(id, updates) {
    const normalizedUpdates = {
      ...updates,
      options: updates.options && typeof updates.options === 'string' ? JSON.parse(updates.options) : updates.options
    };

    const { data, error } = await window.supabaseClient.from('session_slides')
      .update(normalizedUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erreur SQL updateSlide:', error);
      return null;
    }
    return data;
  },

  async deleteSlide(id) {
    const { error } = await window.supabaseClient.from('session_slides').delete().eq('id', id);
    return !error;
  },

  // ── Réponses des élèves ──────────────────────────────────────────

  async submitAnswer(sessionId, slideId, studentName, steamId, answer) {
    const { error } = await window.supabaseClient.from('session_answers')
      .upsert([{ session_id: sessionId, slide_id: slideId, student_name: studentName, steam_id: steamId || null, answer }],
        { onConflict: 'session_id,slide_id,student_name' });
    return !error;
  },

  async getAnswers(sessionId) {
    const { data, error } = await window.supabaseClient
      .from('session_answers').select('*').eq('session_id', sessionId).order('created_at', { ascending: true });
    if (error) return [];
    return data;
  },

  async getAnswersBySlide(slideId) {
    const { data, error } = await window.supabaseClient
      .from('session_answers').select('*').eq('slide_id', slideId).order('created_at', { ascending: true });
    if (error) return [];
    return data;
  },

  async gradeAnswer(answerId, grade, feedback) {
    const { error } = await window.supabaseClient
      .from('session_answers').update({ grade, feedback }).eq('id', answerId);
    return !error;
  }
};
