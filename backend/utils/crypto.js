import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

const ALGORITHM = 'aes-256-gcm';

function getKey() {
  const secret = process.env.ENCRYPTION_KEY;
  if (!secret) {
    throw new Error('ENCRYPTION_KEY is not defined in environment variables');
  }
  // Return a 32-byte key
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Decrypts a string that was encrypted using aes-256-gcm.
 * Format expected: "hexIV:hexAuthTag:hexCipherText"
 * Handles legacy plain text gracefully.
 */
export function decrypt(stored) {
  if (!stored) return null

  // Check if this looks like our encrypted format: "hexIV:hexAuthTag:hexCipher"
  // IV = 32 hex chars (16 bytes), AuthTag = 32 hex chars (16 bytes), rest is cipher
  const parts = stored.split(':')
  if (parts.length < 3) {
    // Not encrypted format — return as plain text (legacy data)
    console.warn('[Crypto] decrypt: data is not in encrypted format, returning as plain text')
    return stored
  }

  // Validate that first two parts look like hex strings of correct length
  const [ivHex, authTagHex, ...cipherParts] = parts
  const cipherText = cipherParts.join(':')  // re-join in case cipher itself had colons

  if (ivHex.length !== 32 || authTagHex.length !== 32) {
    // Doesn't match our format — treat as plain text
    console.warn('[Crypto] decrypt: iv/authTag length mismatch, returning as plain text')
    return stored
  }

  if (!/^[0-9a-f]+$/i.test(ivHex) || !/^[0-9a-f]+$/i.test(authTagHex)) {
    // Not valid hex — treat as plain text
    console.warn('[Crypto] decrypt: not valid hex, returning as plain text')
    return stored
  }

  try {
    const key = getKey()
    const iv = Buffer.from(ivHex, 'hex')
    const authTag = Buffer.from(authTagHex, 'hex')
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)
    let decrypted = decipher.update(cipherText, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  } catch (err) {
    // Decryption failed (wrong key, corrupted data, or plain text) — return as-is
    console.warn('[Crypto] decrypt failed, returning raw value:', err.message)
    return stored
  }
}

/**
 * Decrypts title and imageUrl fields of a task document.
 * Also ensures id/image mapping for frontend compatibility.
 */
export function decryptTask(taskDoc) {
  if (!taskDoc) return null
  try {
    const t = typeof taskDoc.toObject === 'function' ? taskDoc.toObject() : { ...taskDoc }
    const decryptedTitle = t.title ? decrypt(t.title) : '';
    const decryptedImageUrl = t.imageUrl ? decrypt(t.imageUrl) : null;

    const result = {
      ...t,
      _id: t._id ? t._id.toString() : t._id,
      id: t._id ? t._id.toString() : undefined,
      title: decryptedTitle,
      imageUrl: decryptedImageUrl
    }

    // Map imageUrl to image for frontend compatibility
    if (result.imageUrl) {
      result.image = result.imageUrl.startsWith('/uploads/')
        ? result.imageUrl.replace('/uploads/', '')
        : result.imageUrl;
    }

    return result;
  } catch (err) {
    console.error('[Crypto] decryptTask failed:', err.message, '— returning raw doc')
    const t = typeof taskDoc.toObject === 'function' ? taskDoc.toObject() : { ...taskDoc }
    const res = { ...t, _id: t._id ? t._id.toString() : t._id }
    if (res._id) res.id = res._id;
    return res;
  }
}
