# Admin User Management + RBAC Implementation

## Overview

This document describes the complete implementation of Role-Based Access Control (RBAC) and Admin User Management for your Next.js + Supabase application.

## Roles

- **admin**: Full access including user management, data editing, and settings
- **editor**: Can create, edit, and delete data (members, activities, payments, etc.)
- **viewer**: Read-only access to all data

## Database Changes

### Already Existed (Verified)

✅ `profiles` table with columns:
- `id` (uuid, pk, foreign key to auth.users)
- `email` (text, unique)
- `full_name` (text)
- `role` (text, CHECK constraint enforcing admin/editor/viewer)
- `phone`, `notes`, `is_active`, `created_at`, `created_by`

✅ Trigger `on_auth_user_created` that auto-creates profile rows

✅ RLS enabled on all tables

### Applied Migrations

#### Migration 1: Fix Profiles RLS Policies
**File**: Applied via Supabase MCP tool
**Changes**: Updated profiles RLS policies to check the profiles table directly instead of JWT metadata

```sql
-- Drop existing profiles RLS policies that use JWT metadata
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Create improved RLS policies for profiles table
-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Admins can view all profiles (checks profiles table, not JWT)
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
        AND profiles.is_active = true
    )
  );

-- Admins can insert profiles (checks profiles table, not JWT)
CREATE POLICY "Admins can insert profiles" ON public.profiles
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
        AND profiles.is_active = true
    )
  );

-- Admins can update profiles (checks profiles table, not JWT)
CREATE POLICY "Admins can update profiles" ON public.profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
        AND profiles.is_active = true
    )
  );

-- Admins can delete profiles (checks profiles table, not JWT)
CREATE POLICY "Admins can delete profiles" ON public.profiles
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
        AND profiles.is_active = true
    )
  );

-- Allow trigger to insert profiles during user creation (bypass RLS)
CREATE POLICY "Allow trigger to create profiles" ON public.profiles
  FOR INSERT
  WITH CHECK (true);
```

#### Migration 2: Fix Permissive RLS Policies
**File**: Applied via Supabase MCP tool
**Changes**: Secured `whatsapp_group_members` and `counters` tables

```sql
-- Fix whatsapp_group_members RLS (currently allows ALL for everyone)
DROP POLICY IF EXISTS "Allow all on whatsapp_group_members" ON public.whatsapp_group_members;

-- Anyone can view group members
CREATE POLICY "Anyone can view group members" ON public.whatsapp_group_members
  FOR SELECT
  USING (true);

-- Admins and editors can add members to groups
CREATE POLICY "Admins and editors can add members to groups" ON public.whatsapp_group_members
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'editor')
        AND profiles.is_active = true
    )
  );

-- Admins and editors can update group memberships
CREATE POLICY "Admins and editors can update group memberships" ON public.whatsapp_group_members
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'editor')
        AND profiles.is_active = true
    )
  );

-- Admins and editors can remove members from groups
CREATE POLICY "Admins and editors can remove members from groups" ON public.whatsapp_group_members
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'editor')
        AND profiles.is_active = true
    )
  );

-- Fix counters RLS (currently allows ALL for everyone)
DROP POLICY IF EXISTS "Allow all on counters" ON public.counters;

-- Anyone can view counters
CREATE POLICY "Anyone can view counters" ON public.counters
  FOR SELECT
  USING (true);

-- Only admins and editors can update counters (for ID generation)
CREATE POLICY "Admins and editors can update counters" ON public.counters
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'editor')
        AND profiles.is_active = true
    )
  );

-- Only admins can insert/delete counters
CREATE POLICY "Admins can manage counters" ON public.counters
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
        AND profiles.is_active = true
    )
  );
```

### Existing RLS Policies (Already Correct)

The following tables already have proper RLS policies:

- **members**: Admins/editors can insert/update, admins can delete, everyone can view
- **payments**: Admins/editors can insert/update, admins can delete, everyone can view
- **activities**: Admins/editors can insert/update, admins can delete, everyone can view
- **activity_types**: Admins can manage all, everyone can view
- **activity_participants**: Admins/editors can add/update/remove, everyone can view
- **um_units**: Admins can manage, everyone can view active units
- **whatsapp_groups**: Admins/editors can manage, everyone can view
- **audit_logs**: Admins can view, anyone can insert (for logging)

## Code Changes

### 1. Admin Supabase Client

**File**: `lib/supabase/admin.ts` (NEW)
- Server-only Supabase client with service role key
- Bypasses RLS for admin operations
- Used for creating users via Admin API

### 2. Environment Variables

**File**: `.env`
**Added**:
```env
# Service Role Key (Server-side only, NEVER expose to browser)
# Get this from: https://supabase.com/dashboard/project/hnhqjpdmnpijjrhnskte/settings/api
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY_HERE
```

