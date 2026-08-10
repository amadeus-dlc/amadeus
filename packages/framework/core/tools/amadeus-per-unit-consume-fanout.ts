import { posix } from "node:path";

export interface PerUnitConsumeGraphStage {
  readonly slug: string;
  readonly for_each?: string;
  readonly produces: readonly string[];
  readonly optional_produces?: readonly string[];
  readonly consumes: readonly {
    readonly artifact: string;
    readonly required: boolean;
  }[];
}

export interface PerUnitConsumeOutcome {
  readonly unit: string;
  readonly outcome: string;
}

export interface PerUnitConsumeTemplate {
  readonly artifact: string;
  readonly path: string;
}

export interface PerUnitConsumeFanoutInput {
  readonly graph: readonly PerUnitConsumeGraphStage[];
  readonly declaredUnits: readonly string[];
  readonly outcomes: readonly PerUnitConsumeOutcome[];
  readonly templates: readonly PerUnitConsumeTemplate[];
  readonly validateInventory?: boolean;
}

export interface ConcretePerUnitConsume {
  readonly unit: string;
  readonly artifact: string;
  readonly path: string;
}

export type PerUnitConsumeFanoutErrorCode =
  | "declared-unit-population-empty"
  | "succeeded-producer-population-empty"
  | "consumer-edge-inventory-mismatch"
  | "consume-presence-read-failed"
  | "producer-outcome-failed"
  | "producer-outcome-pending"
  | "producer-outcome-unknown"
  | "producer-outcome-ambiguous"
  | "unresolved-unit-placeholder";

export class PerUnitConsumeFanoutError extends Error {
  readonly code: PerUnitConsumeFanoutErrorCode;
  readonly units: readonly string[];
  readonly expectedConsumers?: readonly string[];
  readonly actualConsumers?: readonly string[];
  readonly expectedEdges?: readonly string[];
  readonly actualEdges?: readonly string[];

  constructor(
    code: PerUnitConsumeFanoutErrorCode,
    units: readonly string[],
    inventory?: {
      readonly expectedConsumers: readonly string[];
      readonly actualConsumers: readonly string[];
      readonly expectedEdges: readonly string[];
      readonly actualEdges: readonly string[];
    },
  ) {
    super(inventory
      ? `${code}: ${JSON.stringify(inventory)}`
      : `${code}: ${units.join(", ")}`);
    this.name = "PerUnitConsumeFanoutError";
    this.code = code;
    this.units = [...units];
    this.expectedConsumers = inventory?.expectedConsumers;
    this.actualConsumers = inventory?.actualConsumers;
    this.expectedEdges = inventory?.expectedEdges;
    this.actualEdges = inventory?.actualEdges;
  }
}

const UNIT_NAME_PLACEHOLDER = "{unit-name}";

export type PerUnitConsumerEdge = readonly [
  consumer: string,
  artifact: string,
  producer: string,
];

export const EXPECTED_PER_UNIT_CONSUMER_EDGES: readonly PerUnitConsumerEdge[] = [
  ["build-and-test", "code-generation-plan", "code-generation"],
  ["build-and-test", "code-summary", "code-generation"],
  ["ci-pipeline", "code-summary", "code-generation"],
  ["performance-validation", "performance-requirements", "nfr-requirements"],
  ["performance-validation", "scalability-requirements", "nfr-requirements"],
  ["performance-validation", "performance-design", "nfr-design"],
  ["performance-validation", "scalability-design", "nfr-design"],
  ["observability-setup", "performance-design", "nfr-design"],
  ["observability-setup", "security-design", "nfr-design"],
  ["observability-setup", "reliability-design", "nfr-design"],
  ["observability-setup", "monitoring-design", "infrastructure-design"],
  ["observability-setup", "infrastructure-services", "infrastructure-design"],
  ["incident-response", "reliability-design", "nfr-design"],
  ["incident-response", "security-design", "nfr-design"],
  ["incident-response", "deployment-architecture", "infrastructure-design"],
  ["deployment-pipeline", "deployment-architecture", "infrastructure-design"],
  ["deployment-pipeline", "cicd-pipeline", "infrastructure-design"],
  ["environment-provisioning", "deployment-architecture", "infrastructure-design"],
  ["environment-provisioning", "infrastructure-services", "infrastructure-design"],
];

function producesPerUnitArtifact(
  stage: PerUnitConsumeGraphStage,
  artifact: string,
): boolean {
  return stage.for_each === "unit-of-work" &&
    (stage.produces.includes(artifact) || stage.optional_produces?.includes(artifact) === true);
}

function consumerEdges(
  graph: readonly PerUnitConsumeGraphStage[],
  consumer: PerUnitConsumeGraphStage,
): PerUnitConsumerEdge[] {
  if (consumer.for_each === "unit-of-work") return [];
  return consumer.consumes
    .filter((consume) => consume.required)
    .flatMap((consume) =>
      graph
        .filter((producer) => producesPerUnitArtifact(producer, consume.artifact))
        .map((producer) => [consumer.slug, consume.artifact, producer.slug] as const)
    );
}

export function extractPerUnitConsumerEdges(
  graph: readonly PerUnitConsumeGraphStage[],
): PerUnitConsumerEdge[] {
  return graph.flatMap((consumer) => consumerEdges(graph, consumer));
}

