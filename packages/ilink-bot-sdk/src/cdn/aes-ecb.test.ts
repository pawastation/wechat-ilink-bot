import crypto from "node:crypto";
import { describe, it, expect } from "vitest";
import { encryptAesEcb, decryptAesEcb, aesEcbPaddedSize } from "./aes-ecb.js";

describe("AES-128-ECB", () => {
  const key = crypto.randomBytes(16);

  it("round-trips: encrypt then decrypt returns original", () => {
    const plaintext = Buffer.from("hello ilink bot sdk!");
    const ciphertext = encryptAesEcb(plaintext, key);
    const decrypted = decryptAesEcb(ciphertext, key);
    expect(decrypted).toEqual(plaintext);
  });

  it("ciphertext length matches aesEcbPaddedSize", () => {
    const plaintext = Buffer.from("test data 1234567890");
    const ciphertext = encryptAesEcb(plaintext, key);
    expect(ciphertext.length).toBe(aesEcbPaddedSize(plaintext.length));
  });

  it("round-trips empty buffer", () => {
    const plaintext = Buffer.alloc(0);
    const ciphertext = encryptAesEcb(plaintext, key);
    const decrypted = decryptAesEcb(ciphertext, key);
    expect(decrypted).toEqual(plaintext);
  });

  it("round-trips exact block-size (16 bytes)", () => {
    const plaintext = Buffer.alloc(16, 0xab);
    const ciphertext = encryptAesEcb(plaintext, key);
    const decrypted = decryptAesEcb(ciphertext, key);
    expect(decrypted).toEqual(plaintext);
  });

  it("round-trips large payload", () => {
    const plaintext = crypto.randomBytes(10_000);
    const ciphertext = encryptAesEcb(plaintext, key);
    const decrypted = decryptAesEcb(ciphertext, key);
    expect(decrypted).toEqual(plaintext);
  });
});

describe("aesEcbPaddedSize", () => {
  it("pads to next 16-byte boundary", () => {
    expect(aesEcbPaddedSize(0)).toBe(16);
    expect(aesEcbPaddedSize(1)).toBe(16);
    expect(aesEcbPaddedSize(15)).toBe(16);
    expect(aesEcbPaddedSize(16)).toBe(32); // PKCS7 adds full block when aligned
    expect(aesEcbPaddedSize(17)).toBe(32);
  });
});
