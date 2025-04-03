-- Drop existing policies
DROP POLICY IF EXISTS "Allow profile creation" ON profiles;
DROP POLICY IF EXISTS "Allow users to read their own profile" ON profiles;
DROP POLICY IF EXISTS "Allow users to update their own profile" ON profiles;

-- Create more permissive policies for development
CREATE POLICY "Allow all profile operations"
ON public.profiles
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);