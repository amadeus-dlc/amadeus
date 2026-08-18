// covers: packages/framework/core/tools/amadeus-sensor-upstream-coverage.ts
// size: medium
//
// t3181 — the citation obligation (#3181 FR-EVD-7) and its falling proof
// (FR-EVD-8), driven through the REAL dispatcher and the REAL shipped
// upstream-coverage manifest.
//
// Declaring `issue-evidence` in requirements-analysis' consumes: is not a
// decoration — it puts the artefact under the sensor that verifies the output
// prose actually references its upstream inputs. This file measures that
// obligation from both sides:
//
//   RED    a requirements.md that never names the evidence, with the evidence
//          present on disk, must FAIL. Written first, measured failing, before
//          the citation exists.
//   GREEN  the same document with the citation must PASS.
//   QUIET  with no evidence file, the same uncited document must still PASS —
//          the dispatcher threads only consumes whose artefact EXISTS, so a
//          non-issue-first intent is never asked to cite a file it never had.
//
// The failing fixture lives in a throwaway project, so the proof leaves no
// residue in the repository: every temp dir is removed in afterAll.

import { afterAll, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BUN = process.execPath;
const SENSOR_TS = join(
  import.meta.dir,
  "..",
  "..",
  "dist",
  "claude",
  ".claude",
  "tools",
  "amadeus-sensor.ts",
);
const RECORD = "t3181-evidence-0000abcd";

const tempDirs: string[] = [];
afterAll(() => {
  for (const dir of tempDirs) rmSync(dir, { recursive: true, force: true });
});

function recordRoot(proj: string): string {
  return join(proj, "amadeus", "spaces", "default", "intents", RECORD);
}

const UNCITED = [
  "# Requirements",
  "",
  "## Intent analysis",
  "",
  "The user wants the inception fixed cost removed.",
  "",
  "## Functional requirements",
  "",
  "- FR-1: the thing works.",
  "",
].join("\n");

const CITED = UNCITED.replace(
  "The user wants the inception fixed cost removed.",
  "The user wants the inception fixed cost removed. Established facts are quoted from issue-evidence rather than re-derived.",
);

/** A project whose record holds requirements.md, plus the evidence file when
 *  `withEvidence` — no other upstream artefact exists, so the only consume the
 *  dispatcher can thread is the one under test. */
function makeProject(requirements: string, withEvidence: boolean): string {
  const proj = mkdtempSync(join(tmpdir(), "amadeus-t3181-"));
  tempDirs.push(proj);
  const rec = recordRoot(proj);
  mkdirSync(join(rec, "audit"), { recursive: true });
  writeFileSync(join(rec, "amadeus-state.md"), "# AI-DLC State Tracking\n", "utf-8");

  const intents = join(proj, "amadeus", "spaces", "default", "intents");
  writeFileSync(
    join(intents, "intents.json"),
    `${JSON.stringify(
      [
        {
          uuid: "33333333-3333-4333-8333-333333333333",
          slug: "t3181-evidence",
          dirName: RECORD,
          status: "in-flight",
        },
      ],
      null,
      2,
    )}\n`,
    "utf-8",
  );
  writeFileSync(join(intents, "active-intent"), `${RECORD}\n`, "utf-8");

  const raDir = join(rec, "inception", "requirements-analysis");
  mkdirSync(raDir, { recursive: true });
  writeFileSync(join(raDir, "requirements.md"), requirements, "utf-8");

  const captureDir = join(rec, "ideation", "intent-capture");
  mkdirSync(captureDir, { recursive: true });
  if (withEvidence) {
    writeFileSync(join(captureDir, "issue-evidence.md"), "# Issue Evidence — t\n", "utf-8");
  }
  return proj;
}

type FireResult = Readonly<{ verdicts: string[]; details: string }>;

function fireUpstreamCoverage(proj: string): FireResult {
  const outputPath = join(
    recordRoot(proj),
    "inception",
    "requirements-analysis",
    "requirements.md",
  );
  const res = spawnSync(
    BUN,
    [
      SENSOR_TS,
      "fire",
      "upstream-coverage",
      "--stage",
      "requirements-analysis",
      "--output-path",
      outputPath,
    ],
    { encoding: "utf-8", env: { ...process.env, CLAUDE_PROJECT_DIR: proj } },
  );
  if (res.status !== 0) {
    throw new Error(`sensor fire exited ${res.status}: ${res.stderr}`);
  }

  const auditDir = join(recordRoot(proj), "audit");
  const verdicts = readdirSync(auditDir)
    .filter((name) => name.endsWith(".jsonl"))
    .flatMap((name) => readFileSync(join(auditDir, name), "utf-8").split("\n"))
    .filter((line) => line.startsWith("{"))
    .map((line) => JSON.parse(line) as { eventName?: string })
    .map((row) => row.eventName ?? "")
    .filter((name) => name === "amadeus.sensor.passed" || name === "amadeus.sensor.failed");

  const detailDir = join(recordRoot(proj), ".amadeus-sensors", "requirements-analysis");
  const details = existsSync(detailDir)
    ? readdirSync(detailDir)
        .map((name) => readFileSync(join(detailDir, name), "utf-8"))
        .join("\n")
    : "";
  return { verdicts, details };
}

describe("t3181 upstream-coverage now covers issue-evidence (FR-EVD-7)", () => {
  test("FAILS when the evidence exists and requirements.md never cites it", () => {
    const result = fireUpstreamCoverage(makeProject(UNCITED, true));
    expect(result.verdicts).toEqual(["amadeus.sensor.failed"]);
    expect(result.details).toContain("issue-evidence");
  });

  test("PASSES once the citation is there", () => {
    const result = fireUpstreamCoverage(makeProject(CITED, true));
    expect(result.verdicts).toEqual(["amadeus.sensor.passed"]);
  });

  test("stays quiet for an intent that has no evidence file", () => {
    const result = fireUpstreamCoverage(makeProject(UNCITED, false));
    expect(result.verdicts).toEqual(["amadeus.sensor.passed"]);
  });

  test("returns to PASSED once the evidence file is removed", () => {
    // The same document, the same stage: only the artefact's presence moves, so
    // the verdict difference is attributable to the new consume and nothing else.
    const proj = makeProject(UNCITED, true);
    expect(fireUpstreamCoverage(proj).verdicts).toEqual(["amadeus.sensor.failed"]);

    unlinkSync(join(recordRoot(proj), "ideation", "intent-capture", "issue-evidence.md"));
    const after = fireUpstreamCoverage(proj);
    expect(after.verdicts).toEqual(["amadeus.sensor.failed", "amadeus.sensor.passed"]);
  });
});
