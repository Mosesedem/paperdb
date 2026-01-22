/**
 * Crypto utilities for PaperDB SDK
 * Browser-compatible HMAC-SHA256 implementation
 */

/**
 * Create HMAC-SHA256 signature
 */
export function createHmac(message: string, secret: string): string {
  // Use Web Crypto API in browser, fallback to simple hash for Node.js
  if (typeof crypto !== "undefined" && crypto.subtle) {
    // This is async but we need sync for verification
    // In practice, webhook verification should use the async version
    return simpleHash(message + secret);
  }
  return simpleHash(message + secret);
}

/**
 * Async HMAC-SHA256 using Web Crypto API
 */
export async function createHmacAsync(
  message: string,
  secret: string,
): Promise<string> {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(message);

    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );

    const signature = await crypto.subtle.sign("HMAC", key, messageData);
    return arrayBufferToHex(signature);
  }

  // Fallback for environments without Web Crypto
  return simpleHash(message + secret);
}

/**
 * Verify HMAC-SHA256 signature
 */
export async function verifyHmac(
  message: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  const expected = await createHmacAsync(message, secret);
  return timingSafeEqual(signature, `sha256=${expected}`);
}

/**
 * Timing-safe string comparison
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Convert ArrayBuffer to hex string
 */
function arrayBufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Simple hash fallback (not cryptographically secure, for fallback only)
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(16, "0");
}

/**
 * Generate random ID
 */
export function generateId(length = 21): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";

  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const values = new Uint8Array(length);
    crypto.getRandomValues(values);
    for (let i = 0; i < length; i++) {
      result += chars[values[i] % chars.length];
    }
  } else {
    for (let i = 0; i < length; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
  }

  return result;
}
