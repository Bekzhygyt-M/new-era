#!/usr/bin/env node
/**
 * Copies the local JSON store into Supabase.
 *
 * Safe to re-run: rows are upserted by primary key, so a partial run can be
 * resumed. Parents are inserted before children, so foreign keys always
 * resolve. Nothing is deleted — this only adds.
 *
 *   npm run supabase:migrate            # copy data/db.json
 *   npm run supabase:migrate -- --dry   # show what would be copied
 */
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const ROOT = process.cwd();
const DRY = process.argv.includes('--dry');

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
const DB_FILE = path.join(ROOT, 'data/db.json');

if (!URL || !SERVICE) {
  console.error('\n  Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local\n');
  process.exit(1);
}
if (!fs.existsSync(DB_FILE)) {
  console.error(`\n  Nothing to migrate: ${DB_FILE} does not exist.\n`);
  process.exit(1);
}

const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
const sb = createClient(URL, SERVICE, { auth: { persistSession: false } });

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Local ids like `usr_abc` are not UUIDs; let Postgres mint one instead. */
const keepId = (row) => (UUID.test(String(row.id || '')) ? row.id : undefined);

const iso = (v) => (v ? new Date(v).toISOString() : undefined);

/**
 * Parent-first order. Each entry maps a local collection to its table and
 * reshapes rows where the model and schema deliberately differ.
 */
