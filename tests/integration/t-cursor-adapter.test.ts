// t-cursor-adapter: in-process coverage for the Cursor harness (U3).
// Drives the adapter shim's exported seams (parse → map → reconstruct →
// runAdapter/runCli) with an INJECTED spawn, plus the emit() write⇔check
// symmetry and the frozen manifest row. No real subprocess in the logic paths
// (seam-export-handler-amend): the spawn is dependency-injected, so exit codes
// and reconstructed core stdin are asserted deterministically. One direct
// defaultSpawn call covers the real Bun.spawnSync wiring.
//
// covers: file:packages/framework/harness/cursor/hooks/amadeus-cursor-lib.ts,
//         file:packages/framework/harness/cursor/emit.ts,
//         file:packages/framework/harness/cursor/manifest.ts
//
// WHY in-process: `bun --coverage` does not instrument spawned subprocesses, so
// the packaging path (`bun scripts/package.ts cursor`, exercised by dist:check)
// runs emit.ts in a child and cannot cover it. Driving emit() and the adapter
// seam DIRECTLY here exercises every branch in-process.

import { describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { EmitContext } from "../../scripts/manifest-types.ts";
import {
  type CoreCall,
  defaultSpawn,
  EXIT_ADVISORY_FAIL,
  parseCursorEnvelope,
  reconstruct,
  runAdapter,
  runCli,
  ToolNameMap,
} from "../../packages/framework/harness/cursor/hooks/amadeus-cursor-lib.ts";
import emit from "../../packages/framework/harness/cursor/emit.ts";
import manifest from "../../packages/framework/harness/cursor/manifest.ts";

// A spawn spy: records every core-hook call and returns a fixed response.
function spySpawn(stdout = "", code = 0) {
  const calls: Array<{ hookFile: string; input: string }> = [];
  const fn = (hookFile: string, input: string): { stdout: string; code: number } => {
    calls.push({ hookFile, input });
    return { stdout, code };
  };
  return { fn, calls };
}

describe("parseCursorEnvelope — parse-don't-validate", () => {
  test("parses a JSON object into an envelope", () => {
    expect(parseCursorEnvelope('{"hook_event_name":"stop"}')).toEqual({ hook_event_name: "stop" });
  });
  test("returns null for empty / non-JSON / array / primitive", () => {
    expect(parseCursorEnvelope("")).toBeNull();
    expect(parseCursorEnvelope("not json")).toBeNull();
    expect(parseCursorEnvelope("[1,2]")).toBeNull();
    expect(parseCursorEnvelope("42")).toBeNull();
    expect(parseCursorEnvelope("null")).toBeNull();
  });
});

describe("ToolNameMap — 工程0 measured identities only", () => {
  test("maps the two documented tool-observation events, nothing else", () => {
    expect(ToolNameMap).toEqual({ afterShellExecution: "Bash", afterFileEdit: "Edit" });
    expect(ToolNameMap.preToolUse).toBeUndefined();
  });
});

describe("reconstruct — 正常写像 (each target → core stdin)", () => {
  const firstInput = (calls: CoreCall[]): Record<string, unknown> =>
    JSON.parse(calls[0].input) as Record<string, unknown>;

  test("afterShellExecution → runtime-compile {Bash, tool_input.command}", () => {
    const r = reconstruct("runtime-compile", { hook_event_name: "afterShellExecution", command: "git status" });
    if ("error" in r) throw new Error("unexpected error");
    expect(r.forwardStdout).toBe(false);
    expect(r.calls).toHaveLength(1);
    expect(r.calls[0].hookFile).toBe("amadeus-runtime-compile.ts");
    expect(firstInput(r.calls)).toEqual({ hook_event_name: "PostToolUse", tool_name: "Bash", tool_input: { command: "git status" } });
  });

  test("afterFileEdit → audit-logger + sensor-fire {Edit, tool_input.file_path}", () => {
    const r = reconstruct("audit-and-sensors", { hook_event_name: "afterFileEdit", file_path: "/w/a.ts" });
    if ("error" in r) throw new Error("unexpected error");
    expect(r.calls.map((c) => c.hookFile)).toEqual(["amadeus-audit-logger.ts", "amadeus-sensor-fire.ts"]);
    expect(firstInput(r.calls)).toEqual({ hook_event_name: "PostToolUse", tool_name: "Edit", tool_input: { file_path: "/w/a.ts" } });
  });

  test("sessionStart → session-start {source, session_id}, forwardStdout", () => {
    const r = reconstruct("session-start", { session_id: "s1" });
    if ("error" in r) throw new Error("unexpected error");
    expect(r.forwardStdout).toBe(true);
    expect(firstInput(r.calls)).toEqual({ hook_event_name: "SessionStart", source: "startup", session_id: "s1" });
  });

  test("session-start omits session_id when absent", () => {
    const r = reconstruct("session-start", { source: "resume" });
    if ("error" in r) throw new Error("unexpected error");
    expect(firstInput(r.calls)).toEqual({ hook_event_name: "SessionStart", source: "resume" });
  });

  test("beforeSubmitPrompt → mint {prompt}", () => {
    const r = reconstruct("mint", { prompt: "build X" });
    if ("error" in r) throw new Error("unexpected error");
    expect(r.calls[0].hookFile).toBe("amadeus-mint-presence.ts");
    expect(firstInput(r.calls)).toEqual({ hook_event_name: "UserPromptSubmit", prompt: "build X" });
  });

  test("mint defaults an absent prompt to empty string", () => {
    const r = reconstruct("mint", {});
    if ("error" in r) throw new Error("unexpected error");
    expect(firstInput(r.calls)).toEqual({ hook_event_name: "UserPromptSubmit", prompt: "" });
  });

  test("subagentStop → log-subagent {agent_type, agent_id}", () => {
    const r = reconstruct("log-subagent", { subagent_type: "explore", subagent_id: "a9" });
    if ("error" in r) throw new Error("unexpected error");
    expect(firstInput(r.calls)).toEqual({ hook_event_name: "SubagentStop", agent_type: "explore", agent_id: "a9" });
  });

  test("log-subagent defaults absent identity fields", () => {
    const r = reconstruct("log-subagent", {});
    if ("error" in r) throw new Error("unexpected error");
    expect(firstInput(r.calls)).toEqual({ hook_event_name: "SubagentStop", agent_type: "", agent_id: "" });
  });

  test("preCompact → validate-state {}", () => {
    const r = reconstruct("validate-state", {});
    if ("error" in r) throw new Error("unexpected error");
    expect(r.calls).toEqual([{ hookFile: "amadeus-validate-state.ts", input: "{}" }]);
  });

  test("sessionEnd → session-end {reason}, defaulting to unknown", () => {
    const withReason = reconstruct("session-end", { reason: "window_close" });
    if ("error" in withReason) throw new Error("unexpected error");
    expect(firstInput(withReason.calls)).toEqual({ hook_event_name: "SessionEnd", reason: "window_close" });
    const noReason = reconstruct("session-end", {});
    if ("error" in noReason) throw new Error("unexpected error");
    expect(firstInput(noReason.calls)).toEqual({ hook_event_name: "SessionEnd", reason: "unknown" });
  });

  test("stop → amadeus-stop.ts, advisory (no stdout forward)", () => {
    const r = reconstruct("stop", {});
    if ("error" in r) throw new Error("unexpected error");
    expect(r).toEqual({ calls: [{ hookFile: "amadeus-stop.ts", input: "{}" }], forwardStdout: false });
  });

  test("runtime-compile command defaults to empty string when absent", () => {
    const r = reconstruct("runtime-compile", { hook_event_name: "afterShellExecution" });
    if ("error" in r) throw new Error("unexpected error");
    expect(firstInput(r.calls)).toEqual({ hook_event_name: "PostToolUse", tool_name: "Bash", tool_input: { command: "" } });
  });

  test("audit-and-sensors file_path defaults to empty string when absent", () => {
    const r = reconstruct("audit-and-sensors", { hook_event_name: "afterFileEdit" });
    if ("error" in r) throw new Error("unexpected error");
    expect(firstInput(r.calls)).toEqual({ hook_event_name: "PostToolUse", tool_name: "Edit", tool_input: { file_path: "" } });
  });

  test("unknown target → advisory no-op (no calls, no error)", () => {
    expect(reconstruct("bogus-target", {})).toEqual({ calls: [], forwardStdout: false });
  });
});

describe("reconstruct — 未登録 tool identity is rejected advisory (not denied)", () => {
  test("runtime-compile with an unregistered event → error", () => {
    const r = reconstruct("runtime-compile", { hook_event_name: "afterMysteryTool", command: "x" });
    expect("error" in r && r.error).toContain("unregistered tool identity for runtime-compile");
  });
  test("audit-and-sensors with an unregistered event → error", () => {
    const r = reconstruct("audit-and-sensors", { hook_event_name: "afterMysteryTool", file_path: "/x" });
    expect("error" in r && r.error).toContain("unregistered tool identity for audit-and-sensors");
  });
  test("audit target fed a shell event is rejected (event↔target must agree)", () => {
    const r = reconstruct("audit-and-sensors", { hook_event_name: "afterShellExecution" });
    expect("error" in r).toBe(true);
  });
});

describe("runAdapter — the 3 required cases with exit-code asserts", () => {
  test("正常写像: afterFileEdit → exit 0, both core hooks piped in order", () => {
    const spy = spySpawn();
    const raw = JSON.stringify({ hook_event_name: "afterFileEdit", file_path: "/w/b.ts" });
    const res = runAdapter("audit-and-sensors", raw, "/proj", spy.fn);
    expect(res.exitCode).toBe(0);
    expect(res.stderr).toBe("");
    expect(spy.calls.map((c) => c.hookFile)).toEqual(["amadeus-audit-logger.ts", "amadeus-sensor-fire.ts"]);
  });

  test("不正 stdin: unparseable → EXIT_ADVISORY_FAIL, no spawn, diagnostic on stderr", () => {
    const spy = spySpawn();
    const res = runAdapter("audit-and-sensors", "}{ not json", "/proj", spy.fn);
    expect(res.exitCode).toBe(EXIT_ADVISORY_FAIL);
    expect(res.exitCode).not.toBe(2);
    expect(res.stderr).toContain("unparseable stdin");
    expect(spy.calls).toHaveLength(0);
  });

  test("未登録 tool_name: unmapped identity → EXIT_ADVISORY_FAIL, no spawn", () => {
    const spy = spySpawn();
    const raw = JSON.stringify({ hook_event_name: "afterMysteryTool", file_path: "/x" });
    const res = runAdapter("audit-and-sensors", raw, "/proj", spy.fn);
    expect(res.exitCode).toBe(EXIT_ADVISORY_FAIL);
    expect(res.exitCode).not.toBe(2);
    expect(res.stderr).toContain("unregistered");
    expect(spy.calls).toHaveLength(0);
  });

  test("forwardStdout: session-start forwards the core context JSON, exit 0", () => {
    const spy = spySpawn('{"additionalContext":"CTX"}');
    const raw = JSON.stringify({ session_id: "s1" });
    const res = runAdapter("session-start", raw, "/proj", spy.fn);
    expect(res.exitCode).toBe(0);
    expect(res.stdout).toBe('{"additionalContext":"CTX"}');
  });

  test("advisory targets never forward stdout even when core prints", () => {
    const spy = spySpawn("SHOULD-NOT-LEAK");
    const res = runAdapter("mint", JSON.stringify({ prompt: "hi" }), "/proj", spy.fn);
    expect(res.stdout).toBe("");
    expect(spy.calls).toHaveLength(1);
  });

  test("EXIT_ADVISORY_FAIL is 1, never the deny code 2", () => {
    expect(EXIT_ADVISORY_FAIL).toBe(1);
  });
});

describe("runCli — argv/stdin seam", () => {
  test("reads stdin via the injected reader and dispatches by argv[2]", async () => {
    const res = await runCli(["bun", "adapter.ts", "session-end"], async () => JSON.stringify({ reason: "user_close" }));
    // No spawn injected here → runAdapter uses defaultSpawn against the source
    // tree (core hook file is absent beside the shim), so the child exits
    // non-zero; the shim still returns advisory exit 0 (never propagates).
    expect(res.exitCode).toBe(0);
  });

  test("a stdin read failure is swallowed → advisory fail on empty envelope", async () => {
    const res = await runCli(["bun", "adapter.ts", "mint"], async () => {
      throw new Error("stdin blew up");
    });
    // empty raw → parse null → EXIT_ADVISORY_FAIL.
    expect(res.exitCode).toBe(EXIT_ADVISORY_FAIL);
  });
});

describe("defaultSpawn — real Bun.spawnSync wiring", () => {
  test("spawns the sibling adapter as a no-op child and returns exit 0", () => {
    // The adapter file lives beside itself in HOOKS_DIR; running it with no
    // target + empty envelope hits the default no-op path → exit 0. This covers
    // the real spawn seam without depending on a core hook being present.
    const r = defaultSpawn("amadeus-cursor-adapter.ts", "{}", process.cwd());
    expect(r.code).toBe(0);
    expect(typeof r.stdout).toBe("string");
  });
});

// --- emit() write⇔check symmetry -------------------------------------------

const AUTHORED_COMMAND = "AUTHORED cursor command body — probe\n";
const COMMAND_REL = join(".cursor", "commands", "amadeus.md");
const MDC_REL = join(".cursor", "rules", "amadeus.mdc");
const HOOKS_REL = join(".cursor", "hooks.json.example");
const AGENTS_REL = "AGENTS.md";

function ctxFor(distRoot: string, check: boolean): EmitContext {
  return {
    repoRoot: "/unused",
    coreRoot: "/unused",
    harnessRoot: "/unused",
    readHarnessSource: (relPath: string): string => {
      expect(relPath).toBe(join("commands", "amadeus.md"));
      return AUTHORED_COMMAND;
    },
    distRoot,
    harnessDir: ".cursor",
    substituteToken: (s: string): string => s,
    check,
  };
}

describe("cursor emit() — write⇔check symmetry, in-process", () => {
  test("write mode writes all four emissions and returns their paths", () => {
    const dist = mkdtempSync(join(tmpdir(), "cur-emit-write-"));
    try {
      const { written, problems } = emit(ctxFor(dist, false));
      expect(problems).toEqual([]);
      expect(written).toEqual([join(dist, MDC_REL), join(dist, HOOKS_REL), join(dist, AGENTS_REL), join(dist, COMMAND_REL)]);
      // command is the authored source; mdc/hooks/AGENTS are generated.
      expect(readFileSync(join(dist, COMMAND_REL), "utf-8")).toBe(AUTHORED_COMMAND);
      const mdc = readFileSync(join(dist, MDC_REL), "utf-8");
      expect(mdc).toContain("alwaysApply: true");
      expect(mdc).toContain("amadeus/spaces/<space>/memory/");
      const hooks = JSON.parse(readFileSync(join(dist, HOOKS_REL), "utf-8")) as {
        version: number;
        hooks: Record<string, Array<{ type: string; command: string }>>;
      };
      expect(hooks.version).toBe(1);
      expect(Object.keys(hooks.hooks).sort()).toEqual([
        "afterFileEdit",
        "afterShellExecution",
        "beforeSubmitPrompt",
        "preCompact",
        "sessionEnd",
        "sessionStart",
        "stop",
        "subagentStop",
      ]);
      expect(hooks.hooks.afterFileEdit[0].command).toBe("bun .cursor/hooks/amadeus-cursor-adapter.ts audit-and-sensors");
      expect(readFileSync(join(dist, AGENTS_REL), "utf-8")).toContain("Cursor harness");
    } finally {
      rmSync(dist, { recursive: true, force: true });
    }
  });

  test("check mode is clean after a write", () => {
    const dist = mkdtempSync(join(tmpdir(), "cur-emit-clean-"));
    try {
      emit(ctxFor(dist, false));
      const { problems } = emit(ctxFor(dist, true));
      expect(problems).toEqual([]);
    } finally {
      rmSync(dist, { recursive: true, force: true });
    }
  });

  test("check mode flags MISSING when an emission is absent (red path)", () => {
    const dist = mkdtempSync(join(tmpdir(), "cur-emit-missing-"));
    try {
      const { problems } = emit(ctxFor(dist, true));
      expect(problems).toContain(`MISSING emission: ${MDC_REL}`);
      expect(existsSync(join(dist, MDC_REL))).toBe(false);
    } finally {
      rmSync(dist, { recursive: true, force: true });
    }
  });

  test("check mode flags DIFFERS when an emission drifts (red path)", () => {
    const dist = mkdtempSync(join(tmpdir(), "cur-emit-differs-"));
    try {
      emit(ctxFor(dist, false));
      writeFileSync(join(dist, HOOKS_REL), "tampered\n");
      const { problems } = emit(ctxFor(dist, true));
      expect(problems).toContain(`DIFFERS emission: ${HOOKS_REL}`);
    } finally {
      rmSync(dist, { recursive: true, force: true });
    }
  });
});

describe("cursor manifest — the distribution row", () => {
  test("declares the port shape (name/harnessDir/rename/skip)", () => {
    expect(manifest.name).toBe("cursor");
    expect(manifest.harnessDir).toBe(".cursor");
    expect(manifest.rulesRename).toBe("amadeus-rules");
    expect(manifest.skipRunnerGen).toBe(true);
    expect(manifest.emit).toBe(emit);
  });

  test("exempts the authored cursor adapter from the orphan scan", () => {
    expect(manifest.authoredExempt).toHaveLength(1);
    expect(manifest.authoredExempt[0].test("hooks/amadeus-cursor-adapter.ts")).toBe(true);
    expect(manifest.authoredExempt[0].test("hooks/amadeus-audit-logger.ts")).toBe(false);
  });

  test("projects the shared core dirs plus the mirror session skill", () => {
    expect(manifest.coreDirs.map((d) => `${d.src}->${d.dst}`)).toEqual([
      "tools->tools",
      "amadeus-common->amadeus-common",
      "knowledge->knowledge",
      "rules->amadeus-rules",
      "sensors->sensors",
      "scopes->scopes",
      "agents->agents",
      "hooks->hooks",
      "skills/amadeus-mirror->skills/amadeus-mirror",
    ]);
  });

  test("carries the adapter entrypoint + logic lib + project-root .gitignore", () => {
    expect(manifest.harnessFiles).toEqual([
      { src: "hooks/amadeus-cursor-adapter.ts", dst: "hooks/amadeus-cursor-adapter.ts" },
      { src: "hooks/amadeus-cursor-lib.ts", dst: "hooks/amadeus-cursor-lib.ts" },
      { src: "dot-gitignore", dst: ".gitignore", projectRoot: true },
    ]);
  });
});
