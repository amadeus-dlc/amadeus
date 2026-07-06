#!/usr/bin/env bun

// validator の domain モジュール（v2 一本化後に残る artifact-links と ArtifactPath）の単体検証。
// 旧契約（schemaVersion 1）専用の domain モジュールとその検証は #381 で退役した。

import { artifactPath } from "../../../core/skills/amadeus-validator/validator/domain/primitives";
import {
  cleanMarkdownLinkTarget,
  resolveArtifactLinkTarget,
  tryResolveArtifactLinkTarget,
} from "../../../core/skills/amadeus-validator/validator/domain/artifact-links";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(message);
    process.exit(1);
  }
}

function assertThrows(fn: () => unknown, message: string): void {
  try {
    fn();
  } catch {
    return;
  }
  assert(false, message);
}

// ---- ArtifactPath ----

assert(artifactPath("inception/requirements-analysis/requirements.md").value === "inception/requirements-analysis/requirements.md", "ArtifactPath keeps relative path");
assert(artifactPath("  a/b.md  ").value === "a/b.md", "ArtifactPath trims whitespace");
assert(artifactPath("a\\b.md").value === "a/b.md", "ArtifactPath normalizes backslashes");
assertThrows(() => artifactPath(""), "ArtifactPath rejects blank value");
assertThrows(() => artifactPath("/tmp/state.json"), "ArtifactPath rejects absolute path");
assertThrows(() => artifactPath("C:\\tmp\\state.json"), "ArtifactPath rejects Windows absolute path");
assertThrows(() => artifactPath("a/../../b.md"), "ArtifactPath rejects path escaping artifact root");

// ---- cleanMarkdownLinkTarget ----

assert(cleanMarkdownLinkTarget("a/b.md#section") === "a/b.md", "cleanMarkdownLinkTarget drops anchor");
assert(cleanMarkdownLinkTarget('a/b.md "title"') === "a/b.md", "cleanMarkdownLinkTarget drops link title");
assert(cleanMarkdownLinkTarget("") === "", "cleanMarkdownLinkTarget keeps blank as blank");

// ---- resolveArtifactLinkTarget ----

assert(
  resolveArtifactLinkTarget("amadeus/spaces/default/knowledge/domain-map.md", "../intents/260629-minimum-purchase-flow.md").value === "amadeus/spaces/default/intents/260629-minimum-purchase-flow.md",
  "Artifact link resolves dot-relative Domain Map evidence",
);
assert(
  resolveArtifactLinkTarget("amadeus/spaces/default/knowledge/domain-map.md", "../intents/260629-minimum-purchase-flow.md").value === "amadeus/spaces/default/intents/260629-minimum-purchase-flow.md",
  "Artifact link resolves plain Domain Map evidence",
);
assert(
  resolveArtifactLinkTarget(artifactPath("construction/traceability.md"), "../inception/units-generation/units.md").value === "inception/units-generation/units.md",
  "Artifact link resolves source-relative parent path inside artifact root",
);
assertThrows(
  () => resolveArtifactLinkTarget("amadeus/spaces/default/knowledge/domain-map.md", "https://example.com/intent.md"),
  "Artifact link rejects external target",
);
assertThrows(
  () => resolveArtifactLinkTarget("amadeus/spaces/default/knowledge/domain-map.md", "../../../../../outside.md"),
  "Artifact link rejects target escaping artifact root",
);

assert(
  tryResolveArtifactLinkTarget("amadeus/spaces/default/knowledge/domain-map.md", "https://example.com/intent.md") === undefined,
  "tryResolveArtifactLinkTarget returns undefined for invalid target",
);
assert(
  tryResolveArtifactLinkTarget("amadeus/spaces/default/knowledge/domain-map.md", "../intents/a.md")?.value === "amadeus/spaces/default/intents/a.md",
  "tryResolveArtifactLinkTarget resolves valid target",
);

console.log("amadeus validator domain eval: ok");
