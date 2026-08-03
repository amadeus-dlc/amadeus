import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { LiveJourney } from "./adapter.ts";
import { digest } from "./contract.ts";

export interface CodexAnchorJourneyOptions {
  readonly prompt?: string;
  readonly timeoutMs?: number;
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
