#!/usr/bin/env bun

import {
  MIRROR_USER_CONTRACT,
  mirrorContractCommandUsage,
  renderMirrorLegacyHelp,
  renderMirrorLifecycleHelp,
} from "../packages/framework/core/tools/amadeus-mirror-presentation.ts";
import {
  MIRROR_CORE_PROJECTIONS,
  MIRROR_DOC_PROJECTIONS,
} from "../packages/framework/harness/projections.ts";
import { DistributionTransactionCoordinator } from "./distribution-transaction.ts";

const TOPICS = [
  "modes",
  "precedence",
  "boundaries",
  "completion",
  "failure",
  "safety",
  "cli",
  "scope",
] as const;

const commands = [
  ...MIRROR_USER_CONTRACT.boundaryCommands,
  ...MIRROR_USER_CONTRACT.manualCommands,
  ...MIRROR_USER_CONTRACT.repairCommands,
];

const expected: Record<(typeof TOPICS)[number], unknown> = {
  modes: {
    modes: MIRROR_USER_CONTRACT.modes,
    defaultMode: MIRROR_USER_CONTRACT.defaultMode,
    booleanCompatibility: MIRROR_USER_CONTRACT.booleanCompatibility,
  },
  precedence: { precedence: MIRROR_USER_CONTRACT.precedence },
  boundaries: { boundaries: MIRROR_USER_CONTRACT.boundaries },
  completion: { completionOrder: MIRROR_USER_CONTRACT.completionOrder },
  failure: MIRROR_USER_CONTRACT.failure,
  safety: { closeGuards: MIRROR_USER_CONTRACT.closeGuards },
  cli: {
    commands,
    selectorDefaults: MIRROR_USER_CONTRACT.selectorDefaults,
    positionalArguments: "forbidden",
  },
  scope: { scopeExclusions: MIRROR_USER_CONTRACT.scopeExclusions },
};

const FORBIDDEN_CONTRACT_CLAIMS = [
  /default(?:s| mode)?\s+(?:is|to)\s+auto/iu,
  /boolean(?:s)?\s+(?:are|is)\s+(?:accepted|supported)/iu,
  /positional arguments? (?:are|is) (?:allowed|supported)/iu,
  /background (?:polling|daemon) is enabled/iu,
] as const;

export type DocsFinding = Readonly<{
  path: string;
  message: string;
}>;

function validateDocument(path: string, text: string): DocsFinding[] {
  const findings: DocsFinding[] = [];
  const topicPattern = /<!-- amadeus-topic:([a-z-]+) -->/gu;
  const contractPattern =
    /<!-- amadeus-contract:([a-z-]+) (\{[^\r\n]*\}) -->/gu;
  const topics = [...text.matchAll(topicPattern)].map((match) => match[1]);
  const contracts = [...text.matchAll(contractPattern)];
  for (const topic of TOPICS) {
    if (topics.filter((value) => value === topic).length !== 1)
      findings.push({ path, message: `${topic}: topic marker must occur once` });
    const matches = contracts.filter((match) => match[1] === topic);
    if (matches.length !== 1) {
      findings.push({ path, message: `${topic}: contract marker must occur once` });
      continue;
    }
    try {
      if (
        JSON.stringify(JSON.parse(matches[0][2])) !==
        JSON.stringify(expected[topic])
      ) findings.push({ path, message: `${topic}: runtime contract mismatch` });
    } catch {
      findings.push({ path, message: `${topic}: invalid canonical JSON` });
    }
  }
  for (const topic of topics) {
    if (!TOPICS.includes(topic as (typeof TOPICS)[number]))
      findings.push({ path, message: `${topic}: unknown topic` });
  }
  for (const forbidden of FORBIDDEN_CONTRACT_CLAIMS) {
    if (forbidden.test(text))
      findings.push({ path, message: "forbidden contradictory contract claim" });
  }
  return findings;
}

function validateHelpContracts(): DocsFinding[] {
  const findings: DocsFinding[] = [];
  const help = renderMirrorLifecycleHelp();
  if (!help.includes(MIRROR_USER_CONTRACT.selectorDefaults.intent))
    findings.push({
      path: "amadeus-mirror-lifecycle.ts --help",
      message: "active Intent default is missing",
    });
  for (const command of commands) {
    if (!help.includes(mirrorContractCommandUsage(command)))
      findings.push({
        path: "amadeus-mirror-lifecycle.ts --help",
        message: `missing command contract: ${command.path.join(" ")}`,
      });
  }
  const legacyHelp = renderMirrorLegacyHelp();
  for (const operation of [...MIRROR_USER_CONTRACT.operations, "status"]) {
    if (!legacyHelp.includes(operation))
      findings.push({
        path: "amadeus-mirror.ts --help",
        message: `missing command: ${operation}`,
      });
  }
  return findings;
}

export function validateMirrorDocs(root: string): readonly DocsFinding[] {
  const findings: DocsFinding[] = [];
  const coordinator = new DistributionTransactionCoordinator(root);
  if (coordinator.pendingJournalCount() > 0) {
    return [{
      path: ".amadeus/distribution-transaction/journals",
      message: "distribution recovery required",
    }];
  }
  const session = coordinator.openReadSession("mirror-docs-contract");
  try {
    for (const path of MIRROR_DOC_PROJECTIONS) {
      try {
        findings.push(...validateDocument(
          path,
          session.readFile(path).toString("utf-8"),
        ));
      } catch {
        findings.push({ path, message: "document is missing" });
      }
    }
    try {
      const skill = session.readFile(MIRROR_CORE_PROJECTIONS.skill).toString("utf-8");
      for (const command of commands) {
        const usage = mirrorContractCommandUsage(command);
        if (!skill.includes(usage))
          findings.push({
            path: MIRROR_CORE_PROJECTIONS.skill,
            message: `missing command contract: ${usage}`,
          });
      }
    } catch {
      findings.push({
        path: MIRROR_CORE_PROJECTIONS.skill,
        message: "skill is missing",
      });
    }
    findings.push(...validateHelpContracts());
  } finally {
    session.close();
  }
  return findings.sort(
    (left, right) =>
      left.path.localeCompare(right.path) ||
      left.message.localeCompare(right.message),
  );
}

if (import.meta.main) {
  const findings = validateMirrorDocs(process.cwd());
  for (const finding of findings)
    console.error(`${finding.path}: ${finding.message}`);
  if (findings.length > 0) process.exit(1);
  console.log("mirror-docs-contract: OK (4 documents, 32 topics)");
}
