#!/usr/bin/env bun

import {
  artifactPath,
  boundedContextId,
  documentTitle,
  type ImplementationTargetId,
  requirementId,
  tableColumnName,
  unitId,
} from "../../../skills/amadeus-validator/validator/domain/primitives";
import {
  boltIdRef,
  type IdRef,
  parseIdRefList,
  requirementIdRef,
  storyIdRef,
  unitIdRef,
  useCaseIdRef,
} from "../../../skills/amadeus-validator/validator/domain/id-ref";
import { resolveArtifactLinkTarget } from "../../../skills/amadeus-validator/validator/domain/artifact-links";
import { parseMarkdownDocument } from "../../../skills/amadeus-validator/validator/domain/markdown";
import {
  parseBusinessRules,
  parseUnitIndex,
} from "../../../skills/amadeus-validator/validator/domain/typed-documents";
import { parseConstructionFunctionalDesignState } from "../../../skills/amadeus-validator/validator/domain/functional-design-state";
import { type EvidenceKind } from "../../../skills/amadeus-validator/validator/domain/evidence-kind";
import {
  currentIntentEvidenceTargets,
  evaluateEvidencePolicy,
  evidencePolicyAllowedKindsByPhase,
} from "../../../skills/amadeus-validator/validator/domain/evidence-policy";
import { checkConstructionFunctionalDesignStage } from "../../../skills/amadeus-validator/validator/stages/construction/functional-design";

// @ts-expect-error ImplementationTargetId is not a supported ID reference target.
type RejectImplementationTargetIdRef = IdRef<ImplementationTargetId>;

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

const validUnitId = unitId("U001");
assert(validUnitId.value === "U001", "UnitId keeps valid value");
assertThrows(() => unitId("B001"), "UnitId rejects non Unit prefix");
assert(requirementId("R001").value === "R001", "RequirementId keeps valid value");
assert(boundedContextId("BC001").value === "BC001", "BoundedContextId keeps valid value");
assertThrows(() => artifactPath("/tmp/state.json"), "ArtifactPath rejects absolute path");
assert(documentTitle("用語集").value === "用語集", "DocumentTitle keeps non blank title");
assert(tableColumnName("識別子").value === "識別子", "TableColumnName keeps non blank column");

const unitRef = unitIdRef("[U001](inception/units/U001-unit.md)", artifactPath("traceability.md"));
assert(unitRef.id.value === "U001", "UnitIdRef keeps typed UnitId");
assert(unitRef.rawLinkTarget === "inception/units/U001-unit.md", "UnitIdRef keeps raw link target");
assert(unitRef.path.value === "inception/units/U001-unit.md", "UnitIdRef keeps artifact-root relative path");

