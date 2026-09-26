#!/usr/bin/env node
/**
 * Sets (or resets) the master admin password.
 *
 *   npm run setup:admin -- --email admin@gmail.com --password 'StrongPass123!'
 *
 * The password is stored as a scrypt hash in data/db.json. It is never echoed
 * back and never written to the repository.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const N = 16384;
const R = 8;
const P = 1;
const KEY_LEN = 64;

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(password.normalize('NFKC'), salt, KEY_LEN, {
    N,
    r: R,
    p: P,
    maxmem: 64 * 1024 * 1024,
  });
  return ['scrypt', N, R, P, salt.toString('hex'), derived.toString('hex')].join('$');
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--email') out.email = argv[++i];
    else if (argv[i] === '--password') out.password = argv[++i];
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
const email = (args.email || process.env.ADMIN_EMAIL || 'admin@gmail.com').toLowerCase();
const password = args.password || process.env.ADMIN_PASSWORD;

if (!password || password.length < 8) {
  console.error('\n❌ Parol kerak (kamida 8 ta belgi).');
  console.error("   Foydalanish: npm run setup:admin -- --email admin@gmail.com --password 'StrongPass123!'\n");
  process.exit(1);
}

const dbDir = path.join(process.env.DATA_DIR || process.cwd(), 'data');
const dbFile = path.join(dbDir, 'db.json');

if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

let db = {};
if (fs.existsSync(dbFile)) {
  try {
    db = JSON.parse(fs.readFileSync(dbFile, 'utf-8'));
  } catch {
    console.error('❌ data/db.json o‘qib bo‘lmadi.');
    process.exit(1);
  }
}

if (!Array.isArray(db.profiles)) db.profiles = [];

const hash = hashPassword(password);
const idx = db.profiles.findIndex((p) => p.email?.toLowerCase() === email);

if (idx >= 0) {
  delete db.profiles[idx].password;
  db.profiles[idx].password_hash = hash;
  db.profiles[idx].role = 'admin';
} else {
  db.profiles.push({
    id: '00000000-0000-0000-0000-000000000001',
    email,
    full_name: 'Bosh Admin',
    role: 'admin',
    level: 'Pro',
    xp: 0,
    password_hash: hash,
    created_at: new Date().toISOString(),
  });
}

const tmp = path.join(dbDir, `.db.setup.${Date.now()}.tmp`);
fs.writeFileSync(tmp, JSON.stringify(db, null, 2), { encoding: 'utf-8', mode: 0o600 });
fs.renameSync(tmp, dbFile);

console.log(`\n✅ Admin paroli o‘rnatildi: ${email}`);
console.log('   Endi /login sahifasidan shu email va parol bilan kiring.\n');
