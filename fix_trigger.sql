-- ============================================================
-- Fix: handle_new_user trigger
-- Paste into Supabase SQL Editor → Run
-- ============================================================

-- Step 1: Drop the old broken trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Step 2: Recreate with robust error handling
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public   -- critical: without this it may not find the table
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.email,
      'Dispatcher'
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'role',
      'dispatcher'
    )
  )
  ON CONFLICT (id) DO NOTHING;  -- safe if the row already exists

  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Log the error but don't block the user creation
    RAISE WARNING 'handle_new_user failed: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Step 3: Re-attach trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Step 4: Verify the trigger exists
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