const relativeUnitRef = unitIdRef("[U001](../inception/units/U001-unit.md)", artifactPath("construction/traceability.md"));
assert(relativeUnitRef.path.value === "inception/units/U001-unit.md", "UnitIdRef normalizes source-relative path");
const intentUnitRef = unitIdRef("[U001](units/U001-unit.md)", artifactPath("intents/20260629-minimum-purchase-flow/inception/units.md"));
assert(intentUnitRef.path.value === "intents/20260629-minimum-purchase-flow/inception/units/U001-unit.md", "UnitIdRef allows Intent-rooted artifact path");
const dotAmadeusIntentUnitRef = unitIdRef("[U001](units/U001-unit.md)", artifactPath(".amadeus/intents/20260629-minimum-purchase-flow/inception/units.md"));
assert(dotAmadeusIntentUnitRef.path.value === ".amadeus/intents/20260629-minimum-purchase-flow/inception/units/U001-unit.md", "UnitIdRef allows .amadeus-rooted artifact path");
assert(resolveArtifactLinkTarget(".amadeus/domain-map.md", "./intents/20260629-minimum-purchase-flow.md").value === ".amadeus/intents/20260629-minimum-purchase-flow.md", "Artifact link resolves dot-relative Domain Map evidence");
assert(resolveArtifactLinkTarget(".amadeus/domain-map.md", "intents/20260629-minimum-purchase-flow.md").value === ".amadeus/intents/20260629-minimum-purchase-flow.md", "Artifact link resolves plain Domain Map evidence");
assertThrows(() => resolveArtifactLinkTarget(".amadeus/domain-map.md", "https://example.com/intent.md"), "Artifact link rejects external target");
assert(requirementIdRef("[R001](inception/requirements/R001-requirement.md)", artifactPath("traceability.md")).id.value === "R001", "RequirementIdRef parses valid link");
assert(storyIdRef("[S001](inception/user-stories/S001-story.md)", artifactPath("traceability.md")).id.value === "S001", "StoryIdRef parses valid link");
assert(useCaseIdRef("[UC001](inception/use-cases/UC001-use-case.md)", artifactPath("traceability.md")).id.value === "UC001", "UseCaseIdRef parses valid link");
assert(boltIdRef("[B001](inception/bolts/B001-bolt.md)", artifactPath("traceability.md")).id.value === "B001", "BoltIdRef parses valid link");
assertThrows(() => unitIdRef("[購入 Unit](inception/units/U001-unit.md)", artifactPath("traceability.md")), "IdRef rejects display text that is not an ID");
assertThrows(() => unitIdRef("[U001](inception/requirements/U001-unit.md)", artifactPath("traceability.md")), "IdRef rejects mismatched artifact directory");
assertThrows(() => unitIdRef("[U001](inception/units/U002-unit.md)", artifactPath("traceability.md")), "IdRef rejects stem that does not start with the ID");
assertThrows(() => unitIdRef("[U001](inception/units/U001-unit.md#overview)", artifactPath("traceability.md")), "IdRef rejects anchor link");
assertThrows(() => unitIdRef("[U001](https://example.com/U001-unit.md)", artifactPath("traceability.md")), "IdRef rejects external link");
assertThrows(() => unitIdRef("[U001](/inception/units/U001-unit.md)", artifactPath("traceability.md")), "IdRef rejects absolute path");
assertThrows(() => unitIdRef("[U001](\\inception\\units\\U001-unit.md)", artifactPath("traceability.md")), "IdRef rejects backslash absolute path");
assertThrows(() => unitIdRef("[U001](\\\\inception\\units\\U001-unit.md)", artifactPath("traceability.md")), "IdRef rejects UNC-like path");
assertThrows(() => unitIdRef("[U001](../inception/units/U001-unit.md)", artifactPath("traceability.md")), "IdRef rejects path outside artifact root");
assertThrows(() => unitIdRef("[U001](inception/units/U001-unit.md) and [U002](inception/units/U002-unit.md)", artifactPath("traceability.md")), "IdRef rejects multiple links as single ref");
assertThrows(() => unitIdRef("U001", artifactPath("traceability.md")), "IdRef rejects plain ID as link ref");
assertThrows(() => unitIdRef("なし", artifactPath("traceability.md")), "IdRef rejects none marker as single ref");
assertThrows(() => unitIdRef("", artifactPath("traceability.md")), "IdRef rejects blank single ref");

const idRefList = parseIdRefList(
  "[U001](inception/units/U001-unit.md), [U002](inception/units/U002-order.md)",
  artifactPath("traceability.md"),
  unitIdRef,
  { target: "traceability.md", condition: "unit.idRefs" },
);
assert(idRefList.refs.length === 2, "parseIdRefList parses comma-separated ID links");
assert(idRefList.refs[1]?.id.value === "U002", "parseIdRefList keeps second ID link");
assert(idRefList.results.every((result) => result.result === "pass"), "parseIdRefList records pass results");

const noneIdRefList = parseIdRefList("なし", artifactPath("traceability.md"), unitIdRef, {
  target: "traceability.md",
  condition: "unit.idRefs",
  allowNone: true,
});
assert(noneIdRefList.refs.length === 0, "parseIdRefList treats allowed none as empty list");
assert(noneIdRefList.results.some((result) => result.result === "pass" && result.evidence === "なし"), "parseIdRefList records allowed none");

const rejectedNoneIdRefList = parseIdRefList("なし", artifactPath("traceability.md"), unitIdRef, {
  target: "traceability.md",
  condition: "unit.idRefs",
});
assert(rejectedNoneIdRefList.results.some((result) => result.result === "fail"), "parseIdRefList rejects none unless allowed");

