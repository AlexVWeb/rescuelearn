/**
 * Returns a cryptographically secure random float between 0 (inclusive) and 1 (exclusive).
 * Equivalent to Math.random() but secure.
 * Works in both Browser and Node.js.
 */
export function secureRandom(): number {
  if (typeof window !== "undefined" && window.crypto) {
    const array = new Uint32Array(1);
    window.crypto.getRandomValues(array);
    return array[0] / (0xffffffff + 1);
  }

  // Server-side (Node.js) - Using global crypto if available (Node 19+) or fallback to node:crypto
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { randomBytes } = require("node:crypto");
    const buffer = randomBytes(4);
    return buffer.readUint32BE(0) / (0xffffffff + 1);
  } catch {
    // Fallback if node:crypto is not available (unlikely in this environment)
    throw new Error(
      "Cryptographically secure random number generation not available"
    );
  }
}

/**
 * Shuffles an array using the Fisher-Yates algorithm and secureRandom.
 * Returns a new array.
 */
export function secureShuffle<T>(array: T[] | readonly T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(secureRandom() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
