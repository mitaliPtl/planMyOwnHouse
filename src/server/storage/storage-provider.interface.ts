/**
 * Object storage abstraction for generated assets (PNG/SVG/PDF/3D assets/textures/
 * thumbnails). Not consumed by anything in Phase 1-2 — the first real producer is the
 * Phase 4 PlanGenerationEngine writing rendered plan output. `MinioStorageProvider` is
 * a deliberately inert placeholder, not a working implementation.
 */

export interface UploadInput {
  key: string;
  body: Buffer | Uint8Array;
  contentType: string;
}

export interface StorageProvider {
  upload(input: UploadInput): Promise<{ key: string; url: string }>;
  getSignedUrl(key: string, expiresInSeconds?: number): Promise<string>;
  delete(key: string): Promise<void>;
}
