#!/usr/bin/env bun

import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { domainPlacementContract } from "../../../amadeus-contracts/catalog";

const root = resolve(import.meta.dir, "../../..");
const legacyIntentDomainPattern = `${domainPlacementContract.legacyIntentDomainSegments.join("/")}/**`;

type Contract = {
  skillText: string[];
  files: Record<string, string[]>;
  absentFiles?: string[];
  textExcludes?: Record<string, string[]>;
};

type TextContract = {
  path: string;
  includes: string[];
  excludes: string[];
  promotedPath?: string;
};

const targetSkills: Record<string, Contract> = {
  amadeus: {
    skillText: ["amadeus-orchestrate.ts next", "report --stage", "engine-bridge.md"],
    files: {
      "references/question-rendering.md": [],
    },
    absentFiles: ["templates/intents/state.json"],
    textExcludes: {},
  },
};

const textContracts: TextContract[] = [
  {
    path: "README.ja.md",
    includes: [
      "対象 Intent の `domain-notes.md`、`aidlc/spaces/<space>/knowledge/domain-map.md`、`aidlc/spaces/<space>/knowledge/context-map.md`、`inception/traceability.md`、Construction の Functional Design",
    ],
    excludes: [
      "対象 Intent の `domain-notes.md`、`domain/**`、`traceability.md`",
      `対象 Intent の \`domain-notes.md\`、\`${legacyIntentDomainPattern}\``,
    ],
  },
  {
    path: "skills/amadeus-domain-modeling/SKILL.md",
    promotedPath: ".agents/skills/amadeus-domain-modeling/SKILL.md",
    includes: [
      "aidlc/spaces/<space>/knowledge/domain-map.md",
      "aidlc/spaces/<space>/knowledge/context-map.md",
      "Construction Functional Design",
      "inception/traceability.md",
      "inception/decisions.md",
    ],
    excludes: [
      ".amadeus/domain",
      ".amadeus/domain/**",
      ".amadeus/intents/<intent-id>-<slug>/domain/**",
      `.amadeus/intents/<intent-id>-<slug>/${legacyIntentDomainPattern}`,
      ".amadeus/intents/<intent-id>-<slug>/traceability.md",
      ".amadeus/intents/<intent-id>-<slug>/decisions.md",
    ],
  },
  {
    path: "skills/amadeus-validator/SKILL.md",
    promotedPath: ".agents/skills/amadeus-validator/SKILL.md",
    includes: [
      "## Validation Results and Learning Candidates",
      "The validator's result is structural detection.",
      "The validator's `pass` is not content approval.",
      "Do not decide decision review's question necessity or adoption decisions from the validator's result alone.",
      "The engine sensors' result is deterministic quality checking fired at gates (recorded as `SENSOR_FIRED`); keep it separate from the validator's judgment.",
      "`current_phase_update_required`",
      "`upstream_feedback_required`",
      "`steering_knowledge_candidate`",
      "`domain_map_candidate`",
      "`context_map_candidate`",
      "`follow_up_intent_candidate`",
      "`no_learning_action`",
    ],
    excludes: [],
  },
];

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function run(command: string[]): string {
  return runInCwd(command, root);
}

function runInCwd(command: string[], cwd: string): string {
  const result = Bun.spawnSync(command, { cwd, stdout: "pipe", stderr: "pipe" });
  const stdout = new TextDecoder().decode(result.stdout);
  const stderr = new TextDecoder().decode(result.stderr);
  if (result.exitCode !== 0) {
    fail(["command failed: " + command.join(" "), "stdout:", stdout, "stderr:", stderr].join("\n"));
  }
  return stdout;
}

function runExpectFailure(command: string[], cwd: string, expected: string): void {
  const result = Bun.spawnSync(command, { cwd, stdout: "pipe", stderr: "pipe" });
  const stdout = new TextDecoder().decode(result.stdout);
  const stderr = new TextDecoder().decode(result.stderr);
  if (result.exitCode === 0) {
    fail(["command unexpectedly succeeded: " + command.join(" "), "stdout:", stdout, "stderr:", stderr].join("\n"));
  }
  const output = `${stdout}\n${stderr}`;
  if (!output.includes(expected)) {
    fail([
      `command failed without expected output: ${expected}`,
      "command: " + command.join(" "),
      "stdout:",
      stdout,
      "stderr:",
      stderr,
    ].join("\n"));
  }
}

function assertFile(path: string): void {
  if (!existsSync(path)) fail(`missing file: ${path}`);
}

function assertFileMissing(path: string): void {
  if (existsSync(path)) fail(`unexpected file: ${path}`);
}

function assertTextIncludes(path: string, needle: string): void {
  const text = readFileSync(path, "utf8");
  if (!text.includes(needle)) fail(`${path} does not include ${JSON.stringify(needle)}`);
}

function assertTextExcludes(path: string, needle: string): void {
  const text = readFileSync(path, "utf8");
  if (text.includes(needle)) fail(`${path} unexpectedly includes ${JSON.stringify(needle)}`);
}

function assertHeading(path: string, heading: string): void {
  const text = readFileSync(path, "utf8");
  if (!new RegExp(`^## ${escapeRegExp(heading)}$`, "m").test(text)) {
    fail(`${path} is missing heading: ## ${heading}`);
  }
}

function assertJsonTemplate(path: string): void {
  try {
    JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    fail(`${path} is not valid JSON: ${(error as Error).message}`);
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}


for (const [skill, contract] of Object.entries(targetSkills)) {
  const skillMd = join(root, "skills", skill, "SKILL.md");
  assertFile(skillMd);
  for (const needle of contract.skillText) assertTextIncludes(skillMd, needle);

  for (const [relative, headings] of Object.entries(contract.files)) {
    const source = join(root, "skills", skill, relative);
    const promoted = join(root, ".agents/skills", skill, relative);
    assertFile(source);
    assertFile(promoted);
    for (const heading of headings) assertHeading(source, heading);
    if (source.endsWith(".json")) assertJsonTemplate(source);
  }

  for (const relative of contract.absentFiles ?? []) {
    assertFileMissing(join(root, "skills", skill, relative));
    assertFileMissing(join(root, ".agents/skills", skill, relative));
  }

  for (const [relative, needles] of Object.entries(contract.textExcludes ?? {})) {
    const source = join(root, "skills", skill, relative);
    const promoted = join(root, ".agents/skills", skill, relative);
    assertFile(source);
    assertFile(promoted);
    for (const needle of needles) {
      assertTextExcludes(source, needle);
      assertTextExcludes(promoted, needle);
    }
  }
}

for (const contract of textContracts) {
  const source = join(root, contract.path);
  assertFile(source);
  for (const needle of contract.includes) assertTextIncludes(source, needle);
  for (const needle of contract.excludes) assertTextExcludes(source, needle);

  if (contract.promotedPath) {
    const promoted = join(root, contract.promotedPath);
    assertFile(promoted);
    for (const needle of contract.includes) assertTextIncludes(promoted, needle);
    for (const needle of contract.excludes) assertTextExcludes(promoted, needle);
  }
}

const tmp = mkdtempSync(join(tmpdir(), "amadeus-template-promotion"));
const agentsRoot = join(tmp, ".agents/skills");
for (const skill of Object.keys(targetSkills)) {
  run(["bun", "run", "dev-scripts/promote-skill.ts", skill, "--agents-root", agentsRoot]);
  run(["diff", "-qr", `skills/${skill}/templates`, join(agentsRoot, skill, "templates")]);
}

console.log("amadeus template eval: ok");
