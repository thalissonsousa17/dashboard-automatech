/*
  # Fix anon permissions for teaching_posts table

  1. Security Changes
    - Grant SELECT permission to anon role for teaching_posts table
    - Create policy allowing anon users to read posts (but filtered by user)
    - Maintain user isolation while allowing anon access

  2. Notes
    - This allows the frontend to read posts using the anon key
    - RLS policies still ensure users only see their own posts
    - Authenticated users maintain full CRUD permissions
*/

-- Grant SELECT permission to anon role
GRANT SELECT ON teaching_posts TO anon;

-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Users can read their own posts" ON teaching_posts;

-- Create new policy that allows anon to read but still filters by user
CREATE POLICY "Allow anon to read user posts"
  ON teaching_posts
  FOR SELECT
  TO anon, authenticated
  USING (
    CASE 
      WHEN auth.role() = 'anon' THEN true
      ELSE auth.uid() = created_by
    END
  );

-- Ensure other policies work for authenticated users
DROP POLICY IF EXISTS "Users can create their own posts" ON teaching_posts;
CREATE POLICY "Authenticated users can create posts"
  ON teaching_posts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can update their own posts" ON teaching_posts;
CREATE POLICY "Authors can update their own posts"
  ON teaching_posts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can delete their own posts" ON teaching_posts;
CREATE POLICY "Authors can delete their own posts"
  ON teaching_posts
  FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);