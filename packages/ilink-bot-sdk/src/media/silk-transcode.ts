import type { Logger } from "../logger.js";
import { defaultLogger } from "../logger.js";

const SILK_SAMPLE_RATE = 24_000;

/**
 * Wrap raw pcm_s16le bytes in a WAV container.
 * Mono channel, 16-bit signed little-endian.
 */
function pcmBytesToWav(pcm: Uint8Array, sampleRate: number): Buffer {
  const pcmBytes = pcm.byteLength;
  const totalSize = 44 + pcmBytes;
  const buf = Buffer.allocUnsafe(totalSize);
  let offset = 0;

  buf.write("RIFF", offset);
  offset += 4;
  buf.writeUInt32LE(totalSize - 8, offset);
  offset += 4;
  buf.write("WAVE", offset);
  offset += 4;

  buf.write("fmt ", offset);
  offset += 4;
  buf.writeUInt32LE(16, offset);
  offset += 4;
  buf.writeUInt16LE(1, offset);
  offset += 2; // PCM format
  buf.writeUInt16LE(1, offset);
  offset += 2; // mono
  buf.writeUInt32LE(sampleRate, offset);
  offset += 4;
  buf.writeUInt32LE(sampleRate * 2, offset);
  offset += 4; // byte rate
  buf.writeUInt16LE(2, offset);
  offset += 2; // block align
  buf.writeUInt16LE(16, offset);
  offset += 2; // bits per sample

  buf.write("data", offset);
  offset += 4;
  buf.writeUInt32LE(pcmBytes, offset);
  offset += 4;

  Buffer.from(pcm.buffer, pcm.byteOffset, pcm.byteLength).copy(buf, offset);

  return buf;
}

/**
 * Try to transcode a SILK audio buffer to WAV using silk-wasm.
 *
 * Returns a WAV Buffer on success, or null if silk-wasm is unavailable or decoding fails.
 * Callers should fall back to passing the raw SILK file when null is returned.
 *
 * silk-wasm is not a dependency of this package — install it separately if needed.
 */
export async function silkToWav(silkBuf: Buffer, logger?: Logger): Promise<Buffer | null> {
  const log = logger ?? defaultLogger;
  try {
    const { decode } = await import("silk-wasm");

    log.debug(`silkToWav: decoding ${silkBuf.length} bytes of SILK`);
    const result = await decode(silkBuf, SILK_SAMPLE_RATE);
    log.debug(`silkToWav: decoded duration=${result.duration}ms pcmBytes=${result.data.byteLength}`);

    const wav = pcmBytesToWav(result.data, SILK_SAMPLE_RATE);
    log.debug(`silkToWav: WAV size=${wav.length}`);
    return wav;
  } catch (err) {
    log.warn(`silkToWav: transcode unavailable or failed, will use raw silk err=${String(err)}`);
    return null;
  }
}
