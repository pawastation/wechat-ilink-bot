/** Optional dependency — install silk-wasm separately for SILK → WAV transcoding. */
declare module "silk-wasm" {
  export function decode(
    input: Buffer | Uint8Array,
    sampleRate: number,
  ): Promise<{ data: Uint8Array; duration: number }>;
}
