import crypto from 'crypto';

/**
 * Password hashing using scrypt (Node built-in, no external dependency).
 *
 * Stored format:  scrypt$N$r$p$<salt-hex>$<hash-hex>
 * Verification is constant-time via timingSafeEqual.
 */

const N = 16384; // CPU/memory cost
const R = 8;
const P = 1;
const KEY_LEN = 64;
const PREFIX = 'scrypt';

function scryptAsync(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(
      password.normalize('NFKC'),
      salt,
      KEY_LEN,
      { N, r: R, p: P, maxmem: 64 * 1024 * 1024 },
      (err, derived) => (err ? reject(err) : resolve(derived as Buffer))
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const derived = await scryptAsync(password, salt);
  return [PREFIX, N, R, P, salt.toString('hex'), derived.toString('hex')].join('$');
}

export async function verifyPassword(password: string, stored?: string | null): Promise<boolean> {
  if (!stored) return false;

  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== PREFIX) {
    // Legacy plaintext value from an older build — never accept it silently.
    return false;
  }

  const [, nRaw, rRaw, pRaw, saltHex, hashHex] = parts;
  try {
    const salt = Buffer.from(saltHex, 'hex');
    const expected = Buffer.from(hashHex, 'hex');
    const derived = await new Promise<Buffer>((resolve, reject) => {
      crypto.scrypt(
        password.normalize('NFKC'),
        salt,
        expected.length,
        { N: Number(nRaw), r: Number(rRaw), p: Number(pRaw), maxmem: 64 * 1024 * 1024 },
        (err, out) => (err ? reject(err) : resolve(out as Buffer))
      );
    });
    return derived.length === expected.length && crypto.timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

/** True when the stored value is not in the current hash format and must be re-hashed. */
export function needsRehash(stored?: string | null): boolean {
  if (!stored) return true;
  const parts = stored.split('$');
  return parts.length !== 6 || parts[0] !== PREFIX || Number(parts[1]) < N;
}

/** Cryptographically strong random token, URL-safe. */
export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('base64url');
}

/** SHA-256 of a reset token. Only the hash is ever persisted. */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
