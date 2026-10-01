import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { assertHistoricalAssetsPreserved } from "./helpers/assets";
import type { AssetManifest } from "./helpers/assets";
const assetManifest = JSON.parse(
  readFileSync(new URL("../docs/preservation.json", import.meta.url), "utf8"),
) as AssetManifest;
const historicalHtmlBytes = execFileSync(
  "git",
  ["show", "72c1ba9:index.html"],
  {
    maxBuffer: 10_000_000,
  },
);
const readAssetBytes = (assetPath: string) =>
  readFileSync(new URL("../" + assetPath, import.meta.url));

test("asset verifier rejects an empty inventory", () => {
  assert.throws(
    () =>
      assertHistoricalAssetsPreserved(
        { ...assetManifest, assets: [] },
        historicalHtmlBytes,
        readAssetBytes,
      ),
    /seven/,
  );
});
test("asset verifier rejects duplicate inventory entries", () => {
  assert.throws(
    () =>
      assertHistoricalAssetsPreserved(
        {
          ...assetManifest,
          assets: assetManifest.assets.map(() => assetManifest.assets[0]),
        },
        historicalHtmlBytes,
        readAssetBytes,
      ),
    /unique/,
  );
});
test("asset verifier rejects altered historical source identity", () => {
  assert.throws(
    () =>
      assertHistoricalAssetsPreserved(
        { ...assetManifest, sourceSha256: "0".repeat(64) },
        historicalHtmlBytes,
        readAssetBytes,
      ),
    /source/,
  );
  assert.throws(
    () =>
      assertHistoricalAssetsPreserved(
        { ...assetManifest, sourceCommit: "other" },
        historicalHtmlBytes,
        readAssetBytes,
      ),
    /source/,
  );
});
test("asset verifier independently rejects tampered manifest and binary pairs", () => {
  const tamperedAssetManifest = {
    ...assetManifest,
    assets: assetManifest.assets.map((assetEntry) => ({ ...assetEntry })),
  };
  tamperedAssetManifest.assets[0].sha256 = "0".repeat(64);
  assert.throws(() =>
    assertHistoricalAssetsPreserved(
      tamperedAssetManifest,
      historicalHtmlBytes,
      readAssetBytes,
    ),
  );
});
test("seven binaries match independently decoded historical assets", () => {
  assertHistoricalAssetsPreserved(
    assetManifest,
    historicalHtmlBytes,
    readAssetBytes,
  );
});
