// @ts-check

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

// Budget for the entry chunk, gzipped. Baseline measured 2026-07-02: the fixed
// build's entry is ~77 kB gzip (77,158 bytes). 90 kB gives ~15% headroom while
// still catching a regression such as React leaking back into the entry (which
// would push it toward ~135 kB). See the spec: gate the ENTRY chunk, not total
// initial JS — a React leak moves bytes between chunks without changing the total.
export const MAX_ENTRY_GZIP_BYTES = 92160; // 90 * 1024

/**
 * Extract the single ES-module entry chunk path from built index.html.
 * Fails closed if there is not exactly one module-script tag.
 * @param {string} html
 * @returns {string}
 */
export function resolveEntryChunk(html) {
  const moduleScriptTags = [
    ...html.matchAll(/<script\b[^>]*\btype=["']module["'][^>]*>/gi),
  ].map((m) => m[0]);

  if (moduleScriptTags.length === 0) {
    throw new Error(
      "check-bundle-size: no module-script tag found in index.html",
    );
  }
  if (moduleScriptTags.length > 1) {
    const srcs = moduleScriptTags.map(
      (tag) => /\bsrc=["']([^"']+)["']/i.exec(tag)?.[1] ?? "<inline>",
    );
    throw new Error(
      `check-bundle-size: expected one module-script tag, found multiple module-script tags: ${srcs.join(", ")}`,
    );
  }

  const entry = /\bsrc=["']([^"']+)["']/i.exec(moduleScriptTags[0])?.[1];
  if (!entry) {
    throw new Error(
      "check-bundle-size: module-script tag is missing src in index.html",
    );
  }
  return entry;
}

/**
 * Compare a chunk's gzipped size to a byte budget.
 * @param {Buffer} gzipped
 * @param {number} budgetBytes
 */
export function checkGzipBudget(gzipped, budgetBytes) {
  return {
    ok: gzipped.length <= budgetBytes,
    gzipBytes: gzipped.length,
    budgetBytes,
  };
}

function main() {
  const distDir = join(dirname(fileURLToPath(import.meta.url)), "..", "dist");
  const html = readFileSync(join(distDir, "index.html"), "utf8");
  const entry = resolveEntryChunk(html);
  const file = join(distDir, entry.replace(/^\//, ""));
  const gzipped = gzipSync(readFileSync(file));
  const { ok, gzipBytes, budgetBytes } = checkGzipBudget(
    gzipped,
    MAX_ENTRY_GZIP_BYTES,
  );

  const kb = (n) => (n / 1024).toFixed(1);
  console.log(`Entry chunk: ${entry}`);
  console.log(`Gzip size:   ${kb(gzipBytes)} kB (${gzipBytes} bytes)`);
  console.log(`Budget:      ${kb(budgetBytes)} kB (${budgetBytes} bytes)`);

  if (!ok) {
    console.error(
      `\n❌ Entry chunk exceeds budget by ${kb(gzipBytes - budgetBytes)} kB. ` +
        `Investigate what landed in the entry (npm run analyze) before raising MAX_ENTRY_GZIP_BYTES.`,
    );
    process.exit(1);
  }
  console.log("\n✅ Entry chunk within budget.");
}

// Run only when invoked directly (not when imported by the test).
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
