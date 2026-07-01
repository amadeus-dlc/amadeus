import { type EvidenceKind } from "./evidence-kind";
import { type EvidencePolicyEvaluation } from "./evidence-policy-evaluation";
import { type EvidencePolicyName } from "./evidence-policy-name";
import { type EvidencePolicyPhase } from "./evidence-policy-phase";
import { type FunctionalDesignEvidenceStatus } from "./functional-design-evidence-status";

type EvaluateEvidencePolicyInput = {
  policyName: EvidencePolicyName;
  currentIntentRoot: string;
  targets: string[];
  evidencePhases: EvidencePolicyPhase[];
  functionalDesignStatus: (target: string) => FunctionalDesignEvidenceStatus;
};

export const evidencePolicyAllowedKindsByPhase = {
  "domain-map-adoption": {
    inception: ["inception-decision"],
    construction: ["construction-decision", "functional-design", "construction-traceability"],
  },
  "context-map-dependency": {
    inception: ["inception-decision", "inception-traceability"],
    construction: ["construction-decision", "functional-design", "construction-traceability"],
  },
} as const satisfies Record<EvidencePolicyName, Record<EvidencePolicyPhase, readonly EvidenceKind[]>>;

export function currentIntentEvidenceTargets(targets: string[], currentIntentRoot: string): string[] {
  return targets.filter((target) => isCurrentIntentTarget(target, currentIntentRoot));
}

export function evaluateEvidencePolicy(input: EvaluateEvidencePolicyInput): EvidencePolicyEvaluation {
  const allowedKinds = new Set(input.evidencePhases.flatMap((phase) => evidencePolicyAllowedKindsByPhase[input.policyName][phase]));
  const candidates = input.targets
    .map((target) => ({ target, kind: evidenceKindForTarget(target, input.currentIntentRoot) }))
    .filter((candidate): candidate is { target: string; kind: EvidenceKind } => candidate.kind !== undefined && allowedKinds.has(candidate.kind));

  const accepted = candidates.find((candidate) => candidate.kind !== "functional-design" || input.functionalDesignStatus(candidate.target) === "passed");
  if (accepted) return { result: "accepted", target: accepted.target, kind: accepted.kind };

  const rejectedFunctionalDesign = candidates.find((candidate): candidate is { target: string; kind: "functional-design" } => candidate.kind === "functional-design");
  if (rejectedFunctionalDesign) {
    return {
      result: "rejected_functional_design",
      target: rejectedFunctionalDesign.target,
      kind: "functional-design",
    };
  }

  return { result: "rejected", targets: input.targets };
}

function isCurrentIntentTarget(target: string, currentIntentRoot: string): boolean {
  return target === `${currentIntentRoot}.md` || target.startsWith(`${currentIntentRoot}/`);
}

function evidenceKindForTarget(target: string, currentIntentRoot: string): EvidenceKind | undefined {
  if (!isCurrentIntentTarget(target, currentIntentRoot)) return undefined;
  if (matchesDecision(target, `${currentIntentRoot}/inception/decisions/`)) return "inception-decision";
  if (target === `${currentIntentRoot}/inception/traceability.md`) return "inception-traceability";
  if (matchesDecision(target, `${currentIntentRoot}/construction/decisions/`)) return "construction-decision";
  if (target.match(new RegExp(`^${escapeRegExp(currentIntentRoot)}/construction/[^/]+/functional-design/[^/]+\\.md$`))) return "functional-design";
  if (target === `${currentIntentRoot}/construction/traceability.md`) return "construction-traceability";
  return undefined;
}

function matchesDecision(target: string, directory: string): boolean {
  if (!target.startsWith(directory)) return false;
  const fileName = target.slice(directory.length);
  return /^D\d{3}-[^/]+\.md$/.test(fileName);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
