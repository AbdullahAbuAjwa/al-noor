import {
  randomBytes,
  scrypt as nodeScrypt,
  timingSafeEqual,
} from "node:crypto";

const cost = 16_384;
const blockSize = 8;
const parallelization = 1;
const keyLength = 32;

function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    nodeScrypt(
      password,
      salt,
      keyLength,
      { cost, blockSize, parallelization },
      (error, key) => {
        if (error) reject(error);
        else resolve(key);
      },
    );
  });
}

// This format is shared by demo provisioning and the later login service.
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await deriveKey(password, salt);
  return `scrypt$${cost}$${blockSize}$${parallelization}$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const parts = stored.split("$");
  if (
    parts.length !== 6 ||
    parts[0] !== "scrypt" ||
    parts[1] !== String(cost) ||
    parts[2] !== String(blockSize) ||
    parts[3] !== String(parallelization) ||
    !/^[A-Za-z0-9_-]{22}$/.test(parts[4]) ||
    !/^[A-Za-z0-9_-]{43}$/.test(parts[5])
  ) {
    return false;
  }

  const expected = Buffer.from(parts[5], "base64url");
  const actual = await deriveKey(password, Buffer.from(parts[4], "base64url"));
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
