/**
 * data.js - Données persistantes via Supabase
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

  async getAllProfessors() {
    const { data, error } = await window.supabaseClient.from('professors').select('*').order('name');
    if (error) console.error('Error fetching professors:', error);
    return data || [];
  },

  async updateProfessor(id, updates) {
    const { error } = await window.supabaseClient.from('professors').update(updates).eq('id', id);
    if (error) { console.error('Error updating professor:', error); return false; }
    return true;
  },

  // ── Sessions ─────────────────────────────────────────────────────

  async createSession(code, label, type, teacher) {
    const { data, error } = await window.supabaseClient
      .from('session_codes').insert([{ code, label, type, teacher, active: true }]).select().single();
    if (error) return { ok: false, error: error.message };
    return { ok: true, session: data };
  },

  async getSessionByCode(code) {
    const { data, error } = await window.supabaseClient
      .from('session_codes').select('*').eq('code', code).single();
    if (error) return null;
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

    const { error } = await window.supabaseClient.from('session_slides').update(normalizedUpdates).eq('id', id);
    if (error) {
      console.error('Erreur SQL updateSlide:', error);
      return false;
    }
    return true;
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