const domainMapInceptionEvidenceKinds = new Set<EvidenceKind>(evidencePolicyAllowedKindsByPhase["domain-map-adoption"].inception);
assert(domainMapInceptionEvidenceKinds.has("inception-decision"), "EvidencePolicy allows Inception decisions for Domain Map adoption");
assert(!domainMapInceptionEvidenceKinds.has("inception-traceability"), "EvidencePolicy keeps Domain Map Inception adoption tied to decisions");
const contextMapConstructionEvidenceKinds = new Set<EvidenceKind>(evidencePolicyAllowedKindsByPhase["context-map-dependency"].construction);
assert(contextMapConstructionEvidenceKinds.has("functional-design"), "EvidencePolicy allows Functional Design evidence for Context Map Construction adoption");
assert(contextMapConstructionEvidenceKinds.has("construction-traceability"), "EvidencePolicy allows Construction traceability for Context Map Construction adoption");
assert(
  currentIntentEvidenceTargets(
    [
      ".amadeus/intents/20260629-minimum-purchase-flow.md",
      ".amadeus/intents/20260629-minimum-purchase-flow/inception/decisions/D001-ready.md",
      ".amadeus/intents/20260629-other-flow/inception/decisions/D001-ready.md",
    ],
    ".amadeus/intents/20260629-minimum-purchase-flow",
  ).length === 2,
  "EvidencePolicy extracts current Intent evidence targets",
);
const intentRecordOnlyEvaluation = evaluateEvidencePolicy({
  policyName: "context-map-dependency",
  currentIntentRoot: ".amadeus/intents/20260629-minimum-purchase-flow",
  targets: [".amadeus/intents/20260629-minimum-purchase-flow.md"],
  evidencePhases: ["inception", "construction"],
  functionalDesignStatus: () => "not_functional_design",
});
assert(intentRecordOnlyEvaluation.result === "rejected", "EvidencePolicy rejects current Intent Record-only adoption evidence");
const laterDecisionEvaluation = evaluateEvidencePolicy({
  policyName: "context-map-dependency",
  currentIntentRoot: ".amadeus/intents/20260629-minimum-purchase-flow",
  targets: [
    ".amadeus/intents/20260629-minimum-purchase-flow/construction/U001-order/functional-design/business-logic-model.md",
    ".amadeus/intents/20260629-minimum-purchase-flow/construction/decisions/D001-ready.md",
  ],
  evidencePhases: ["construction"],
  functionalDesignStatus: (target) => target.includes("/functional-design/") ? "not_passed" : "not_functional_design",
});
assert(
  laterDecisionEvaluation.result === "accepted" && laterDecisionEvaluation.target === ".amadeus/intents/20260629-minimum-purchase-flow/construction/decisions/D001-ready.md",
  "EvidencePolicy can accept a later valid evidence target after an unpassed Functional Design link",
);

const invalidIdRefList = parseIdRefList("[U001](inception/requirements/U001-unit.md)", artifactPath("traceability.md"), unitIdRef, {
  target: "traceability.md",
  condition: "unit.idRefs",
});
assert(invalidIdRefList.refs.length === 0, "parseIdRefList omits invalid refs");
assert(invalidIdRefList.results.some((result) => result.result === "fail"), "parseIdRefList records failed refs");
assert(parseIdRefList(",", artifactPath("traceability.md"), unitIdRef).results.some((result) => result.result === "fail"), "parseIdRefList rejects delimiter-only value");
assert(parseIdRefList(" , ", artifactPath("traceability.md"), unitIdRef).results.some((result) => result.result === "fail"), "parseIdRefList rejects blank items only");

const markdown = parseMarkdownDocument(
  [
    "# Units",
    "",
    "## 一覧",
    "",
    "| 識別子 | 概要 | 要求 | コンテキスト | 依存 | 詳細 |",
    "|---|---|---|---|---|---|",
    "| U001 | 購入 | R001, R002 | BC001 | なし | [詳細](units/U001-purchase.md) |",
    "| U002 | 注文 | R003 | BC001 | U001 | [詳細](units/U002-order.md) |",
    "",
  ].join("\n"),
  artifactPath("inception/units.md"),
);
assert(markdown.title.value === "Units", "MarkdownDocument parses title");
assert(markdown.sections.some((section) => section.title.value === "一覧"), "MarkdownDocument parses sections");
assert(markdown.sections[0]?.tables[0]?.headers[0]?.value === "識別子", "MarkdownTable headers use TableColumnName");

