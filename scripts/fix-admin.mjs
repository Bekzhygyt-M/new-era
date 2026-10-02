import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Read the admin password from the environment. Never hardcode it here:
// this file is tracked by git, so a literal would be published.
const password = process.env.ADMIN_PASSWORD;

if (!password) {
  console.error(
    'ADMIN_PASSWORD is not set.\n' +
      'Set it in the environment before running this script, for example:\n' +
      '  ADMIN_PASSWORD=... node scripts/fix-admin.mjs\n' +
      '  # or, to load it from .env.local without shell interpretation:\n' +
      '  node -r dotenv/config scripts/fix-admin.mjs\n' +
      'Note: do NOT use `node --env-file=.env.local` here — it truncates the\n' +
      'value at a "#" and would silently derive a different password.\n' +
      'The value is never printed or logged.'
  );
  process.exit(1);
}

const N = 16384;
const R = 8;
const P = 1;
const KEY_LEN = 64;
const PREFIX = 'scrypt';

const salt = crypto.randomBytes(16);
crypto.scrypt(
  password.normalize('NFKC'),
  salt,
  KEY_LEN,
  { N, r: R, p: P, maxmem: 64 * 1024 * 1024 },
  (err, derived) => {
    if (err) throw err;
    const hash = [PREFIX, N, R, P, salt.toString('hex'), derived.toString('hex')].join('$');
    console.log('Generated hash:', hash);

    // Verify immediately
    const parts = hash.split('$');
    const salt2 = Buffer.from(parts[4], 'hex');
    const expected = Buffer.from(parts[5], 'hex');

    crypto.scrypt(
      password.normalize('NFKC'),
      salt2,
      expected.length,
      { N: Number(parts[1]), r: Number(parts[2]), p: Number(parts[3]), maxmem: 64 * 1024 * 1024 },
      (err2, out) => {
        if (err2) throw err2;
        const ok = crypto.timingSafeEqual(out, expected);
        console.log('Self verify:', ok);

        const dbPath = path.join(process.cwd(), 'data', 'db.json');
        const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
        db.profiles = [
          {
            id: '00000000-0000-0000-0000-000000000001',
            email: 'admin@gmail.com',
            full_name: 'Bosh Admin',
            role: 'admin',
            level: 'Pro',
            xp: 5000,
            password_hash: hash,
            created_at: '2026-01-01T00:00:00.000Z'
          }
        ];
        fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
        console.log('Saved to data/db.json successfully!');
      }
    );
  }
);
