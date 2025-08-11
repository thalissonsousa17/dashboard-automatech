/*
  # Fix teaching_posts table permissions

  1. Security Updates
    - Enable RLS on teaching_posts table
    - Add policy for public SELECT access
    - Add policy for authenticated users to INSERT
    - Add policy for authors to UPDATE/DELETE their own posts

  2. Changes
    - Enable Row Level Security
    - Create comprehensive access policies
    - Ensure anon key can read posts
    - Ensure authenticated users can manage their content
*/

-- Enable RLS on teaching_posts table
ALTER TABLE teaching_posts ENABLE ROW LEVEL SECURITY;

-- Policy for public read access (allows anon key to SELECT)
CREATE POLICY "Anyone can read teaching posts"
  ON teaching_posts
  FOR SELECT
  TO public
  USING (true);

-- Policy for authenticated users to create posts
CREATE POLICY "Authenticated users can create posts"
  ON teaching_posts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Policy for authors to update their own posts
CREATE POLICY "Authors can update their own posts"
  ON teaching_posts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- Policy for authors to delete their own posts
CREATE POLICY "Authors can delete their own posts"
  ON teaching_posts
  FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);