function sortedUnique(values: readonly string[]): string[] {
  return [...new Set(values)].sort();
}

function assertConsumerEdgeInventory(graph: readonly PerUnitConsumeGraphStage[]): void {
  const actual = extractPerUnitConsumerEdges(graph);
  const expectedEdges = sortedUnique(
    EXPECTED_PER_UNIT_CONSUMER_EDGES.map((edge) => edge.join(":")),
  );
  const actualEdges = sortedUnique(
    actual.map((edge) => edge.join(":")),
  );
  const expectedConsumers = sortedUnique(
    EXPECTED_PER_UNIT_CONSUMER_EDGES.map(([consumer]) => consumer),
  );
  const actualConsumers = sortedUnique(
    actual.map(([consumer]) => consumer),
  );
  if (
    JSON.stringify(expectedConsumers) !== JSON.stringify(actualConsumers) ||
    JSON.stringify(expectedEdges) !== JSON.stringify(actualEdges)
  ) {
    throw new PerUnitConsumeFanoutError(
      "consumer-edge-inventory-mismatch",
      [],
      { expectedConsumers, actualConsumers, expectedEdges, actualEdges },
    );
  }
}

function indexOutcomeRows(
  outcomes: readonly PerUnitConsumeOutcome[],
): Map<string, PerUnitConsumeOutcome[]> {
  const rowsByUnit = new Map<string, PerUnitConsumeOutcome[]>();
  for (const outcome of outcomes) {
    const rows = rowsByUnit.get(outcome.unit) ?? [];
    rows.push(outcome);
    rowsByUnit.set(outcome.unit, rows);
  }
  return rowsByUnit;
}

function duplicateUnits(units: readonly string[]): Set<string> {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const unit of units) {
    if (seen.has(unit)) duplicates.add(unit);
    seen.add(unit);
  }
  return duplicates;
}

function throwForUnits(
  code: PerUnitConsumeFanoutErrorCode,
  units: readonly string[],
): void {
  if (units.length > 0) throw new PerUnitConsumeFanoutError(code, units);
}

const KNOWN_OUTCOMES = new Set(["succeeded", "failed", "cancelled", "pending", "ambiguous"]);

function validateProducerPopulation(input: PerUnitConsumeFanoutInput): Set<string> {
  if (input.declaredUnits.length === 0) {
    throw new PerUnitConsumeFanoutError("declared-unit-population-empty", []);
  }
  const outcomeRows = indexOutcomeRows(input.outcomes);
  const duplicates = duplicateUnits(input.declaredUnits);
  const ambiguous = [...new Set(input.declaredUnits.filter((unit) =>
    duplicates.has(unit) ||
    (outcomeRows.get(unit)?.length ?? 0) > 1 ||
    outcomeRows.get(unit)?.[0]?.outcome === "ambiguous"
  ))];
  throwForUnits("producer-outcome-ambiguous", ambiguous);

  const declared = new Set(input.declaredUnits);
  const unknown = input.outcomes
    .filter((outcome) => !declared.has(outcome.unit) || !KNOWN_OUTCOMES.has(outcome.outcome))
    .map((outcome) => outcome.unit);
  throwForUnits("producer-outcome-unknown", unknown);
  throwForUnits(
    "producer-outcome-failed",
    input.outcomes.filter((outcome) => outcome.outcome === "failed").map((outcome) => outcome.unit),
  );

  const pending = input.declaredUnits.filter((unit) => {
    const outcome = outcomeRows.get(unit)?.[0]?.outcome;
    return outcome === undefined || outcome === "pending";
  });
  throwForUnits("producer-outcome-pending", pending);

  const succeeded = new Set(
    input.outcomes
      .filter((outcome) => outcome.outcome === "succeeded")
      .map((outcome) => outcome.unit),
  );
  if (succeeded.size === 0) {
    throw new PerUnitConsumeFanoutError("succeeded-producer-population-empty", []);
  }
  return succeeded;
}

function expandTemplates(
  declaredUnits: readonly string[],
  succeeded: ReadonlySet<string>,
  templates: readonly PerUnitConsumeTemplate[],
): ConcretePerUnitConsume[] {
  const resolved: ConcretePerUnitConsume[] = [];
  const seen = new Set<string>();
  for (const unit of declaredUnits) {
    if (!succeeded.has(unit)) continue;
    for (const template of templates) {
      const path = posix.normalize(template.path.replaceAll(UNIT_NAME_PLACEHOLDER, unit));
      if (path.includes(UNIT_NAME_PLACEHOLDER)) {
        throw new PerUnitConsumeFanoutError("unresolved-unit-placeholder", [unit]);
      }
      if (seen.has(path)) continue;
      seen.add(path);
      resolved.push({ unit, artifact: template.artifact, path });
    }
  }
  return resolved;
}

export function resolvePerUnitConsumeFanout(
  input: PerUnitConsumeFanoutInput,
): ConcretePerUnitConsume[] {
  if (input.validateInventory !== false) assertConsumerEdgeInventory(input.graph);
  return expandTemplates(
    input.declaredUnits,
    validateProducerPopulation(input),
    input.templates,
  );
}