**⚠️ IMPORTANT**: You must add your service role key from the Supabase dashboard!

### 3. API Routes

#### POST /api/admin/users
**File**: `app/api/admin/users/route.ts` (NEW)
- Creates new users via `supabase.auth.admin.createUser()`
- Auto-confirms email
- Sets role in user metadata (trigger creates profile)
- Admin authentication required

#### GET /api/admin/users
**File**: `app/api/admin/users/route.ts` (NEW)
- Lists all user profiles
- Admin authentication required
- Returns: id, email, full_name, role, is_active, created_at

#### PATCH /api/admin/users/[id]
**File**: `app/api/admin/users/[id]/route.ts` (NEW)
- Updates user role or active status
- Prevents self-demotion and self-deactivation
- Admin authentication required

#### DELETE /api/admin/users/[id]
**File**: `app/api/admin/users/[id]/route.ts` (NEW)
- Deactivates user (sets is_active = false)
- Prevents self-deletion
- Admin authentication required

### 4. Hooks

**File**: `hooks/use-role.ts` (NEW)
Provides convenient role-checking hooks:
- `useRole()` - Get current user's role
- `useHasRole(role)` - Check if user has specific role
- `useHasAnyRole(roles[])` - Check if user has any of the specified roles
- `useIsAdmin()` - Check if user is admin
- `useCanEdit()` - Check if user can edit (admin or editor)

### 5. UI Components

#### Admin Users Page
**File**: `app/(app)/admin/users/page.tsx` (NEW)
- Lists all users in a table
- Create new user button
- Refresh functionality
- Admin-only access with redirect

#### Users Table Component
**File**: `components/admin/users-table.tsx` (NEW)
- Displays user profiles in a table
- Inline role editing (dropdown)
- Active/inactive toggle switch
- Prevents self-modification
- Shows role badges with icons

#### Create User Modal
**File**: `components/admin/create-user-modal.tsx` (NEW)
- Form to create new users
- Fields: full name, email, password, role
- Validation and error handling
- Role descriptions for clarity

### 6. Navigation

**File**: `components/layout/app-sidebar.tsx` (MODIFIED)
- Added "User Management" link in Admin section
- Shows Shield icon
- Conditionally visible only to admins (uses `hasPermission("settings")`)

## Security Implementation

### RLS Enforcement

All security is enforced at the database layer using Row Level Security:

1. **Profiles Table**: 
   - Users can view their own profile
   - Admins can view/edit all profiles
   - Trigger can create profiles (for user creation)

2. **Data Tables** (members, payments, activities, etc.):
   - **Viewer**: SELECT only
   - **Editor**: SELECT, INSERT, UPDATE (and DELETE where appropriate)
   - **Admin**: Full access including DELETE

3. **Audit Logs**:
   - Admins can SELECT
   - All authenticated users can INSERT (for logging)

### API Authentication

All admin API routes verify:
1. User is authenticated (`supabase.auth.getUser()`)
2. User has admin role (checks `profiles.role = 'admin'`)
3. User is active (checks `profiles.is_active = true`)

### UI Protection

- Admin pages redirect non-admins to home
- Admin navigation links hidden for non-admins
- Role-based hooks prevent unauthorized UI rendering

## Setup Instructions

### 1. Add Service Role Key

1. Go to https://supabase.com/dashboard/project/hnhqjpdmnpijjrhnskte/settings/api
2. Find "service_role" key under "Project API keys"
3. Copy the key
4. Add to `.env`:
   ```
   SUPABASE_SERVICE_ROLE_KEY=your_key_here
   ```

### 2. Restart Development Server

```bash
npm run dev
# or
pnpm dev
```

### 3. Verify Setup

The service role key is required for the admin user creation API to work. Without it, you'll get an error when trying to create users.

## Verification Checklist

### Database Verification

1. **Check RLS Policies**:
   ```sql
   SELECT tablename, policyname, cmd 
   FROM pg_policies 
   WHERE schemaname = 'public' 
   ORDER BY tablename;
   ```

2. **Check Trigger**:
   ```sql
   SELECT tgname FROM pg_trigger WHERE tgrelid = 'auth.users'::regclass;
   ```
   Should show: `on_auth_user_created`

3. **Check Existing Profiles**:
   ```sql
   SELECT id, email, role, is_active FROM public.profiles;
   ```

### API Verification

1. **Test GET /api/admin/users** (as admin):
   ```bash
   curl http://localhost:3000/api/admin/users \
     -H "Cookie: your-session-cookie"
   ```

