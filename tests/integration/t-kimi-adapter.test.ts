// t-kimi-adapter: in-process coverage for the Kimi Code CLI harness (Bolt 2,
// kimi-hook-adapter). Drives the adapter shim's exported seams (parse →
// normalize → route → translate → runAdapter/runCli) with an INJECTED spawn,
// plus the frozen manifest row. No real subprocess in the logic paths
// (seam-export-handler-amend): the spawn is dependency-injected, so exit codes
// and reconstructed core stdin are asserted deterministically. One direct
// defaultSpawn call covers the real Bun.spawnSync wiring.
//
// covers: file:packages/framework/harness/kimi/hooks/amadeus-kimi-lib.ts,
//         file:packages/framework/harness/kimi/manifest.ts
//
// FIXTURES: tests/fixtures/kimi-hooks/<event>.json are live captures from Kimi
// Code CLI 0.28.1 (2026-07-26, the Bolt 2 probe wiring), except the two
// subagent lifecycle fixtures (Kimi 0.29.0 bundle-derived external-runner
// contract). Those two are contract fixtures, not claimed live captures. The mapping
// table and output contracts they pin:
//   - Write/Edit tool_input.path → Claude tool_input.file_path
//   - UserPromptSubmit prompt is a content-block ARRAY → joined to a string
//   - TodoList {todos:[{status,title}]} → TaskUpdate {status, activeForm}
//   - SubagentStop agent_name → agent_type (no agent_id on Kimi)
//   - The live Kimi 0.28.1 Stop capture has a host-stamped non-empty session_id
//     and no agent_name. Kimi 0.29.0's installed bundle constructs Stop with
//     stopHookActive only and emits agentName on separate Subagent lifecycle
//     events. Forwarding additionally requires the matching SessionStart
//     baseline and zero active subagents; unknown/ambiguous callers no-op.

import { describe, expect, test } from "bun:test";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  defaultSpawn,
  type KimiEnvelope,
  normalizePayload,
  parseKimiEnvelope,
  routeTarget,
  runAdapter,
  runCli,
  translateSessionStartOutput,
} from "../../packages/framework/harness/kimi/hooks/amadeus-kimi-lib.ts";
import manifest from "../../packages/framework/harness/kimi/manifest.ts";

const FIXTURE_DIR = join(import.meta.dir, "..", "fixtures", "kimi-hooks");
function fixture(name: string): string {
  return readFileSync(join(FIXTURE_DIR, `${name}.json`), "utf-8");
}
function fixtureEnv(name: string): KimiEnvelope {
  const env = parseKimiEnvelope(fixture(name));
  if (env === null) throw new Error(`fixture ${name} did not parse`);
  return env;
}

// A spawn spy: records every core-hook call and returns a fixed response.
function spySpawn(stdout = "", code = 0) {
  const calls: Array<{ hookFile: string; input: string }> = [];
  const fn = (hookFile: string, input: string): { stdout: string; code: number } => {
    calls.push({ hookFile, input });
    return { stdout, code };
  };
  return { fn, calls };
}

describe("parseKimiEnvelope — parse-don't-validate", () => {
  test("parses a JSON object into an envelope", () => {
    expect(parseKimiEnvelope('{"hook_event_name":"Stop"}')).toEqual({ hook_event_name: "Stop" });
  });
  test("returns null for empty / non-JSON / array / primitive", () => {
    expect(parseKimiEnvelope("")).toBeNull();
    expect(parseKimiEnvelope("not json")).toBeNull();
    expect(parseKimiEnvelope("[1,2]")).toBeNull();
    expect(parseKimiEnvelope("42")).toBeNull();
    expect(parseKimiEnvelope("null")).toBeNull();
  });
  test("every shipped fixture parses", () => {
    for (const name of [
      "session-start",
      "session-end",
      "user-prompt-submit",
      "post-tool-use-bash",
      "post-tool-use-write",
      "post-tool-use-edit",
      "post-tool-use-todo-list",
      "post-tool-use-ask-user-question",
      "pre-compact",
      "subagent-start",
      "subagent-stop",
      "stop",
    ]) {
      expect(parseKimiEnvelope(fixture(name))).not.toBeNull();
    }
  });
});

