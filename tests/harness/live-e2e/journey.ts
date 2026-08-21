import { scaleTestTime } from "../../lib/test-time-factor.ts";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { LiveJourney } from "./adapter.ts";
import { CLAUDE_SDK_PROMPT, type ClaudeSdkWorkerEvent } from "./claude-sdk.ts";
import { CLAUDE_TUI_PROMPT } from "./claude-tui.ts";
import { CLAUDE_PRINT_PROMPT } from "./claude.ts";
import { digest } from "./contract.ts";
import { KIMI_PRINT_ANCHOR_FILE, KIMI_PRINT_PROMPT } from "./kimi-print.ts";
import { KIRO_TUI_PROMPT } from "./kiro-tui.ts";

export interface CodexAnchorJourneyOptions {
  readonly prompt?: string;
  readonly timeoutMs?: number;
}

export function createClaudeStructuredJourney(): LiveJourney {
  return {
    id: "claude-print-structured-v1",
    prompt: CLAUDE_PRINT_PROMPT,
    timeoutMs: scaleTestTime(90_000),
    retryPolicy: { maxAttempts: 1 },
    assert: (execution) => {
      const structuredOutput = execution.structured?.structured_output;
      const anchor = structuredOutput !== null && typeof structuredOutput === "object" && !Array.isArray(structuredOutput)
        ? (structuredOutput as Readonly<Record<string, unknown>>).amadeus_live_e2e
        : undefined;
      const passed = execution.exitCode === 0 &&
        execution.structured?.is_error === false &&
        typeof execution.structured.num_turns === "number" &&
        execution.structured.num_turns >= 1 &&
        anchor === "ok";
      return {
        passed,
        diagnostic: passed ? "exit, result envelope, turn count, and structured schema passed" : "Claude structured anchor mismatch",
        evidence: [
          {
            kind: "claude-structured-anchor",
            value: digest(`${execution.exitCode}:${execution.structured?.is_error}:${execution.structured?.num_turns}:${anchor}`),
            source: "assertion",
          },
        ],
      };
    },
  };
}

function numericField(event: ClaudeSdkWorkerEvent, key: string): number | undefined {
  const value = event[key];
  return typeof value === "number" ? value : undefined;
}

export function createClaudeSdkJourney(timeoutBaseMs = 90_000): LiveJourney {
  return {
    id: "claude-sdk-structured-v1",
    prompt: CLAUDE_SDK_PROMPT,
    timeoutMs: scaleTestTime(timeoutBaseMs),
    retryPolicy: { maxAttempts: 1 },
    assert: (execution) => {
      const rawEvents = execution.structured?.sdkEvents;
      const events = Array.isArray(rawEvents) ? rawEvents as ClaudeSdkWorkerEvent[] : [];
      const terminals = events.filter((event) => event.kind === "terminal");
      const terminal = terminals[0];
      const ordered = events.every((event, index) => event.ordinal === index);
      const terminalLast = terminal !== undefined && terminal.ordinal === events.length - 1;
      const outputEvidence = events.some((event) =>
        (event.kind === "tool" || event.kind === "assistant") && (numericField(event, "byteLength") ?? 0) > 0
      );
      const structuralEvents = ["state", "audit"].every((kind) =>
        events.filter((event) => event.kind === kind).length === 1
      );
      const passed = execution.exitCode === 0 &&
        terminal !== undefined &&
        !execution.timedOut &&
        !execution.aborted &&
        execution.structured?.truncated !== true &&
        ordered &&
        terminalLast &&
        structuralEvents &&
        terminals.length === 1 &&
        terminal.type === "result" &&
        terminal.subtype === "success" &&
        terminal.isError === false &&
        (numericField(terminal, "numTurns") ?? 0) >= 1 &&
        numericField(terminal, "permissionDenialsCount") === 0 &&
        terminal.hasLateEvent === false &&
        outputEvidence;
      return {
        passed,
        diagnostic: passed
          ? "SDK terminal, ordering, permission, state/audit, and output evidence passed"
          : "Claude SDK structured journey mismatch",
        evidence: [{
          kind: "claude-sdk-structured-anchor",
          value: digest(JSON.stringify({
            eventCount: events.length,
            ordered,
            terminalCount: terminals.length,
            terminalSubtype: terminal?.subtype,
            outputEvidence,
          })),
          source: "assertion",
        }],
      };
    },
  };
}

interface TuiAnchorJourneySpec {
  readonly id: string;
  readonly prompt: string;
  readonly timeoutMs: number;
  readonly evidenceKind: string;
  readonly passedDiagnostic: string;
  readonly failedDiagnostic: string;
}

/**
 * Rendered-TUI adapters share one anchor contract — private session, verified
 * file anchor, single input, bounded pane digests — so the assertion lives in
 * one factory and per-harness journeys differ only in identity and wording.
 */
