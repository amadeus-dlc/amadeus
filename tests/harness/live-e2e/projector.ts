import type { Result } from "./contract.ts";
import { latestGreenByAdapter, type RecordedLiveRunReceipt } from "./ledger.ts";
import type { LiveCapability } from "./registry.ts";

export const MATRIX_START = "<!-- AMADEUS_LIVE_E2E_MATRIX:START -->";
export const MATRIX_END = "<!-- AMADEUS_LIVE_E2E_MATRIX:END -->";

export interface MatrixError {
  readonly kind: "generated-block-missing" | "generated-block-drift";
  readonly diagnostic: string;
}

function escapeCell(value: string): string {
  return value.replaceAll("|", "\\|").replaceAll("\n", " ");
}

export function renderCapabilityMatrix(
  capabilities: readonly LiveCapability[],
  receipts: readonly RecordedLiveRunReceipt[],
): string {
  const latestGreen = latestGreenByAdapter(receipts);
  const rows = [...capabilities]
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((capability) => {
      const green = latestGreen.get(capability.id);
      const state = capability.status === "supported"
        ? green === undefined
          ? "UNVERIFIED"
          : "SUPPORTED"
        : capability.status.toUpperCase();
      const evidence = green === undefined
        ? capability.followUpIssue ?? "—"
        : `${green.gitSha} @ ${green.recordedAt}`;
      return `| ${capability.id} | ${capability.harness} | ${capability.transport} | \`${capability.optInKey}\` | hard deny | ${escapeCell(capability.isolationSummary)} | ${capability.anchorKinds.join(", ")} | ${state} | ${capability.minimumVersion} / ${capability.measuredVersion} | ${evidence} |`;
    });
  return [
    MATRIX_START,
    "| Adapter | Harness | Transport | Opt-in | GitHub Actions | Isolation | Anchors | State | Version (min/measured) | Last green / Issue |",
    "|---|---|---|---|---|---|---|---|---|---|",
    ...rows,
    MATRIX_END,
  ].join("\n");
}

function currentBlock(document: string): string | null {
  const start = document.indexOf(MATRIX_START);
  const end = document.indexOf(MATRIX_END);
  if (start < 0 || end < start) return null;
  return document.slice(start, end + MATRIX_END.length);
}

export function checkCapabilityMatrix(
  currentDocument: string,
  expectedBlock: string,
): Result<void, MatrixError> {
  const actual = currentBlock(currentDocument);
  if (actual === null) {
    return {
      ok: false,
      error: { kind: "generated-block-missing", diagnostic: "generated matrix block is missing" },
    };
  }
  if (actual !== expectedBlock) {
    return {
      ok: false,
      error: { kind: "generated-block-drift", diagnostic: "generated matrix block has drifted" },
    };
  }
  return { ok: true, value: undefined };
}

export function updateCapabilityMatrix(currentDocument: string, expectedBlock: string): string {
  const actual = currentBlock(currentDocument);
  if (actual === null) throw new Error("generated matrix block is missing");
  return currentDocument.replace(actual, expectedBlock);
}
