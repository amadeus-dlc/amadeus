// Pi Coding Agent distribution row.
//
// The manifest is the authored catalog for the .pi tree. Pi itself natively
// discovers project skills and extensions only after its project-trust gate;
// Amadeus never writes Pi's trust store or auto-approves that decision.

import type { HarnessManifest } from "../../../../scripts/manifest-types.ts";
import { mirrorCoreSkillDirectory } from "../projections.ts";
import { PI_MODEL_PINS } from "./drivers/amadeus-pi-driver-contract.ts";
import onboardingFills from "./onboarding.fills.ts";

const manifest: HarnessManifest = {
  name: "pi",
  mirrorSurface: "pi",
  harnessDir: ".pi",
  stageEntry: { kind: "runner", root: ".pi/skills" },
  nativeRuntime: {
    package: "@earendil-works/pi-coding-agent",
    minimumVersion: "0.83.0",
    projectTrust: "native",
    trustIsSandbox: false,
    autoApproveProjectTrust: false,
    mutateTrustStore: false,
  },
  resources: [
    {
      kind: "skill",
      source: "skills/amadeus/SKILL.md",
      destination: ".pi/skills/amadeus/SKILL.md",
      load: "native",
    },
    {
      kind: "question-annex",
      source: "skills/amadeus/question-rendering.md",
      destination: ".pi/skills/amadeus/question-rendering.md",
      load: "annex",
    },
    {
      kind: "extension",
      source: "extensions/amadeus-pi-extension.ts",
      destination: ".pi/extensions/amadeus.ts",
      load: "native",
    },
    {
      kind: "extension",
      source: "extensions/subagent.ts",
      destination: ".pi/extensions/subagent.ts",
      load: "native",
    },
    {
      kind: "driver",
      source: "drivers/amadeus-pi-driver.ts",
      destination: ".pi/drivers/amadeus-pi-driver.ts",
      load: "internal",
    },
    {
      kind: "driver",
      source: "drivers/amadeus-pi-driver-contract.ts",
      destination: ".pi/drivers/amadeus-pi-driver-contract.ts",
      load: "internal",
    },
    {
      kind: "driver",
      source: "drivers/amadeus-pi-guardian.ts",
      destination: ".pi/drivers/amadeus-pi-guardian.ts",
      load: "internal",
    },
    {
      kind: "driver",
      source: "drivers/amadeus-pi-replay-store.ts",
      destination: ".pi/drivers/amadeus-pi-replay-store.ts",
      load: "internal",
    },
  ],
  coreDirs: [
    { src: "tools", dst: "tools" },
    { src: "otel", dst: "otel" },
    { src: "vendor", dst: "vendor" },
    { src: "amadeus-common", dst: "amadeus-common" },
    { src: "knowledge", dst: "knowledge" },
    { src: "sensors", dst: "sensors" },
    { src: "scopes", dst: "scopes" },
    { src: "agents", dst: "agents" },
    { src: "hooks", dst: "hooks" },
    { src: "skills/amadeus-session-cost", dst: "skills/amadeus-session-cost" },
    { src: "skills/amadeus-replay", dst: "skills/amadeus-replay" },
    { src: "skills/amadeus-outcomes-pack", dst: "skills/amadeus-outcomes-pack" },
    { src: "skills/amadeus-grilling", dst: "skills/amadeus-grilling" },
    mirrorCoreSkillDirectory("pi"),
    { src: "skills/amadeus-election", dst: "skills/amadeus-election" },
    { src: "skills/amadeus-plugin", dst: "skills/amadeus-plugin" },
  ],
  harnessFiles: [
    // Project-local Pi lifecycle state is machine-local. Install the shared
    // workspace ignore contract beside .pi/ so a healthy session stays clean.
    { src: "dot-gitignore", dst: ".gitignore", projectRoot: true },
  ],
  // Pi grants a delegated agent every tool unless its frontmatter narrows the
  // set, and it does not read the charter's `disallowedTools`. The reviewer
  // must run read-only (stage-protocol.md §12a), so its allowlist is projected
  // explicitly; without this line a Pi-resolved reviewer could write and shell.
  frontmatterAdditions: [
    { file: "agents/amadeus-architecture-reviewer-agent.md", lines: ["tools: read, grep, find, ls"] },
  ],
  // Pi resolves concrete model ids, not Claude's tier aliases. Projecting the
  // pin keeps a persona on its charter's model under Pi's native agent
  // resolution, exactly as the child driver does at dispatch.
  modelPins: PI_MODEL_PINS,
  onboarding: { dst: "AGENTS.md", projectRoot: true, fills: onboardingFills },
  rulesRename: null,
  authoredExempt: [],
  emit: null,
};

export default manifest;
