import { gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import {
  checkGzipBudget,
  resolveEntryChunk,
} from "../../scripts/check-bundle-size.js";

describe("resolveEntryChunk", () => {
  it("returns the single module-script src", () => {
    const html = `<!doctype html><html><head>
      <script type="module" crossorigin src="/assets/index-ABC123.js"></script>
      <link rel="modulepreload" crossorigin href="/assets/vendor-XYZ.js">
      </head><body></body></html>`;
    expect(resolveEntryChunk(html)).toBe("/assets/index-ABC123.js");
  });

  it("is filename-agnostic (does not rely on the index- prefix)", () => {
    const html = `<script type="module" src="/assets/main-DEADBEEF.js"></script>`;
    expect(resolveEntryChunk(html)).toBe("/assets/main-DEADBEEF.js");
  });

  it("throws when there is no module-script tag (fail closed)", () => {
    const html = `<script src="/assets/legacy.js"></script>`;
    expect(() => resolveEntryChunk(html)).toThrow(/no module-script/i);
  });

  it("throws when there are multiple module-script tags (fail closed)", () => {
    const html = `
      <script type="module" src="/assets/a.js"></script>
      <script type="module" src="/assets/b.js"></script>`;
    expect(() => resolveEntryChunk(html)).toThrow(/multiple module-script/i);
  });
});

describe("checkGzipBudget", () => {
  const budget = 100; // bytes, for the test

  it("passes when gzipped size is under budget", () => {
    const small = gzipSync(Buffer.alloc(10, "a"));
    const result = checkGzipBudget(small, budget);
    expect(result.ok).toBe(true);
    expect(result.gzipBytes).toBe(small.length);
  });

  it("fails when gzipped size exceeds budget", () => {
    // Incompressible random bytes so the gzip output reliably exceeds 100 bytes.
    const big = gzipSync(
      Buffer.from(
        Array.from({ length: 5000 }, () => Math.floor(Math.random() * 256)),
      ),
    );
    const result = checkGzipBudget(big, budget);
    expect(result.ok).toBe(false);
  });
});
