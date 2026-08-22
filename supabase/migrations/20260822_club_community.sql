-- Club Community Tables: Messages (chat), Posts, Votes, Comments
-- Messages: auto-delete après 24h
-- Posts: annonces + contenu utilisateur
-- Votes: likes (+1) et dislikes (-1)
-- Comments: réactions sur les posts

-- Messages (chat) - auto-suppression après 24h
CREATE TABLE IF NOT EXISTS club_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id TEXT NOT NULL,
  author_email TEXT NOT NULL,
  author_name TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '24 hours')
);

-- Index pour les requêtes par club et filtre temps
CREATE INDEX IF NOT EXISTS idx_club_messages_club_id ON club_messages(club_id);
CREATE INDEX IF NOT EXISTS idx_club_messages_expires_at ON club_messages(expires_at);

-- Posts (annonces et contenu utilisateur)
CREATE TABLE IF NOT EXISTS club_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id TEXT NOT NULL,
  author_email TEXT NOT NULL,
  author_name TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  image_url TEXT,
  is_announcement BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_club_posts_club_id ON club_posts(club_id);
CREATE INDEX IF NOT EXISTS idx_club_posts_created_at ON club_posts(created_at DESC);

-- Votes (likes/dislikes sur posts)
CREATE TABLE IF NOT EXISTS club_post_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES club_posts(id) ON DELETE CASCADE,
  voter_email TEXT NOT NULL,
  vote_type INTEGER CHECK (vote_type IN (-1, 1)), -- -1: dislike, 1: like
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(post_id, voter_email)
);

CREATE INDEX IF NOT EXISTS idx_club_post_votes_post_id ON club_post_votes(post_id);

-- Commentaires sur les posts
CREATE TABLE IF NOT EXISTS club_post_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES club_posts(id) ON DELETE CASCADE,
  author_email TEXT NOT NULL,
  author_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_club_post_comments_post_id ON club_post_comments(post_id);

-- Trigger pour mettre à jour updated_at sur posts
CREATE OR REPLACE FUNCTION update_club_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_club_posts_updated_at ON club_posts;
CREATE TRIGGER trigger_club_posts_updated_at
BEFORE UPDATE ON club_posts
FOR EACH ROW
EXECUTE FUNCTION update_club_posts_updated_at();

-- RLS (Row Level Security) - à adapter selon ta logique
-- Pour maintenant, on laisse public, à sécuriser plus tard
ALTER TABLE club_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_post_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_post_comments ENABLE ROW LEVEL SECURITY;

-- Policies - lecture publique, écriture authentifiée
CREATE POLICY "Messages readable by anyone" ON club_messages FOR SELECT USING (true);
CREATE POLICY "Messages writable by authenticated" ON club_messages FOR INSERT WITH CHECK (auth.role() = 'authenticated_user');

CREATE POLICY "Posts readable by anyone" ON club_posts FOR SELECT USING (true);
CREATE POLICY "Posts writable by authenticated" ON club_posts FOR INSERT WITH CHECK (auth.role() = 'authenticated_user');
CREATE POLICY "Posts updatable by author or admin" ON club_posts FOR UPDATE USING (author_email = auth.jwt() ->> 'email' OR auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Votes readable by anyone" ON club_post_votes FOR SELECT USING (true);
CREATE POLICY "Votes writable by authenticated" ON club_post_votes FOR INSERT WITH CHECK (auth.role() = 'authenticated_user');

CREATE POLICY "Comments readable by anyone" ON club_post_comments FOR SELECT USING (true);
CREATE POLICY "Comments writable by authenticated" ON club_post_comments FOR INSERT WITH CHECK (auth.role() = 'authenticated_user');
