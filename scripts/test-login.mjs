import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const dbPath = path.join(process.cwd(), 'data', 'db.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

const admin = db.profiles.find(p => p.email === 'admin@gmail.com');
console.log('Admin found:', Boolean(admin));

const password = 'w!_u#A$U_D9eYELj';
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
