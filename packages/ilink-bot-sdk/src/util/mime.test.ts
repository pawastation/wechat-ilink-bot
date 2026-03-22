import { describe, it, expect } from "vitest";
import { getMimeFromFilename, getExtensionFromMime, getExtensionFromContentTypeOrUrl } from "./mime.js";

describe("getMimeFromFilename", () => {
  it("returns correct MIME for known extensions", () => {
    expect(getMimeFromFilename("photo.png")).toBe("image/png");
    expect(getMimeFromFilename("doc.pdf")).toBe("application/pdf");
    expect(getMimeFromFilename("video.mp4")).toBe("video/mp4");
    expect(getMimeFromFilename("PHOTO.JPG")).toBe("image/jpeg");
  });

  it("returns octet-stream for unknown", () => {
    expect(getMimeFromFilename("file.xyz")).toBe("application/octet-stream");
  });

  it("handles no extension", () => {
    expect(getMimeFromFilename("README")).toBe("application/octet-stream");
  });

  it("handles path with directories", () => {
    expect(getMimeFromFilename("/tmp/uploads/photo.png")).toBe("image/png");
  });
});

describe("getExtensionFromMime", () => {
  it("returns correct extension for known MIME", () => {
    expect(getExtensionFromMime("image/png")).toBe(".png");
    expect(getExtensionFromMime("video/mp4")).toBe(".mp4");
  });

  it("handles MIME with charset", () => {
    expect(getExtensionFromMime("text/plain; charset=utf-8")).toBe(".txt");
  });

  it("returns .bin for unknown", () => {
    expect(getExtensionFromMime("application/x-custom")).toBe(".bin");
  });
});

describe("getExtensionFromContentTypeOrUrl", () => {
  it("prefers Content-Type when known", () => {
    expect(getExtensionFromContentTypeOrUrl("image/png", "https://example.com/file.jpg")).toBe(".png");
  });

  it("falls back to URL extension", () => {
    expect(getExtensionFromContentTypeOrUrl(null, "https://example.com/file.jpg")).toBe(".jpg");
  });

  it("falls back to URL when Content-Type is unknown", () => {
    expect(getExtensionFromContentTypeOrUrl("application/x-custom", "https://example.com/file.mp4")).toBe(".mp4");
  });

  it("returns .bin when nothing matches", () => {
    expect(getExtensionFromContentTypeOrUrl(null, "https://example.com/file")).toBe(".bin");
  });
});
