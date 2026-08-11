import { describe, it, expect, vi, afterEach } from "vitest";

import { InMemoryRateLimiter } from "@/lib/rate-limit";

describe("InMemoryRateLimiter", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows requests up to the max within the window", async () => {
    const limiter = new InMemoryRateLimiter(3, 60_000);

    const first = await limiter.limit("key-a");
    const second = await limiter.limit("key-a");
    const third = await limiter.limit("key-a");

    expect(first.success).toBe(true);
    expect(second.success).toBe(true);
    expect(third.success).toBe(true);
    expect(third.remaining).toBe(0);
  });

  it("rejects requests once the max is exceeded within the window", async () => {
    const limiter = new InMemoryRateLimiter(2, 60_000);

    await limiter.limit("key-b");
    await limiter.limit("key-b");
    const blocked = await limiter.limit("key-b");

    expect(blocked.success).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("tracks separate keys independently", async () => {
    const limiter = new InMemoryRateLimiter(1, 60_000);

    const a = await limiter.limit("key-c");
    const b = await limiter.limit("key-d");

    expect(a.success).toBe(true);
    expect(b.success).toBe(true);
  });

  it("allows requests again once the window has elapsed", async () => {
    vi.useFakeTimers();
    const limiter = new InMemoryRateLimiter(1, 1_000);

    const first = await limiter.limit("key-e");
    const blocked = await limiter.limit("key-e");

    vi.advanceTimersByTime(1_001);

    const afterWindow = await limiter.limit("key-e");

    expect(first.success).toBe(true);
    expect(blocked.success).toBe(false);
    expect(afterWindow.success).toBe(true);
  });
});
