import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { verifyAssets } from "./helpers/assets";
import type { AssetManifest } from "./helpers/assets";
const manifest = JSON.parse(
  readFileSync(new URL("../docs/preservation.json", import.meta.url), "utf8"),
) as AssetManifest;
const source = execFileSync("git", ["show", "72c1ba9:index.html"], {
  maxBuffer: 10_000_000,
});
const read = (path: string) =>
  readFileSync(new URL("../" + path, import.meta.url));

test("asset verifier rejects an empty inventory", () => {
  assert.throws(
    () => verifyAssets({ ...manifest, assets: [] }, source, read),
    /seven/,
  );
});
test("asset verifier rejects duplicate inventory entries", () => {
  assert.throws(
    () =>
      verifyAssets(
        { ...manifest, assets: manifest.assets.map(() => manifest.assets[0]) },
        source,
        read,
      ),
    /unique/,
  );
});
test("asset verifier rejects altered historical source identity", () => {
  assert.throws(
    () =>
      verifyAssets({ ...manifest, sourceSha256: "0".repeat(64) }, source, read),
    /source/,
  );
  assert.throws(
    () => verifyAssets({ ...manifest, sourceCommit: "other" }, source, read),
    /source/,
  );
});
test("asset verifier independently rejects tampered manifest and binary pairs", () => {
  const tampered = {
    ...manifest,
    assets: manifest.assets.map((asset) => ({ ...asset })),
  };
  tampered.assets[0].sha256 = "0".repeat(64);
  assert.throws(() => verifyAssets(tampered, source, read));
});
test("seven binaries match independently decoded historical assets", () => {
  verifyAssets(manifest, source, read);
});
