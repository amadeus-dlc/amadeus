#!/usr/bin/env bun
import { isMode, resultExitCode, runGate } from "./no-silent-drop/engine.ts";
import { errorResult } from "./no-silent-drop/model.ts";

const mode = process.argv[2];
const FULL_SHA = /^[0-9a-f]{40}$/;

function parseBaseRevision(argv: readonly string[]): { ok: true; revision?: string } | { ok: false; detail: string } {
  const args = argv[0] === "--" ? argv.slice(1) : argv;
  if (args.length === 0) return { ok: true };
  if (args[0] !== "--base-revision") return { ok: false, detail: `unknown argument: ${args[0]}` };
  if (args.length === 1) return { ok: false, detail: "--base-revision requires one full SHA value" };
  if (args.length > 2) {
    return {
      ok: false,
      detail: args[2] === "--base-revision" ? "duplicate --base-revision argument" : `unknown argument: ${args[2]}`,
    };
  }
  const revision = args[1] as string;
  if (!FULL_SHA.test(revision)) return { ok: false, detail: "--base-revision must be a lowercase full SHA" };
  if (/^0+$/.test(revision)) return { ok: false, detail: "--base-revision must not be an all-zero SHA" };
  return { ok: true, revision };
}

const parsed = parseBaseRevision(process.argv.slice(3));
if (parsed.ok && parsed.revision !== undefined) process.env.AMADEUS_NSD_TRUSTED_BASE_SHA = parsed.revision;
const result = !isMode(mode)
  ? errorResult(
      "RULE_INVALID",
      "usage: bun tests/no-silent-drop-gate.ts <check|census-evidence|approve-evidence|baseline-candidate> [--base-revision <full-sha>]",
    )
  : !parsed.ok
    ? errorResult("RULE_INVALID", parsed.detail)
    : await runGate(mode);

process.stdout.write(`${JSON.stringify(result)}\n`);
process.exitCode = resultExitCode(result);
