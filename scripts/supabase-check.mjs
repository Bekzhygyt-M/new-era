#!/usr/bin/env node
/**
 * Verifies a Supabase project against supabase/schema.sql.
 *
 * Checks that every table and bucket exists, that the service role can read
 * them, and — most importantly — that the anon key CANNOT read anything
 * private. Run it after applying the schema:  npm run supabase:check
 */
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const ROOT = process.cwd();

// ── Env ─────────────────────────────────────────────────────────────────────
for (const file of ['.env.local', '.env']) {
  const full = path.join(ROOT, file);
  if (!fs.existsSync(full)) continue;
  for (const line of fs.readFileSync(full, 'utf-8').split('\n')) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!URL || !SERVICE) {
  console.error('\n  Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local\n');
  process.exit(1);
}

let pass = 0;
let fail = 0;
const ok = (m, e = '') => { pass++; console.log(`  ✅ ${m}${e ? ' — ' + e : ''}`); };
const bad = (m, e = '') => { fail++; console.log(`  ❌ ${m}${e ? ' — ' + e : ''}`); };
const check = (c, m, e = '') => (c ? ok(m, e) : bad(m, e));

/** Tables the application expects, parsed straight from the schema file. */
function expectedTables() {
  const sql = fs.readFileSync(path.join(ROOT, 'supabase/schema.sql'), 'utf-8');
  return [...sql.matchAll(/create table if not exists public\.(\w+)/g)].map((m) => m[1]);
}

/** Tables that must never be readable with the anon key. */
const PRIVATE_TABLES = [
  'profiles', 'payments', 'lesson_progress', 'test_attempts', 'enrollments',
  'certificates', 'journals', 'backtests', 'notifications', 'messages',
  'password_resets', 'activity_logs', 'answers', 'questions', 'tests',
  'xp_transactions', 'platform_settings', 'risk_disclaimer_acceptances',
  'lesson_materials',
];

const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });

console.log(`\n── Supabase: ${URL.replace(/^https?:\/\//, '')}\n`);

// ── Connectivity ────────────────────────────────────────────────────────────
try {
  const { error } = await admin.from('courses').select('id').limit(1);
  if (error) throw new Error(error.message);
  ok('service role connects');
} catch (err) {
  bad('service role connects', err.message);
  console.log('\n  Cannot continue without a working connection.\n');
  process.exit(1);
}

// ── Tables ──────────────────────────────────────────────────────────────────
const tables = expectedTables();
const missing = [];
for (const table of tables) {
  const { error } = await admin.from(table).select('*', { head: true, count: 'exact' });
  if (error) missing.push(`${table} (${error.message})`);
}
check(missing.length === 0, `all ${tables.length} tables exist`, missing.join('; '));

// ── Storage buckets ─────────────────────────────────────────────────────────
const { data: buckets, error: bucketError } = await admin.storage.listBuckets();
if (bucketError) {
  bad('storage reachable', bucketError.message);
} else {
  const names = (buckets || []).map((b) => b.name);
  for (const wanted of ['videos', 'receipts', 'images']) {
    const bucket = (buckets || []).find((b) => b.name === wanted);
    check(Boolean(bucket), `bucket "${wanted}" exists`, names.join(', '));
    if (bucket) check(bucket.public === false, `bucket "${wanted}" is private`);
  }
}

// ── RLS: the anon key must reach nothing private ────────────────────────────
if (!ANON) {
  console.log('  ⚠️  NEXT_PUBLIC_SUPABASE_ANON_KEY not set — skipping the RLS checks');
} else {
  const anon = createClient(URL, ANON, { auth: { persistSession: false } });
  const leaked = [];

  for (const table of PRIVATE_TABLES) {
    const { data, error } = await anon.from(table).select('*').limit(1);
    // A policy-blocked read returns either an error or an empty set.
    if (!error && Array.isArray(data) && data.length > 0) leaked.push(table);
  }
  check(leaked.length === 0, `anon key reads none of the ${PRIVATE_TABLES.length} private tables`, leaked.join(', '));

  const { error: courseError } = await anon.from('courses').select('id').limit(1);
  check(!courseError, 'anon key can still read the public catalogue', courseError?.message);
}

// ── Seed state ──────────────────────────────────────────────────────────────
const { count: courseCount } = await admin.from('courses').select('id', { count: 'exact', head: true });
const { count: disclaimerCount } = await admin
  .from('risk_disclaimer_versions')
  .select('id', { count: 'exact', head: true });

console.log(`\n  courses: ${courseCount ?? 0}   disclaimer versions: ${disclaimerCount ?? 0}`);
if (!courseCount) console.log('  (the catalogue seeds itself on first server start)');

console.log(`\n  PASSED: ${pass}   FAILED: ${fail}\n`);
process.exit(fail ? 1 : 0);
