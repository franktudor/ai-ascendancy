import assert from "node:assert/strict";
import { createHash } from "node:crypto";
export interface AssetManifest {
  sourceCommit: string;
  sourceSha256: string;
  assets: { path: string; bytes: number; sha256: string }[];
}
export function verifyAssets(
  manifest: AssetManifest,
  source: Buffer,
  read: (path: string) => Buffer,
): void {
  const hash = (bytes: Buffer) =>
    createHash("sha256").update(bytes).digest("hex");
  assert.equal(
    manifest.sourceCommit,
    "72c1ba903f96a4ea44f725605b68d67feb19fd93",
    "pinned source commit",
  );
  assert.equal(
    hash(source),
    "22e351c742063f57fe9ff4553ac57f105d179ba9d10d692630668179304fe96e",
    "pinned source SHA",
  );
  assert.equal(manifest.sourceSha256, hash(source), "manifest source SHA");
  assert.equal(manifest.assets.length, 7, "exactly seven assets");
  assert.equal(
    new Set(manifest.assets.map((asset) => asset.path)).size,
    7,
    "seven unique asset paths",
  );
  const html = source.toString("utf8");
  const fonts = [
    ...html.matchAll(/data:font\/woff2;base64,([A-Za-z0-9+/=]+)/g),
  ];
  assert.equal(fonts.length, 5, "five independently decoded fonts");
  const expected = new Map<string, Buffer>(
    fonts.map((match, index) => [
      `src/assets/fonts/plex-${index + 1}.woff2`,
      Buffer.from(match[1], "base64"),
    ]),
  );
  for (const [constant, filename] of [
    ["INTRO_SRC", "intro"],
    ["MUSIC_SRC", "theme"],
  ] as const) {
    const match = html.match(
      new RegExp(
        `const ${constant}='data:audio/mpeg;base64,([A-Za-z0-9+/=]+)'`,
      ),
    );
    assert.ok(match, `historical ${constant}`);
    expected.set(
      `src/assets/music/${filename}.mp3`,
      Buffer.from(match[1], "base64"),
    );
  }
  assert.deepEqual(
    manifest.assets.map((asset) => asset.path).sort(),
    [...expected.keys()].sort(),
  );
  for (const asset of manifest.assets) {
    const historical = expected.get(asset.path);
    assert.ok(historical);
    const bytes = read(asset.path);
    assert.equal(asset.bytes, historical.length, asset.path);
    assert.equal(asset.sha256, hash(historical), asset.path);
    assert.deepEqual(bytes, historical, `decoded source bytes: ${asset.path}`);
  }
}