function createTuiAnchorJourney(spec: TuiAnchorJourneySpec): LiveJourney {
  return {
    id: spec.id,
    prompt: spec.prompt,
    timeoutMs: spec.timeoutMs,
    retryPolicy: { maxAttempts: 1 },
    assert: (execution) => {
      const passed = execution.exitCode === 0 &&
        execution.structured?.anchorVerified === true &&
        execution.structured.inputCount === 1 &&
        typeof execution.structured.paneDigest === "string" &&
        typeof execution.structured.sessionDigest === "string";
      return {
        passed,
        diagnostic: passed ? spec.passedDiagnostic : spec.failedDiagnostic,
        evidence: [{
          kind: spec.evidenceKind,
          value: digest(
            `${execution.exitCode}:${execution.structured?.anchorVerified}:${execution.structured?.inputCount}:${execution.structured?.paneDigest}`,
          ),
          source: "assertion",
        }],
      };
    },
  };
}

export function createClaudeTuiJourney(): LiveJourney {
  return createTuiAnchorJourney({
    id: "claude-tui-anchor-v1",
    prompt: CLAUDE_TUI_PROMPT,
    timeoutMs: scaleTestTime(120_000),
    evidenceKind: "claude-tui-anchor",
    passedDiagnostic: "private TUI session, current-run file anchor, and bounded pane evidence passed",
    failedDiagnostic: "Claude TUI anchor mismatch",
  });
}

export function createKiroTuiJourney(): LiveJourney {
  return createTuiAnchorJourney({
    id: "kiro-tui-anchor-v1",
    prompt: KIRO_TUI_PROMPT,
    timeoutMs: scaleTestTime(180_000),
    evidenceKind: "kiro-tui-anchor",
    passedDiagnostic: "private Kiro TUI session, current-run file anchor, and bounded pane evidence passed",
    failedDiagnostic: "Kiro TUI anchor mismatch",
  });
}

/**
 * Kimi's print transport emits prose, so the deterministic half of the PASS
 * product is a file the model had to create — the same anchor shape the Codex
 * journey uses. business-rules.md pins the 600,000 ms journey timeout, and the
 * enclosing Bun test must stay at or above 660,000 ms so the two can never
 * collide (BR-KIMI-15).
 */
export function createKimiPrintJourney(): LiveJourney {
  return {
    id: "kimi-print-anchor-v1",
    prompt: KIMI_PRINT_PROMPT,
    timeoutMs: scaleTestTime(600_000),
    retryPolicy: { maxAttempts: 1 },
    assert: (execution, scratch) => {
      const anchorPath = join(scratch.projectDir, KIMI_PRINT_ANCHOR_FILE);
      let anchorValue: unknown;
      if (existsSync(anchorPath)) {
        try {
          anchorValue = (JSON.parse(readFileSync(anchorPath, "utf8")) as {
            amadeus_live_e2e?: unknown;
          }).amadeus_live_e2e;
        } catch {
          anchorValue = undefined;
        }
      }
      const passed = execution.exitCode === 0 &&
        !execution.timedOut &&
        !execution.aborted &&
        anchorValue === "ok";
      return {
        passed,
        diagnostic: passed
          ? "exit and scratch-project file anchor passed"
          : "Kimi print anchor mismatch",
        evidence: [{
          kind: "kimi-print-anchor",
          value: digest(`${execution.exitCode}:${anchorValue}:${execution.structured?.stdoutTruncated}`),
          source: "assertion",
        }],
      };
    },
  };
}

export function createCodexAnchorJourney(options: CodexAnchorJourneyOptions = {}): LiveJourney {
  const prompt = options.prompt ??
    'Create .amadeus-live-anchor.json containing exactly {"status":"ok"}, then respond briefly.';
  return {
    id: "codex-anchor-file-v1",
    prompt,
    timeoutMs: options.timeoutMs ?? 120_000,
    retryPolicy: { maxAttempts: 1 },
    assert: (execution, scratch) => {
      const anchorPath = join(scratch.projectDir, ".amadeus-live-anchor.json");
      let fileStatus: unknown;
      if (existsSync(anchorPath)) {
        try {
          fileStatus = (JSON.parse(readFileSync(anchorPath, "utf8")) as { status?: unknown }).status;
        } catch {
          fileStatus = undefined;
        }
      }
      const passed =
        execution.exitCode === 0 &&
        execution.structured !== undefined &&
        fileStatus === "ok";
      return {
        passed,
        diagnostic: passed ? "exit, JSONL schema, and file anchor passed" : "Codex anchor mismatch",
        evidence: [
          {
            kind: "anchor-digest",
            value: digest(`${execution.exitCode}:${fileStatus}:${execution.structured?.status ?? "unknown"}`),
            source: "assertion",
          },
        ],
      };
    },
  };
}
