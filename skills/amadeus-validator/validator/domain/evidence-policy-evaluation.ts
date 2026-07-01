import { type EvidenceKind } from "./evidence-kind";

export type EvidencePolicyEvaluation =
  | { result: "accepted"; target: string; kind: EvidenceKind }
  | { result: "rejected_functional_design"; target: string; kind: "functional-design" }
  | { result: "rejected"; targets: string[] };
