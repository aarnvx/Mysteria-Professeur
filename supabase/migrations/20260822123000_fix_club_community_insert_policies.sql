-- Supabase uses the authenticated role for signed-in users.
-- The initial community migration used the non-existent authenticated_user role.

DROP POLICY IF EXISTS "Messages writable by authenticated" ON club_messages;
CREATE POLICY "Messages writable by authenticated" ON club_messages
  FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Posts writable by authenticated" ON club_posts;
CREATE POLICY "Posts writable by authenticated" ON club_posts
  FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Votes writable by authenticated" ON club_post_votes;
CREATE POLICY "Votes writable by authenticated" ON club_post_votes
  FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Comments writable by authenticated" ON club_post_comments;
CREATE POLICY "Comments writable by authenticated" ON club_post_comments
  FOR INSERT TO authenticated
  WITH CHECK (true);