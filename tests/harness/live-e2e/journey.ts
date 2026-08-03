import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { LiveJourney } from "./adapter.ts";
import { CLAUDE_PRINT_PROMPT } from "./claude.ts";
import { digest } from "./contract.ts";

export interface CodexAnchorJourneyOptions {
  readonly prompt?: string;
  readonly timeoutMs?: number;
}

export function createClaudeStructuredJourney(): LiveJourney {
  return {
    id: "claude-print-structured-v1",
    prompt: CLAUDE_PRINT_PROMPT,
    timeoutMs: 90_000,
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
