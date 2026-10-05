import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
const passwordKeyLength = 64;

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const derivedKey = await scrypt(password, salt, passwordKeyLength);
  return `scrypt$${salt.toString('base64url')}$${derivedKey.toString('base64url')}`;
}

export async function verifyPassword(password, storedHash) {
  const [algorithm, encodedSalt, encodedKey] = String(storedHash || '').split('$');
  if (algorithm !== 'scrypt' || !encodedSalt || !encodedKey) return false;

  try {
    const salt = Buffer.from(encodedSalt, 'base64url');
    const expectedKey = Buffer.from(encodedKey, 'base64url');
    if (expectedKey.length !== passwordKeyLength) return false;
    const actualKey = await scrypt(password, salt, expectedKey.length);
    return timingSafeEqual(expectedKey, actualKey);
  } catch {
    return false;
  }
}

export function createAccessToken() {
  return randomBytes(32).toString('base64url');
}

export function hashAccessToken(token) {
  return createHash('sha256').update(token).digest('hex');
}