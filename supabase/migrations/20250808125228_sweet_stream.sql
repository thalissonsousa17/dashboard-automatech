/*
  # Fix RLS policies for teaching_posts table

  1. Security Changes
    - Drop all existing policies to start fresh
    - Create proper RLS policies for authenticated users
    - Allow users to read, create, update, and delete their own posts
    - Use auth.uid() for proper user identification

  2. Policies Created
    - SELECT: Users can read their own posts
    - INSERT: Users can create posts for themselves
    - UPDATE: Users can update their own posts
    - DELETE: Users can delete their own posts
*/

-- Ensure RLS is enabled
ALTER TABLE teaching_posts ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Anyone can read teaching posts" ON teaching_posts;
DROP POLICY IF EXISTS "Authenticated users can create posts" ON teaching_posts;
DROP POLICY IF EXISTS "Authors can update their own posts" ON teaching_posts;
DROP POLICY IF EXISTS "Authors can delete their own posts" ON teaching_posts;
DROP POLICY IF EXISTS "Users can read their own posts" ON teaching_posts;
DROP POLICY IF EXISTS "Users can create their own posts" ON teaching_posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON teaching_posts;
DROP POLICY IF EXISTS "Users can delete their own posts" ON teaching_posts;

-- Create new policies using auth.uid()
CREATE POLICY "Users can read their own teaching posts"
  ON teaching_posts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Users can create their own teaching posts"
  ON teaching_posts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own teaching posts"
  ON teaching_posts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can delete their own teaching posts"
  ON teaching_posts
  FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- Grant necessary permissions to authenticated role
GRANT SELECT, INSERT, UPDATE, DELETE ON teaching_posts TO authenticated;