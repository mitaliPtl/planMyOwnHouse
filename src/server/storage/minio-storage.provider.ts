import type { StorageProvider, UploadInput } from "./storage-provider.interface";

/**
 * Placeholder S3-compatible (MinIO locally, S3/R2 in prod) storage provider.
 * Deliberately not implemented: nothing in Phase 1-2 calls this. Implement for real in
 * Phase 4 when the plan engine needs to persist rendered output.
 */
export class MinioStorageProvider implements StorageProvider {
  async upload(_input: UploadInput): Promise<{ key: string; url: string }> {
    throw new Error("Not implemented until Phase 4 — see docs/roadmap.md");
  }

  async getSignedUrl(_key: string, _expiresInSeconds?: number): Promise<string> {
    throw new Error("Not implemented until Phase 4 — see docs/roadmap.md");
  }

  async delete(_key: string): Promise<void> {
    throw new Error("Not implemented until Phase 4 — see docs/roadmap.md");
  }
}