2. **Test POST /api/admin/users** (as admin):
   ```bash
   curl -X POST http://localhost:3000/api/admin/users \
     -H "Content-Type: application/json" \
     -H "Cookie: your-session-cookie" \
     -d '{
       "email": "test@example.com",
       "password": "test123",
       "full_name": "Test User",
       "role": "viewer"
     }'
   ```

3. **Test PATCH /api/admin/users/[id]** (as admin):
   ```bash
   curl -X PATCH http://localhost:3000/api/admin/users/USER_ID \
     -H "Content-Type: application/json" \
     -H "Cookie: your-session-cookie" \
     -d '{"role": "editor"}'
   ```

### UI Verification

1. **Login as admin**:
   - Should see "User Management" link in sidebar under Admin section

2. **Navigate to /admin/users**:
   - Should see list of all users
   - Should be able to create new user
   - Should be able to change roles via dropdown
   - Should be able to toggle active/inactive status
   - Should NOT be able to modify own role or deactivate self

3. **Login as editor**:
   - Should NOT see "User Management" link
   - Should be redirected if trying to access /admin/users

4. **Login as viewer**:
   - Should NOT see "User Management" link
   - Should be redirected if trying to access /admin/users

### Permission Verification

Test with different roles:

1. **Viewer**:
   - Can view members, payments, activities
   - Cannot create, edit, or delete data
   - Cannot access admin pages

2. **Editor**:
   - Can view members, payments, activities
   - Can create, edit, delete members, payments, activities
   - Cannot access admin pages
   - Cannot manage users

3. **Admin**:
   - Full access to all data
   - Can access admin pages
   - Can manage users
   - Can view audit logs

## How to Create Your First Admin User

If you don't have any admin users yet, you need to create one manually:

### Option 1: Via Supabase Dashboard

1. Go to Authentication > Users in Supabase Dashboard
2. Create a new user with email/password
3. Go to Table Editor > profiles
4. Find the newly created user's profile
5. Set `role` = 'admin' and `is_active` = true

### Option 2: Via SQL

```sql
-- Create auth user
INSERT INTO auth.users (email, encrypted_password, email_confirmed_at)
VALUES (
  'admin@example.com',
  crypt('your-password', gen_salt('bf')),
  now()
);

-- The trigger will create the profile, but you need to update it to admin
UPDATE public.profiles
SET role = 'admin', is_active = true
WHERE email = 'admin@example.com';
```

### Option 3: Update Existing User

If you have an existing user that needs to be made admin:

```sql
UPDATE public.profiles
SET role = 'admin', is_active = true
WHERE email = 'your-email@example.com';
```

## Deployment Notes

### Vercel Environment Variables

Make sure to add in Vercel dashboard:
- `NEXT_PUBLIC_SUPABASE_URL` (already exists)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (already exists)
- `SUPABASE_SERVICE_ROLE_KEY` (NEW - add this!)

### Localhost Setup

The same environment variables work for localhost. Just make sure `.env` has all three keys.

## Troubleshooting

### "Missing Supabase environment variables" Error

**Cause**: `SUPABASE_SERVICE_ROLE_KEY` is not set or is incorrect.

**Solution**: 
1. Get the service role key from Supabase dashboard
2. Add it to `.env` file
3. Restart your dev server

### "Unauthorized - not authenticated" Error

**Cause**: User is not logged in or session expired.

**Solution**: Login again with valid credentials.

### "Forbidden - admin access required" Error

**Cause**: User is logged in but doesn't have admin role.

**Solution**: 
1. Check user's role in profiles table
2. Update role to 'admin' if needed
3. Make sure `is_active = true`

### RLS Policy Errors

**Cause**: RLS policies blocking legitimate operations.

**Solution**: Review the RLS policies in the migrations above and verify they were applied correctly.

### Profile Not Created After User Creation

**Cause**: Trigger `on_auth_user_created` not working or role not set in user metadata.

**Solution**:
1. Verify trigger exists: `SELECT tgname FROM pg_trigger WHERE tgrelid = 'auth.users'::regclass;`
2. Check if profile was created: `SELECT * FROM profiles WHERE id = 'user_id';`
3. If missing, manually create: `INSERT INTO profiles (id, email, role, full_name, is_active) VALUES (...)`

## Next Steps

1. **Add Service Role Key** to `.env` (REQUIRED)
2. **Create your first admin user** using one of the methods above
3. **Test the user management UI** by logging in as admin
4. **Create additional users** as needed (editors and viewers)
5. **Test permissions** by logging in with different roles

## Notes

- Service role key bypasses RLS - use with extreme caution
- Only use admin client in secure server-side contexts (API routes)
- Never expose service role key to the browser
- All security is enforced at database layer (RLS), not just UI
- Works on both Vercel and localhost with same configuration