const unitIndex = parseUnitIndex(markdown);
assert(unitIndex.document.units[0]?.unitId.value === "U001", "UnitIndex parses Unit ID");
assert(unitIndex.document.units[0]?.requirementIds[1]?.value === "R002", "UnitIndex stores Requirement references as IDs");
assert(unitIndex.document.units[0]?.contextIds[0]?.value === "BC001", "UnitIndex stores Bounded Context references as IDs");
assert(unitIndex.document.units[1]?.dependencyUnitIds[0]?.value === "U001", "UnitIndex stores Unit dependencies as IDs");
assert(unitIndex.results.some((result) => result.result === "pass"), "ParseResult carries structured pass CheckResult");

const partialUnitIndex = parseUnitIndex(parseMarkdownDocument(
  [
    "# Units",
    "",
    "## 一覧",
    "",
    "| 識別子 | 概要 | 要求 | コンテキスト | 依存 | 詳細 |",
    "|---|---|---|---|---|---|",
    "| U003 | 破損参照 | B001 | BC999 | U999 | [詳細](units/U003-broken.md) |",
    "",
  ].join("\n"),
  artifactPath("inception/units.md"),
));
assert(partialUnitIndex.document.units[0]?.unitId.value === "U003", "UnitIndex keeps partial row when references fail");
assert(partialUnitIndex.results.some((result) => result.result === "fail" && result.condition === "unit.requirement"), "UnitIndex reports invalid Requirement references");

const incompleteBusinessRules = parseBusinessRules(parseMarkdownDocument(
  [
    "# Business Rules",
    "",
    "## 業務ルール",
    "",
    "| 識別子 | 規則 |",
    "|---|---|",
    "| BR001 | 商品を選択する |",
    "",
  ].join("\n"),
  artifactPath("construction/U001-purchase/functional-design/business-rules.md"),
));
assert(incompleteBusinessRules.document.rules.length === 1, "BusinessRules returns partial document");
assert(incompleteBusinessRules.results.some((result) => result.result === "fail" && result.condition === "table.columns"), "BusinessRules reports missing Catalog columns");

const functionalDesignState = parseConstructionFunctionalDesignState(".amadeus/intents/intent/state.json", {
  targetUnits: ["U001"],
  units: [
    {
      unitId: "U001",
      requirement: "required",
      status: "passed",
      frontendSurface: "absent",
      targetSource: "functional_design_target_units",
      runMode: "initial",
    },
    {
      unitId: "U002",
      requirement: "not_required",
      status: "passed",
      frontendSurface: "absent",
      targetSource: "construction_target_units",
      runMode: "initial",
    },
  ],
});
assert(functionalDesignState.document.units[0]?.unitId.value === "U001", "ConstructionFunctionalDesignState uses UnitId domain primitive");
assert(functionalDesignState.results.some((result) => result.result === "fail" && result.condition.includes("requirement と status")), "ConstructionFunctionalDesignState rejects invalid state matrix");

const functionalDesignStage = checkConstructionFunctionalDesignStage({
  statePath: ".amadeus/intents/intent/state.json",
  value: {
    targetUnits: ["U001"],
    units: [
      {
        unitId: "U001",
        requirement: "required",
        status: "skipped",
        frontendSurface: "present",
        targetSource: "construction_target_bolts",
        runMode: "initial",
      },
    ],
  },
  existingUnitIds: new Set(["U001"]),
  unitDirectories: new Map([["U001", ".amadeus/intents/intent/inception/units/U001-purchase"]]),
  constructionBase: ".amadeus/intents/intent/construction",
  intentBase: ".amadeus/intents/intent",
  fileExists: () => false,
  relativeToIntent: (_base, path) => path,
});
assert(functionalDesignStage.results.some((result) => result.result === "fail" && result.condition.includes("requirement と status")), "Functional Design stage module validates state matrix");

console.log("amadeus validator domain eval: ok");