const STEPS = [
  { table: 'profiles', from: 'profiles', map: (r) => ({ id: keepId(r), email: r.email, full_name: r.full_name, first_name: r.first_name, last_name: r.last_name, role: r.role, level: r.level, xp: r.xp, phone: r.phone, avatar_url: r.avatar_url, password_hash: r.password_hash, language: r.language, theme: r.theme, last_active_at: iso(r.last_active_at), created_at: iso(r.created_at) }) },
  { table: 'courses', from: 'courses', map: (r) => ({ id: keepId(r), title: r.title, slug: r.slug, description: r.description, short_description: r.short_description, level: r.level, price: r.price, currency: r.currency, published: r.published, featured: r.featured, thumbnail_url: r.thumbnail_url, order_index: r.order_index, certificate_prefix: r.certificate_prefix }) },
  { table: 'modules', from: 'modules', map: (r) => ({ id: keepId(r), course_id: r.course_id, title: r.title, description: r.description, order_index: r.order_index, icon: r.icon, is_published: r.is_published ?? true, requires_backtest: r.requires_backtest ?? false, requires_journal: r.requires_journal ?? false }) },
  { table: 'lessons', from: 'lessons', map: (r) => ({ id: keepId(r), module_id: r.module_id, title: r.title, short_description: r.short_description, description: r.description, summary: r.summary, key_terms: r.key_terms ?? [], video_url: r.video_url, video_storage_path: r.video_storage_path, video_provider: r.video_provider || 'file', duration: r.duration, order_index: r.order_index, xp_reward: r.xp_reward, watch_requirement: r.watch_requirement, is_published: r.is_published, preview_enabled: r.preview_enabled ?? false, allow_seeking: r.allow_seeking ?? false }) },
  { table: 'tests', from: 'tests', map: (r) => ({ id: keepId(r), lesson_id: r.lesson_id, title: r.title, passing_score: r.passing_score, max_attempts: r.max_attempts, is_published: r.is_published, created_at: iso(r.created_at) }) },
  { table: 'questions', from: 'questions', map: (r) => ({ id: keepId(r), test_id: r.test_id, question: r.question, order_index: r.order_index, points: r.points, multiple: r.multiple }) },
  { table: 'answers', from: 'answers', map: (r) => ({ id: keepId(r), question_id: r.question_id, answer: r.answer, is_correct: r.is_correct, order_index: r.order_index }) },
  { table: 'enrollments', from: 'enrollments', map: (r) => ({ id: keepId(r), user_id: r.user_id, course_id: r.course_id, status: r.status, purchased_at: iso(r.purchased_at), source: r.source, completed_at: iso(r.completed_at) }) },
  { table: 'lesson_progress', from: 'lesson_progress', map: (r) => ({ id: keepId(r), user_id: r.user_id, lesson_id: r.lesson_id, watched_seconds: r.watched_seconds, watch_percentage: r.watch_percentage, video_completed: r.video_completed, test_passed: r.test_passed, test_score: r.test_score, xp_earned: r.xp_earned, completed: r.completed, completed_at: iso(r.completed_at), updated_at: iso(r.updated_at) }) },
  { table: 'test_attempts', from: 'test_attempts', map: (r) => ({ id: keepId(r), user_id: r.user_id, test_id: r.test_id, lesson_id: r.lesson_id, score: r.score, passed: r.passed, correct_count: r.correct_count, total_questions: r.total_questions, answers_data: r.answers_data ?? {}, created_at: iso(r.created_at) }) },
  { table: 'xp_transactions', from: 'xp_transactions', map: (r) => ({ id: keepId(r), user_id: r.user_id, amount: r.amount, reason: r.reason, source: r.source, reference_id: r.reference_id, created_at: iso(r.created_at) }) },
  { table: 'payments', from: 'payments', map: (r) => ({ id: keepId(r), order_id: r.order_id, user_id: r.user_id, course_id: r.course_id, amount: r.amount, currency: r.currency, provider: r.provider, status: r.status, first_name: r.first_name, last_name: r.last_name, phone: r.phone, comment: r.comment, receipt_url: r.receipt_url, expires_at: iso(r.expires_at), submitted_at: iso(r.submitted_at), approved_at: iso(r.approved_at), rejected_at: iso(r.rejected_at), cancelled_at: iso(r.cancelled_at), rejection_reason: r.rejection_reason, approved_by: r.approved_by, paid_at: iso(r.paid_at), created_at: iso(r.created_at) }) },
  { table: 'payment_methods', from: 'payment_methods', map: (r) => ({ id: keepId(r), name: r.name, logo: r.logo, enabled: r.enabled, supported: r.supported, order_index: r.order_index }) },
  { table: 'notifications', from: 'notifications', map: (r) => ({ id: keepId(r), user_id: r.user_id === 'all' ? null : r.user_id, title: r.title, message: r.message, type: r.type, link: r.link, read: r.read, created_at: iso(r.created_at) }) },
  { table: 'messages', from: 'messages', map: (r) => ({ id: keepId(r), user_id: r.user_id, sender: r.sender, text: r.text, read: r.read, created_at: iso(r.created_at) }) },
  { table: 'journals', from: 'journals', map: (r) => ({ id: keepId(r), user_id: r.user_id, trade_date: r.date, pair: r.pair, direction: r.type, entry_price: r.entryPrice, exit_price: r.exitPrice, stop_loss: r.stopLoss, take_profit: r.takeProfit, pnl: r.pnl, rr: r.rr, status: r.status, strategy: r.strategy, screenshot_url: r.screenshot_url, note: r.note, created_at: iso(r.created_at) }) },
  { table: 'backtests', from: 'backtests', map: (r) => ({ id: keepId(r), user_id: r.user_id, module_id: r.module_id, name: r.name, instrument: r.instrument, timeframe: r.timeframe, total_trades: r.totalTrades, wins: r.wins, losses: r.losses, win_rate: r.winRate, rr: r.rr, pnl_percent: r.pnlPercent, max_dd: r.maxDD, profit_factor: r.profitFactor, screenshot_url: r.screenshot_url, notes: r.notes, created_at: iso(r.created_at) }) },
  { table: 'certificates', from: 'certificates', map: (r) => ({ id: keepId(r), certificate_id: r.certificate_id, user_id: r.user_id, course_id: r.course_id, full_name: r.full_name, course_title: r.course_title, issued_at: iso(r.issued_at), revoked: r.revoked }) },
  { table: 'risk_disclaimer_versions', from: 'disclaimer_versions', map: (r) => ({ id: keepId(r), version: r.version, content: r.content, summary_points: r.summary_points ?? [], is_active: r.is_active, created_at: iso(r.created_at) }) },
  { table: 'risk_disclaimer_acceptances', from: 'disclaimer_acceptances', map: (r) => ({ id: keepId(r), user_id: r.user_id, version: r.version, accepted_at: iso(r.accepted_at), ip: r.ip, user_agent: r.user_agent }) },
  { table: 'reviews', from: 'reviews', map: (r) => ({ id: keepId(r), user_id: r.user_id, course_id: r.course_id, author_name: r.author_name, rating: r.rating, content: r.content, approved: r.approved, created_at: iso(r.created_at) }) },
  { table: 'faqs', from: 'faqs', map: (r) => ({ id: keepId(r), question_uz: r.question_uz, question_ru: r.question_ru, question_en: r.question_en, answer_uz: r.answer_uz, answer_ru: r.answer_ru, answer_en: r.answer_en, order_index: r.order_index, published: r.published }) },
  { table: 'activity_logs', from: 'activity_logs', map: (r) => ({ id: keepId(r), user_id: r.user_id, action: r.action, metadata: r.metadata ?? {}, created_at: iso(r.created_at) }) },
];

