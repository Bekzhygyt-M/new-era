# Supabase setup

Three steps. The app keeps running on the local JSON store until the last one.

## 1. Create the project

At [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**.
Pick a region close to your users (Frankfurt is the usual choice for UZ).
Save the database password somewhere safe — it is shown only once.

## 2. Apply the schema

Dashboard → **SQL Editor** → **New query** → paste all of `supabase/schema.sql`
→ **Run**.

It creates 29 tables, their indexes, foreign keys and triggers, turns on Row
Level Security everywhere with deny-by-default, and creates the three private
storage buckets. Running it twice is safe — every statement is guarded.

## 3. Fill in `.env.local`

Dashboard → **Project Settings → API**:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon public key>
SUPABASE_SERVICE_ROLE_KEY=<service_role secret key>
SESSION_SECRET=<npm run gen:secret>
```

The service-role key bypasses RLS. It is read only on the server and must never
appear in a `NEXT_PUBLIC_*` variable or in client code.

## Verify

```bash
npm run supabase:check
```

Confirms the connection, that every table and bucket exists, and — the part
worth watching — that the anon key can read the public catalogue but **none** of
the 19 private tables.

## Move existing data over (optional)

```bash
npm run supabase:migrate -- --dry   # show what would be copied
npm run supabase:migrate            # copy data/db.json into Supabase
```

Upserts by primary key, parents before children, deletes nothing. Safe to
re-run if it stops halfway.

Local ids that are not UUIDs (`usr_…`, `pay_…`) are dropped so Postgres mints
proper ones; rows already keyed by UUID keep their id, so the seeded courses and
modules line up.

**Uploaded files are not migrated.** Videos and receipts under `private/uploads/`
must be re-uploaded through the admin panel, because their storage paths change.

## Switching back

The driver is chosen automatically: with `SUPABASE_SERVICE_ROLE_KEY` set the app
uses Supabase for both data and files, without it the local JSON store. Force
either one with `DATABASE_DRIVER` / `STORAGE_DRIVER` (`local` | `supabase`).
