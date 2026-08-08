// covers: file:packages/framework/core/tools/amadeus-plugin-compose.ts
// size: small
//
// U7 conformance-suite — ADOPTED test for upstream t188 #9 ("fragments land in
// step order"). Amadeus's fragment model is structured manifest entries
// ({ file, anchor, id, text }), not upstream's `## fragment:` body blocks, so the
// Amadeus analog is: multiple fragments declared for one host file splice at
// their declared anchors in host order, each wrapped with its end-marker, and the
// rebuild is deterministic (amadeus-plugin-compose.ts rebuildFragmentFile / the
// "insertion order is the contract" comment). Pure in-process (in-memory host +
// descriptor) — no fs — hence `// size: small`.

import { describe, expect, test } from "bun:test";
import {
  emptyComposition,
  type HostSnapshot,
  type PluginDescriptor,
  type PluginManifest,
  planPluginComposition,
  type ValidPlugin,
} from "../../packages/framework/core/tools/amadeus-plugin-compose.ts";

// A host SKILL.md carrying two DISTINCT anchors in a known order (ONE before TWO).
function hostWithTwoAnchors(): HostSnapshot {
  const skill = Buffer.from("# SKILL\n<!-- ANCHOR-ONE -->\nmiddle\n<!-- ANCHOR-TWO -->\ntail\n", "utf-8");
  return {
    stages: new Map(),
    paths: new Set(["SKILL.md"]),
    files: new Map([["SKILL.md", skill]]),
    composition: emptyComposition(),
  };
}

// A plugin declaring two fragments into SKILL.md — first ALPHA at ANCHOR-ONE,
// then BETA at ANCHOR-TWO.
function twoFragmentPlugin(): ValidPlugin {
  const manifest: PluginManifest = {
    name: "frag-order",
    stages: [],
    seams: [],
    fragments: [
      { file: "SKILL.md", anchor: "<!-- ANCHOR-ONE -->", id: "alpha", text: "ALPHA-BODY" },
      { file: "SKILL.md", anchor: "<!-- ANCHOR-TWO -->", id: "beta", text: "BETA-BODY" },
    ],
    tools: [],
  };
  const descriptor: PluginDescriptor = { name: "frag-order", manifestBytes: Buffer.from(JSON.stringify(manifest)), manifest, parseErrors: [] };
  return descriptor as ValidPlugin;
}

describe("t337 fragment splice order (upstream t188 #9 analog)", () => {
  test("multiple fragments splice at their declared anchors in host order, each marked, deterministically (upstream t188 #9)", () => {
    const plan = planPluginComposition(twoFragmentPlugin(), hostWithTwoAnchors());
    const skill = plan.sharedWrites.find((w) => w.path === "SKILL.md");
    expect(skill).toBeDefined();
    const body = skill!.bytes.toString("utf-8");

    // Both fragment bodies landed, each followed by its end-marker.
    expect(body).toContain("ALPHA-BODY\n<!-- amadeus:plugin-fragment:alpha -->");
    expect(body).toContain("BETA-BODY\n<!-- amadeus:plugin-fragment:beta -->");

    // Order: the anchor that comes first in the host body (ANCHOR-ONE → ALPHA)
    // splices before the one that comes later (ANCHOR-TWO → BETA).
    expect(body.indexOf("ALPHA-BODY")).toBeLessThan(body.indexOf("BETA-BODY"));
    // The host's own separators are preserved around the splices.
    expect(body.indexOf("ALPHA-BODY")).toBeLessThan(body.indexOf("middle"));
    expect(body.indexOf("middle")).toBeLessThan(body.indexOf("BETA-BODY"));

    // Deterministic: rebuilding the same plan is byte-identical.
    const again = planPluginComposition(twoFragmentPlugin(), hostWithTwoAnchors());
    const skill2 = again.sharedWrites.find((w) => w.path === "SKILL.md")!;
    expect(skill2.bytes.equals(skill!.bytes)).toBe(true);
  });

  // Issue #2580 regression pin. rebuildFragmentFile spliced a fragment's body
  // via `text.replace(f.anchor, block)` — a TEMPLATE replacement string. The
  // search value (f.anchor) is a literal string, not a RegExp, but the
  // `$`-pattern interpretation of replace's REPLACEMENT argument still
  // applies, so a fragment author's body text containing `$1`/`$&`/`` $` ``/
  // `$'`/`$$` would have been silently mangled instead of spliced verbatim.
  // Fixed by switching the splice to a replacer function.
  test("fragment body containing $-special sequences splices verbatim (Issue #2580)", () => {
    const dollarBody = "price is $1, echo $&, prefix-$'-suffix, total $$5, trailing $";
    const manifest: PluginManifest = {
      name: "frag-dollar",
      stages: [],
      seams: [],
      fragments: [{ file: "SKILL.md", anchor: "<!-- ANCHOR-ONE -->", id: "dollar", text: dollarBody }],
      tools: [],
    };
    const descriptor: PluginDescriptor = {
      name: "frag-dollar",
      manifestBytes: Buffer.from(JSON.stringify(manifest)),
      manifest,
      parseErrors: [],
    };
    const plan = planPluginComposition(descriptor as ValidPlugin, hostWithTwoAnchors());
    const skill = plan.sharedWrites.find((w) => w.path === "SKILL.md");
    expect(skill).toBeDefined();
    const body = skill!.bytes.toString("utf-8");

    expect(body).toContain(`${dollarBody}\n<!-- amadeus:plugin-fragment:dollar -->`);
    // The host's untouched second anchor and its tail must survive unmangled —
    // a `$&`/`$'` corruption would have bled the whole-match or post-match
    // text into the splice and disturbed the rest of the file.
    expect(body).toContain("<!-- ANCHOR-TWO -->\ntail");
  });
});