/**
 * Rows derived from a parent collection rather than a collection of their own:
 * lesson materials and the three per-locale translation tables.
 */
const DERIVED = [
  {
    table: 'lesson_materials',
    rows: () =>
      (db.lessons || []).flatMap((lesson) =>
        (lesson.materials || []).map((m, index) => ({
          lesson_id: lesson.id,
          title: m.title,
          url: m.url,
          type: m.type || 'file',
          order_index: index + 1,
        }))
      ),
  },
  ...['course', 'module', 'lesson'].map((entity) => ({
    table: `${entity}_translations`,
    rows: () =>
      (db.translations || [])
        .filter((t) => t.entity === entity)
        .map((t) => {
          const row = { [`${entity}_id`]: t.entity_id, locale: t.locale, title: t.title, description: t.description };
          if (entity !== 'module') row.short_description = t.short_description;
          if (entity === 'lesson') { row.summary = t.summary; row.key_terms = t.key_terms; }
          return row;
        }),
  })),
];

/** Drops undefined so a column keeps its default instead of becoming null. */
const clean = (row) => Object.fromEntries(Object.entries(row).filter(([, v]) => v !== undefined));

console.log(`\n── ${DRY ? 'Dry run' : 'Migrating'} data/db.json → ${URL.replace(/^https?:\/\//, '')}\n`);

let failed = 0;
for (const step of STEPS) {
  const source = db[step.from] || [];
  if (!source.length) {
    console.log(`  ·  ${step.table.padEnd(28)} 0`);
    continue;
  }

  const rows = source.map((r) => clean(step.map(r)));

  if (DRY) {
    console.log(`  →  ${step.table.padEnd(28)} ${rows.length}`);
    continue;
  }

  // Chunked so a large table cannot blow the request limit.
  let written = 0;
  let error = null;
  for (let i = 0; i < rows.length; i += 200) {
    const chunk = rows.slice(i, i + 200);
    const { error: chunkError } = await sb.from(step.table).upsert(chunk, { onConflict: 'id' });
    if (chunkError) { error = chunkError; break; }
    written += chunk.length;
  }

  if (error) {
    failed++;
    console.log(`  ❌ ${step.table.padEnd(28)} ${error.message}`);
  } else {
    console.log(`  ✅ ${step.table.padEnd(28)} ${written}`);
  }
}

for (const step of DERIVED) {
  const rows = step.rows().map(clean).filter((r) => Object.keys(r).length > 2);
  if (!rows.length) { console.log(`  ·  ${step.table.padEnd(28)} 0`); continue; }
  if (DRY) { console.log(`  →  ${step.table.padEnd(28)} ${rows.length}`); continue; }

  const { error } = await sb.from(step.table).insert(rows);
  if (error) { failed++; console.log(`  ❌ ${step.table.padEnd(28)} ${error.message}`); }
  else console.log(`  ✅ ${step.table.padEnd(28)} ${rows.length}`);
}

// Settings live in a single row.
if (!DRY && db.settings) {
  const { error } = await sb.from('platform_settings').update(db.settings).eq('id', true);
  if (error) { failed++; console.log(`  ❌ platform_settings            ${error.message}`); }
  else console.log('  ✅ platform_settings            1');
}

console.log(
  DRY
    ? '\n  Dry run only — nothing was written.\n'
    : failed
      ? `\n  ${failed} table(s) failed. Fix the cause and re-run — upserts are idempotent.\n`
      : '\n  Done. Set SUPABASE_SERVICE_ROLE_KEY and the app switches over automatically.\n'
);
process.exit(failed ? 1 : 0);
