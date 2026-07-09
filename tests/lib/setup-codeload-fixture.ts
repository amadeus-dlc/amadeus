// Wraps fixture entries under a single top-level directory the way GitHub's
// codeload tarballs actually do (e.g. "amadeus-0.6.9/", tag's leading 'v'
// dropped) — U1's ExtractedPayload.locate resolves this wrapper by position,
// not by name (BR-F10). Building a *flat* fixture would test the opposite of
// the real archive shape: a false green the moment locate's wrapper-stripping
// logic regresses (infrastructure-design/cicd-pipeline.md forbids this).

import { buildTarGz, type TarFixtureEntry } from "./setup-tar-fixture.ts";

export function buildCodeloadFixture(wrapperName: string, entries: readonly TarFixtureEntry[]): Buffer {
  const wrapped = entries.map((entry): TarFixtureEntry =>
    "longName" in entry ? { ...entry, longName: `${wrapperName}/${entry.longName}` } : { ...entry, name: `${wrapperName}/${entry.name}` },
  );
  return buildTarGz(wrapped);
}
