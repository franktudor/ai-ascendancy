import assert from "node:assert/strict";
import { createHash } from "node:crypto";
export interface AssetManifest {
  sourceCommit: string;
  sourceSha256: string;
  assets: { path: string; bytes: number; sha256: string }[];
}
export function assertHistoricalAssetsPreserved(
  assetManifest: AssetManifest,
  historicalHtmlBytes: Buffer,
  readAssetBytes: (assetPath: string) => Buffer,
): void {
  const computeSha256Hex = (assetBytes: Buffer) =>
    createHash("sha256").update(assetBytes).digest("hex");
  assert.equal(
    assetManifest.sourceCommit,
    "72c1ba903f96a4ea44f725605b68d67feb19fd93",
    "pinned source commit",
  );
  assert.equal(
    computeSha256Hex(historicalHtmlBytes),
    "22e351c742063f57fe9ff4553ac57f105d179ba9d10d692630668179304fe96e",
    "pinned source SHA",
  );
  assert.equal(
    assetManifest.sourceSha256,
    computeSha256Hex(historicalHtmlBytes),
    "manifest source SHA",
  );
  assert.equal(assetManifest.assets.length, 7, "exactly seven assets");
  assert.equal(
    new Set(assetManifest.assets.map((assetEntry) => assetEntry.path)).size,
    7,
    "seven unique asset paths",
  );
  const historicalHtml = historicalHtmlBytes.toString("utf8");
  const historicalFontMatches = [
    ...historicalHtml.matchAll(/data:font\/woff2;base64,([A-Za-z0-9+/=]+)/g),
  ];
  assert.equal(
    historicalFontMatches.length,
    5,
    "five independently decoded fonts",
  );
  const historicalAssetBytesByPath = new Map<string, Buffer>(
    historicalFontMatches.map((encodedAssetMatch, fontIndex) => [
      `src/assets/fonts/plex-${fontIndex + 1}.woff2`,
      Buffer.from(encodedAssetMatch[1], "base64"),
    ]),
  );
  for (const [audioSourceConstant, audioFilename] of [
    ["INTRO_SRC", "intro"],
    ["MUSIC_SRC", "theme"],
  ] as const) {
    const encodedAssetMatch = historicalHtml.match(
      new RegExp(
        `const ${audioSourceConstant}='data:audio/mpeg;base64,([A-Za-z0-9+/=]+)'`,
      ),
    );
    assert.ok(encodedAssetMatch, `historical ${audioSourceConstant}`);
    historicalAssetBytesByPath.set(
      `src/assets/music/${audioFilename}.mp3`,
      Buffer.from(encodedAssetMatch[1], "base64"),
    );
  }
  assert.deepEqual(
    assetManifest.assets.map((assetEntry) => assetEntry.path).sort(),
    [...historicalAssetBytesByPath.keys()].sort(),
  );
  for (const assetEntry of assetManifest.assets) {
    const historicalAssetBytes = historicalAssetBytesByPath.get(
      assetEntry.path,
    );
    assert.ok(historicalAssetBytes);
    const assetBytes = readAssetBytes(assetEntry.path);
    assert.equal(
      assetEntry.bytes,
      historicalAssetBytes.length,
      assetEntry.path,
    );
    assert.equal(
      assetEntry.sha256,
      computeSha256Hex(historicalAssetBytes),
      assetEntry.path,
    );
    assert.deepEqual(
      assetBytes,
      historicalAssetBytes,
      `decoded source bytes: ${assetEntry.path}`,
    );
  }
}
