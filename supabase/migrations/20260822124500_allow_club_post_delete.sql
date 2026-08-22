-- Allow post authors and admins to delete community posts.
DROP POLICY IF EXISTS "Posts deletable by author or admin" ON club_posts;
CREATE POLICY "Posts deletable by author or admin" ON club_posts
  FOR DELETE TO authenticated
  USING (author_email = auth.jwt() ->> 'email' OR auth.jwt() ->> 'role' = 'admin');
