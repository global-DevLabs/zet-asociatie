import crypto from "node:crypto";

/**
 * Application-level encryption helpers for sensitive data at rest.
 *
 * - Uses AES-256-GCM for authenticated encryption.
 * - Keys are derived from a passphrase + ENCRYPTION_SALT via PBKDF2.
 * - No encryption keys are stored in the database.
 *
 * NOTE:
 * - This module is intended for server-side use only.
 * - Do not import it into client/renderer code.
 */

const PBKDF2_ITERATIONS = 100_000;
const KEY_LENGTH = 32; // 256 bits
const DIGEST = "sha256";
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // recommended for GCM

export type EncryptedField = {
  iv: string; // base64
  authTag: string; // base64
  ciphertext: string; // base64
};

function getEncryptionSalt(): string {
  const salt = process.env.ENCRYPTION_SALT;
  if (!salt) {
    throw new Error(
      "ENCRYPTION_SALT is not set. This is required for application-level encryption.",
    );
  }
  return salt;
}

/**
 * Derive a 256-bit AES key from a passphrase and ENCRYPTION_SALT.
 *
 * In the offline Electron setup, the passphrase can be based on
 * user credentials or an installation-specific secret, but the
 * derived key itself is never stored directly.
 */
export function deriveEncryptionKey(passphrase: string): Buffer {
  const salt = Buffer.from(getEncryptionSalt(), "utf8");
  return crypto.pbkdf2Sync(
    passphrase,
    salt,
    PBKDF2_ITERATIONS,
    KEY_LENGTH,
    DIGEST,
  );
}

export function encryptField(plaintext: string, key: Buffer): EncryptedField {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return {
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  };
}

export function decryptField(
  encrypted: EncryptedField,
  key: Buffer,
): string {
  const iv = Buffer.from(encrypted.iv, "base64");
  const authTag = Buffer.from(encrypted.authTag, "base64");
  const ciphertext = Buffer.from(encrypted.ciphertext, "base64");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