describe("normalizePayload + routeTarget — fixture-driven 正常写像", () => {
  test("SessionStart capture → session-start {source, session_id}, translate session-start", () => {
    const calls = routeTarget("session-start", fixtureEnv("session-start"));
    // session-start core hook first, then the U4 auto-compose hook (translate
    // "none" so its empty stdout is dropped and does not touch the context relay).
    expect(calls).toHaveLength(2);
    expect(calls[0].hookPath).toBe("amadeus-session-start.ts");
    expect(calls[0].translate).toBe("session-start");
    expect(calls[1].hookPath).toBe("amadeus-plugin-compose.ts");
    expect(calls[1].translate).toBe("none");
    expect(JSON.parse(calls[0].stdin)).toEqual({
      hook_event_name: "SessionStart",
      source: "startup",
      session_id: "session_d1ae88d0-ccfd-4244-b470-b30b0d7d8f56",
    });
  });

  test("session-start omits session_id when absent and defaults source", () => {
    const stdin = normalizePayload("session-start", {});
    expect(JSON.parse(stdin ?? "null")).toEqual({ hook_event_name: "SessionStart", source: "startup" });
  });

  test("SessionEnd capture → session-end {reason}", () => {
    const calls = routeTarget("session-end", fixtureEnv("session-end"));
    expect(calls).toHaveLength(1);
    expect(calls[0].hookPath).toBe("amadeus-session-end.ts");
    expect(JSON.parse(calls[0].stdin)).toEqual({
      hook_event_name: "SessionEnd",
      reason: "exit",
      session_id: "session_d1ae88d0-ccfd-4244-b470-b30b0d7d8f56",
    });
  });

  test("session-end defaults an absent reason to unknown", () => {
    expect(JSON.parse(normalizePayload("session-end", {}) ?? "null")).toEqual({
      hook_event_name: "SessionEnd",
      reason: "unknown",
    });
  });

  test("UserPromptSubmit capture → mint with the content-block array joined to a string", () => {
    const calls = routeTarget("mint", fixtureEnv("user-prompt-submit"));
    expect(calls[0].hookPath).toBe("amadeus-mint-presence.ts");
    expect(JSON.parse(calls[0].stdin)).toEqual({
      hook_event_name: "UserPromptSubmit",
      prompt: "Reply with exactly one word: ok",
      session_id: "session_d1ae88d0-ccfd-4244-b470-b30b0d7d8f56",
    });
  });

  test("PostToolUse(AskUserQuestion) capture preserves the route purpose payload", () => {
    const calls = routeTarget("mint", fixtureEnv("post-tool-use-ask-user-question"));
    expect(calls[0].hookPath).toBe("amadeus-mint-presence.ts");
    expect(JSON.parse(calls[0].stdin)).toEqual({
      hook_event_name: "PostToolUse",
      session_id: "session_c3c01d5d-0286-4d36-a6e4-ae028b3aabe1",
      tool_name: "AskUserQuestion",
      tool_input: {
        questions: [
          {
            options: [{ label: "red" }, { label: "blue" }],
            question: "Pick red or blue?",
          },
        ],
      },
    });
  });

  test("PostToolUse(Write) capture → audit THEN sensors, path renamed to file_path", () => {
    const calls = routeTarget("audit-and-sensors", fixtureEnv("post-tool-use-write"));
    expect(calls.map((c) => c.hookPath)).toEqual(["amadeus-audit-logger.ts", "amadeus-sensor-fire.ts"]);
    expect(JSON.parse(calls[0].stdin)).toEqual({
      hook_event_name: "PostToolUse",
      tool_name: "Write",
      tool_input: { file_path: "probe-target.txt" },
    });
  });

  test("PostToolUse(Edit) capture → file_path from tool_input.path", () => {
    const calls = routeTarget("audit-and-sensors", fixtureEnv("post-tool-use-edit"));
    expect(JSON.parse(calls[0].stdin)).toEqual({
      hook_event_name: "PostToolUse",
      tool_name: "Edit",
      tool_input: { file_path: "edit-target.txt" },
    });
  });

  test("PostToolUse(TodoList) capture → state-sync maps the in_progress todo to TaskUpdate shape", () => {
    const calls = routeTarget("state-sync", fixtureEnv("post-tool-use-todo-list"));
    expect(calls).toHaveLength(1);
    expect(calls[0].hookPath).toBe("amadeus-sync-statusline.ts");
    expect(JSON.parse(calls[0].stdin)).toEqual({
      hook_event_name: "PostToolUse",
      tool_name: "TaskUpdate",
      tool_input: { status: "in_progress", activeForm: "second task" },
    });
  });

  test("state-sync with no in_progress todo → no core call", () => {
    const env: KimiEnvelope = {
      hook_event_name: "PostToolUse",
      tool_name: "TodoList",
      tool_input: { todos: [{ status: "pending", title: "only pending" }] },
    };
    expect(routeTarget("state-sync", env)).toEqual([]);
  });

  test("PostToolUse(Bash) capture → runtime-compile {Bash, command, session_id}", () => {
    const calls = routeTarget("runtime-compile", fixtureEnv("post-tool-use-bash"));
    expect(calls[0].hookPath).toBe("amadeus-runtime-compile.ts");
    expect(JSON.parse(calls[0].stdin)).toEqual({
      hook_event_name: "PostToolUse",
      tool_name: "Bash",
      tool_input: { command: "echo hello-from-kimi" },
      session_id: "session_7f4dffb9-0d84-44e6-b6fc-8528094a44d9",
    });
  });

  test("PreCompact capture → validate-state {} (core hook reads no stdin fields)", () => {
    const calls = routeTarget("validate-state", fixtureEnv("pre-compact"));
    expect(calls).toEqual([{ hookPath: "amadeus-validate-state.ts", stdin: "{}", translate: "none" }]);
  });

  test("SubagentStop 0.29.0 contract → role mapping without a session identity", () => {
    const calls = routeTarget("log-subagent", fixtureEnv("subagent-stop"));
    expect(calls).toHaveLength(1);
    expect(calls[0].hookPath).toBe("amadeus-log-subagent.ts");
    expect(JSON.parse(calls[0].stdin)).toEqual({
      hook_event_name: "SubagentStop",
      agent_type: "explore",
      agent_id: "",
    });
  });

  test("SubagentStart → the started hook, carrying agent name and prompt (U4)", () => {
    // Kimi is the one harness with a real subagent-start event, and its
    // payload carries the prompt — so it is also the one harness that can
    // supply Purpose from a dedicated start seam rather than a tool envelope.
    const calls = routeTarget("role-start", fixtureEnv("subagent-start"));
    expect(calls).toHaveLength(1);
    expect(calls[0].hookPath).toBe("amadeus-log-subagent-start.ts");
    expect(JSON.parse(calls[0].stdin)).toEqual({
      hook_event_name: "SubagentStart",
      agent_type: "explore",
      prompt: "Reply with the single word hi.",
    });
    // No tool_name: this seam fires only for subagents, so the core hook's
    // dispatch-tool guard must not decline it.
    expect(calls[0].stdin).not.toContain("tool_name");
  });

  test("Stop routing requires an explicit trusted-main decision", () => {
    const stop = fixtureEnv("stop");
    expect(stop.session_id).toBe(
      "session_d1ae88d0-ccfd-4244-b470-b30b0d7d8f56",
    );
    expect(stop.agent_name).toBeUndefined();
    expect(routeTarget("stop", fixtureEnv("stop"))).toEqual([]);
    expect(routeTarget("stop", fixtureEnv("stop"), true)).toEqual([
      {
        hookPath: "amadeus-stop.ts",
        stdin: JSON.stringify({
          hook_event_name: "Stop",
          session_id: "session_d1ae88d0-ccfd-4244-b470-b30b0d7d8f56",
          cwd: "/private/tmp/kimi-hook-capture/cwd-a",
          stop_hook_active: false,
        }),
        translate: "stop",
      },
    ]);
  });

  test("unknown target → fail-open empty call list", () => {
    expect(routeTarget("bogus-target", fixtureEnv("stop"))).toEqual([]);
    expect(normalizePayload("bogus-target", {})).toBeNull();
  });

  test("unknown Kimi fields are dropped, never forwarded", () => {
    // The captures carry tool_call_id + tool_output (PostToolUse), token_count
    // + trigger (PreCompact), response (SubagentStop) — none may reach a core
    // hook (security-design: parse-only, unknown fields dropped).
    for (const [target, name] of [
      ["runtime-compile", "post-tool-use-bash"],
      ["audit-and-sensors", "post-tool-use-write"],
      ["log-subagent", "subagent-stop"],
    ] as const) {
      for (const call of routeTarget(target, fixtureEnv(name))) {
        expect(call.stdin).not.toContain("tool_call_id");
        expect(call.stdin).not.toContain("tool_output");
        expect(call.stdin).not.toContain("response");
        expect(call.stdin).not.toContain("token_count");
      }
    }
  });
});

