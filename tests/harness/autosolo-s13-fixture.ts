// Fixture seeder for the issue #1735 automatic solo §13 probes.
//
// `amadeus-learnings.ts surface` reads the state file, requires its
// `Current Stage` to equal the requested slug, and resolves the diary through
// the runtime-graph row's `memory_path`. A project seeded with memory.md alone
// fails at step 2 of the ritual, so the live probe would measure a broken setup
// rather than a missing protocol hook. This seeder writes the whole chain,
// modelled on the t99 learnings-gate fixture.
//
// It lives here rather than beside the live e2e because `--ci` runs smoke +
// unit + integration only: the integration test that proves these preconditions
// hold has to reach the same seeder the e2e uses, or the two drift apart.

import { cpSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { REPO_ROOT } from "./fixtures.ts";

export const CODEX_DIST = join(REPO_ROOT, "dist", "codex");

export const STAGE_SLUG = "functional-design";
export const PHASE = "construction";

// `<slug>-<id8>` where id8 is the uuid's trailing 16 hex digits — the same
// derivation the runtime uses to join an intents.json row to its record dir.
const INTENT_UUID = "00000000-0000-7000-8000-000000001735";
const RECORD_DIR = `s13-probe-${INTENT_UUID.replace(/-/g, "").slice(-16)}`;
const INTENTS_REL = join("amadeus", "spaces", "default", "intents");
const RECORD_REL = join(INTENTS_REL, RECORD_DIR);

export const DIARY_REL = join(RECORD_REL, PHASE, STAGE_SLUG, "memory.md");
export const ELECTIONS_REL = join("amadeus", "spaces", "default", "elections");
export const PAYLOAD_NAME = "s13-payload.json";
export const ELECTION_ID = "E-S13-PROBE";

/**
 * Seeds everything `amadeus-learnings.ts surface --slug functional-design`
 * walks: the shipped method tree, the space cursors + intent registry, the
 * state file whose Current Stage must equal the slug, the runtime-graph row
 * carrying the diary's project-relative memory_path, and the diary itself. Also
 * writes the layered config the §13 hook reads and the definition its open
 * needs.
 */
export function seedAutoSoloS13Project(proj: string): void {
  cpSync(join(CODEX_DIST, "amadeus"), join(proj, "amadeus"), { recursive: true });
  mkdirSync(join(proj, RECORD_REL, PHASE, STAGE_SLUG), { recursive: true });
  mkdirSync(join(proj, ELECTIONS_REL), { recursive: true });

  writeFileSync(join(proj, "amadeus", "active-space"), "default\n", "utf-8");
  writeFileSync(join(proj, "amadeus", ".amadeus-clone-id"), "s13probecloneid0\n", "utf-8");
  writeFileSync(join(proj, INTENTS_REL, "active-intent"), `${RECORD_DIR}\n`, "utf-8");
  writeFileSync(
    join(proj, INTENTS_REL, "intents.json"),
    `${JSON.stringify(
      [{ uuid: INTENT_UUID, slug: RECORD_DIR.replace(/-[0-9a-f]+$/, ""), status: "in-flight" }],
      null,
      2,
    )}\n`,
    "utf-8",
  );

  // surface() fails closed unless Current Stage equals the requested slug.
  writeFileSync(
    join(proj, RECORD_REL, "amadeus-state.md"),
    [
      "# AI-DLC State Tracking",
      `- **Current Stage**: ${STAGE_SLUG}`,
      "- **Scope**: feature",
      "",
    ].join("\n"),
    "utf-8",
  );

  // memory_path is project-relative: surface joins it onto the project dir.
  writeFileSync(
    join(proj, RECORD_REL, "runtime-graph.json"),
    `${JSON.stringify(
      {
        workflow_id: "s13-probe",
        scope: "feature",
        started_at: "2026-07-30T00:00:00Z",
        stages: [{ stage_slug: STAGE_SLUG, memory_path: DIARY_REL }],
      },
      null,
      2,
    )}\n`,
    "utf-8",
  );

  // One candidate for the ritual to surface — a Deviation entry.
  writeFileSync(
    join(proj, DIARY_REL),
    [
      "# Stage memory",
      "",
      "## Interpretations",
      "",
      "## Deviations",
      "",
      "- 2026-07-30T00:00:00Z — Kept the port interface in the domain module;" +
        " splitting it would have broken the adapter's import path.",
      "",
      "## Tradeoffs",
      "",
      "## Open questions",
      "",
    ].join("\n"),
    "utf-8",
  );

  // Solo auto-election is opt-in; this is the layered config the §13 hook reads.
  writeFileSync(
    join(proj, "amadeus", "config.json"),
    `${JSON.stringify({ "solo-election": { trigger: { mode: "auto" } } }, null, 2)}\n`,
    "utf-8",
  );

  // A ready-made definition so a live turn is not spent authoring a store
  // schema. Deliberately named and described without election vocabulary: what
  // the live probe tests is whether the protocol routes the selection to an
  // election at all, not whether the model can compose the store's JSON.
  writeFileSync(
    join(proj, PAYLOAD_NAME),
    `${JSON.stringify(
      {
        schemaVersion: 2,
        electionId: ELECTION_ID,
        kind: "zero-confirm",
        questions: [
          {
            questionId: "q-s13",
            text: "この学習候補を採用してよいか",
            choices: [{ internalNo: 1, label: "採用" }],
          },
        ],
        voters: ["subagent-1", "subagent-2"],
      },
      null,
      2,
    )}\n`,
    "utf-8",
  );
}
