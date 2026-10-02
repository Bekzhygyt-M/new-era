import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const dbPath = path.join(process.cwd(), 'data', 'db.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

const admin = db.profiles.find(p => p.email === 'admin@gmail.com');
console.log('Admin found:', Boolean(admin));

// Read the admin password from the environment. Never hardcode it here:
// this file is tracked by git, so a literal would be published.
const password = process.env.ADMIN_PASSWORD;

if (!password) {
  console.error(
    'ADMIN_PASSWORD is not set.\n' +
      'Set it in the environment before running this script, for example:\n' +
      '  ADMIN_PASSWORD=... node scripts/test-login.mjs\n' +
      '  # or, to load it from .env.local without shell interpretation:\n' +
      '  node -r dotenv/config scripts/test-login.mjs\n' +
      'Note: do NOT use `node --env-file=.env.local` here — it truncates the\n' +
      'value at a "#" and would silently verify the wrong password.\n' +
      'The value is never printed or logged.'
  );
  process.exit(1);
}

if (!admin) {
  console.error('Admin profile not found in data/db.json — nothing to verify.');
  process.exit(1);
}

const stored = admin.password_hash;
const parts = stored.split('$');
const [, nRaw, rRaw, pRaw, saltHex, hashHex] = parts;
const salt = Buffer.from(saltHex, 'hex');
const expected = Buffer.from(hashHex, 'hex');

crypto.scrypt(
  password.normalize('NFKC'),
  salt,
  expected.length,
  { N: Number(nRaw), r: Number(rRaw), p: Number(pRaw), maxmem: 64 * 1024 * 1024 },
  (err, out) => {
    if (err) throw err;
    const ok = out.length === expected.length && crypto.timingSafeEqual(out, expected);
    console.log('Login credentials match:', ok);
  }
);
