-- Only club managers and admins may publish announcements.
DROP POLICY IF EXISTS "Posts writable by authenticated" ON club_posts;
CREATE POLICY "Posts writable by authenticated" ON club_posts
  FOR INSERT TO authenticated
  WITH CHECK (
    NOT is_announcement
    OR auth.jwt() ->> 'role' = 'admin'
    OR EXISTS (
      SELECT 1
      FROM clubs
      WHERE clubs.club_id = club_posts.club_id
        AND lower(trim(clubs.manager_email)) = lower(trim(auth.jwt() ->> 'email'))
    )
  );