describe("translateSessionStartOutput — observation-only on Kimi 0.28.1", () => {
  test("core context output is ALWAYS dropped (probed: no format reaches the model)", () => {
    expect(translateSessionStartOutput('{"additionalContext":"CTX"}')).toBe("");
    expect(translateSessionStartOutput("anything")).toBe("");
  });
});

describe("runAdapter — end-to-end with the spawn spy", () => {
  test("正常写像: Write capture → exit 0, audit+sensors piped in order", () => {
    const spy = spySpawn();
    const res = runAdapter("audit-and-sensors", fixture("post-tool-use-write"), "/proj", spy.fn);
    expect(res.exitCode).toBe(0);
    expect(res.stderr).toBe("");
    expect(spy.calls.map((c) => c.hookFile)).toEqual(["amadeus-audit-logger.ts", "amadeus-sensor-fire.ts"]);
    expect(JSON.parse(spy.calls[0].input).tool_input.file_path).toBe("probe-target.txt");
  });

  test("不正 stdin: unparseable → exit 0 (fail-open), diagnostic on stderr, no spawn", () => {
    const spy = spySpawn();
    const res = runAdapter("mint", "}{ not json", "/proj", spy.fn);
    expect(res.exitCode).toBe(0);
    expect(res.stderr).toContain("unparseable stdin");
    expect(spy.calls).toHaveLength(0);
  });

  test("unknown target → exit 0, no spawn", () => {
    const spy = spySpawn();
    const res = runAdapter("bogus-target", fixture("stop"), "/proj", spy.fn);
    expect(res.exitCode).toBe(0);
    expect(spy.calls).toHaveLength(0);
  });

  test("stop: a host-stamped main session receives the core forwarding decision", () => {
    const root = mkdtempSync(join(tmpdir(), "amadeus-kimi-main-stop-"));
    try {
      const sessionsDir = join(root, "amadeus", ".amadeus-sessions");
      mkdirSync(sessionsDir, { recursive: true });
      writeFileSync(
        join(sessionsDir, ".current-session"),
        "session_d1ae88d0-ccfd-4244-b470-b30b0d7d8f56\n",
      );
      runAdapter(
        "session-start",
        JSON.stringify({
          hook_event_name: "SessionStart",
          session_id: "session_d1ae88d0-ccfd-4244-b470-b30b0d7d8f56",
          cwd: root,
          source: "startup",
        }),
        root,
        () => ({ stdout: "", code: 0 }),
      );
      const payload = JSON.parse(fixture("stop"));
      payload.cwd = root;
      const spy = spySpawn('{"decision":"block","reason":"continue"}');
      const result = runAdapter("stop", JSON.stringify(payload), root, spy.fn);
      expect(result).toEqual({
        stdout: '{"decision":"block","reason":"continue"}',
        exitCode: 0,
        stderr: "",
      });
      expect(spy.calls.map((call) => call.hookFile)).toEqual(["amadeus-stop.ts"]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("stop: an unknown/reviewer caller remains a silent no-op", () => {
    const payload = JSON.stringify({
      hook_event_name: "Stop",
      session_id: "",
      cwd: "/proj",
      agent_name: "amadeus-architecture-reviewer-agent",
      stop_hook_active: false,
    });
    const spy = spySpawn('{"decision":"block","reason":"must not run"}');
    const result = runAdapter("stop", payload, "/proj", spy.fn);
    expect(result).toEqual({ stdout: "", exitCode: 0, stderr: "" });
    expect(spy.calls).toEqual([]);
  });

  test("session-start: core context JSON is dropped (observation-only), exit 0", () => {
    const spy = spySpawn('{"additionalContext":"CTX"}');
    const res = runAdapter("session-start", fixture("session-start"), "/proj", spy.fn);
    expect(res.exitCode).toBe(0);
    expect(res.stdout).toBe("");
    // session-start core hook + the U4 auto-compose hook both fire.
    expect(spy.calls).toHaveLength(2);
  });

  test("advisory targets never forward stdout even when core prints", () => {
    const spy = spySpawn("SHOULD-NOT-LEAK");
    const res = runAdapter("mint", fixture("user-prompt-submit"), "/proj", spy.fn);
    expect(res.exitCode).toBe(0);
    expect(res.stdout).toBe("");
  });

  test("core hook missing (spawn throws) → fail-open exit 0", () => {
    const res = runAdapter(
      "audit-and-sensors",
      fixture("post-tool-use-edit"),
      "/proj",
      () => {
        throw new Error("ENOENT: no such file");
      },
    );
    expect(res.exitCode).toBe(0);
  });

  test("routeTarget throwing (malformed non-array todos) → outer catch fail-open exit 0", () => {
    const raw = JSON.stringify({ hook_event_name: "PostToolUse", tool_name: "TodoList", tool_input: { todos: { status: "in_progress" } } }); // non-array todos makes .find() throw before spawn's own try
    const spy = spySpawn();
    const res = runAdapter("state-sync", raw, "/proj", spy.fn);
    expect(res).toEqual({ stdout: "", exitCode: 0, stderr: "" });
    expect(spy.calls.length).toBe(0); // routeTarget never returned a call list
  });

  test("the payload cwd wins as the core hook's project dir", () => {
    const spy = spySpawn();
    const dirs: string[] = [];
    const res = runAdapter("session-end", fixture("session-end"), "/fallback", (f, i, dir) => {
      dirs.push(dir);
      return spy.fn(f, i);
    });
    expect(res.exitCode).toBe(0);
    expect(dirs).toEqual(["/private/tmp/kimi-hook-capture/cwd-a"]);
  });
});

describe("runCli — argv/stdin seam", () => {
  test("reads stdin via the injected reader and dispatches by argv[2]", async () => {
    // No spawn injected → runAdapter uses defaultSpawn against the source tree
    // (no core hook beside the shim), so the child exits non-zero; the shim
    // still fails open with exit 0.
    const res = await runCli(["bun", "adapter.ts", "session-end"], async () => fixture("session-end"));
    expect(res.exitCode).toBe(0);
  });

  test("a stdin read failure is swallowed → fail-open exit 0", async () => {
    const res = await runCli(["bun", "adapter.ts", "mint"], async () => {
      throw new Error("stdin blew up");
    });
    expect(res.exitCode).toBe(0);
  });
});

describe("defaultSpawn — real Bun.spawnSync wiring", () => {
  test("spawns the sibling adapter as a no-op child and returns exit 0", () => {
    // The adapter file lives beside itself in HOOKS_DIR; running it with an
    // unknown target + empty envelope hits the fail-open path → exit 0. This
    // covers the real spawn seam without depending on a core hook being
    // present in the source tree.
    const r = defaultSpawn("amadeus-kimi-adapter.ts", "{}", process.cwd());
    expect(r.code).toBe(0);
    expect(typeof r.stdout).toBe("string");
  });
});

describe("kimi manifest — the distribution row", () => {
  test("carries the Kimi adapter and logic lib in harnessFiles", () => {
    const files = manifest.harnessFiles.map((f) => `${f.src}->${f.dst}`);
    expect(files).toContain("hooks/amadeus-kimi-adapter.ts->hooks/amadeus-kimi-adapter.ts");
    expect(files).toContain("hooks/amadeus-kimi-lib.ts->hooks/amadeus-kimi-lib.ts");
  });

  test("exempts the authored Kimi hook files from the orphan scan", () => {
    expect(manifest.authoredExempt).toHaveLength(1);
    expect(manifest.authoredExempt[0].test("hooks/amadeus-kimi-adapter.ts")).toBe(true);
    expect(manifest.authoredExempt[0].test("hooks/amadeus-kimi-lib.ts")).toBe(true);
    expect(manifest.authoredExempt[0].test("hooks/amadeus-audit-logger.ts")).toBe(false);
  });

  test("projects a read-only Kimi tool allowlist only onto dispatched reviewers", () => {
    expect(manifest.frontmatterAdditions).toEqual([
      {
        file: "agents/amadeus-product-lead-agent.md",
        lines: ["tools: [Read, Grep, Glob]"],
      },
      {
        file: "agents/amadeus-architecture-reviewer-agent.md",
        lines: ["tools: [Read, Grep, Glob]"],
      },
    ]);
    const restricted = new Set(
      manifest.frontmatterAdditions?.map(({ file }) => file),
    );
    expect(restricted.has("agents/amadeus-developer-agent.md")).toBe(false);
    expect(restricted.has("agents/amadeus-architect-agent.md")).toBe(false);
    expect(restricted.has("agents/amadeus-composer-agent.md")).toBe(false);
  });
});
