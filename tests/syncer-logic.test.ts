import { describe, expect, it } from "vitest";
import { computeStaleFiles } from "../src/lib/index/syncer";

describe("computeStaleFiles", () => {
  it("returns paths in cache but not seen", () => {
    const cached = new Set(["/a.ts", "/b.ts", "/c.ts"]);
    const seen = new Set(["/a.ts", "/c.ts"]);
    const stale = computeStaleFiles(cached, seen);
    expect(stale).toEqual(["/b.ts"]);
  });

  it("returns empty when all cached paths were seen", () => {
    const cached = new Set(["/a.ts", "/b.ts"]);
    const seen = new Set(["/a.ts", "/b.ts"]);
    expect(computeStaleFiles(cached, seen)).toEqual([]);
  });

  it("handles empty cache", () => {
    const cached = new Set<string>();
    const seen = new Set(["/a.ts"]);
    expect(computeStaleFiles(cached, seen)).toEqual([]);
  });

  it("handles empty seen set", () => {
    const cached = new Set(["/a.ts", "/b.ts"]);
    const seen = new Set<string>();
    const stale = computeStaleFiles(cached, seen);
    expect(stale).toEqual(["/a.ts", "/b.ts"]);
  });

  it("returns multiple stale paths", () => {
    const cached = new Set(["/a.ts", "/b.ts", "/c.ts", "/d.ts"]);
    const seen = new Set(["/b.ts"]);
    const stale = computeStaleFiles(cached, seen);
    expect(stale).toHaveLength(3);
    expect(stale).toContain("/a.ts");
    expect(stale).toContain("/c.ts");
    expect(stale).toContain("/d.ts");
  });
});
