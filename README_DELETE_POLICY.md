# Fix Delete Button Permission Issue

The delete button requires a Row Level Security (RLS) policy to be set up in Supabase. Follow these steps:

## Steps to Fix:

1. **Open Supabase Dashboard**
   - Go to https://app.supabase.com
   - Select your project

2. **Open SQL Editor**
   - Click on "SQL Editor" in the left sidebar

3. **Run this SQL command:**

```sql
-- Check if policy already exists and drop it if needed
DROP POLICY IF EXISTS "Enable delete for own pending requests" ON public.paper_requests;

-- Create the DELETE policy
CREATE POLICY "Enable delete for own pending requests" 
ON public.paper_requests
FOR DELETE 
USING (
    (auth.uid() = resident_id AND status = 'pending') OR
    auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin')
);
```

4. **Verify the policy was created:**
   - Go to Authentication → Policies
   - You should see "Enable delete for own pending requests" policy

5. **Test the delete button**
   - Try deleting a pending request
   - It should work now!

## What this policy does:
- Allows residents to delete their own pending requests
- Allows admins to delete any request
- Prevents deleting approved/rejected/completed requests (for residents)

## Alternative: If you want to allow deleting any status

If you want residents to be able to delete requests regardless of status, use this instead:

```sql
DROP POLICY IF EXISTS "Enable delete for own pending requests" ON public.paper_requests;

CREATE POLICY "Enable delete for own requests" 
ON public.paper_requests
FOR DELETE 
USING (
    auth.uid() = resident_id OR
    auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin')
);
```

