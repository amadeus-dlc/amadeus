// t240 — U4 election-transport real-spawn/real-FS tests (Bolt 3).
// Layer: integration (writes fake send.sh scripts to a tmp dir and runs the
// real Bun.spawnSync path; probes viewPath existence — fs-tests-integration-first).
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  buildShortNotification,
  createAgmsgTransport,
  createSubagentTransport,
  distribute,
  reportDelivery,
} from "../../packages/framework/core/tools/amadeus-election-transport";

let dir = "";
let viewPath = "";
const AT = "2026-07-19T00:00:00Z";
const now = () => AT;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "t240-transport-"));
  viewPath = join(dir, "view.json");
  writeFileSync(viewPath, "{}", "utf8");
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
  delete process.env.T240_MARKER;
});

// Writes an executable fake send.sh. `body` is a bash body appended after the
// argv/marker capture; it controls the exit code.
function fakeSend(name: string, tail: string): string {
  const path = join(dir, name);
  const argfile = join(dir, `${name}.args`);
  writeFileSync(
    path,
    `#!/usr/bin/env bash
printf '%s\\n' "$@" > '${argfile}'
printf 'MARKER=%s\\n' "\${T240_MARKER:-unset}" >> '${argfile}'
${tail}
`,
    "utf8",
  );
  chmodSync(path, 0o755);
  return path;
}

function agmsg(sendScriptPath: string, voters: string[]) {
  return createAgmsgTransport({
    sendScriptPath,
    team: "amadeus",
    from: "leader",
    voters: new Set(voters),
    now,
  });
}

describe("BR-T2 — DeliveryRecord is minted only from a completed send", () => {
  test("exit 0 → delivered with a spawn-exit record", () => {
    const t = agmsg(fakeSend("pass.sh", "exit 0"), ["alice"]);
    const res = t.notify("alice", buildShortNotification("E-T2", viewPath));
    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error("expected ok");
    if (res.value.kind !== "delivered") throw new Error("expected delivered");
    const record = res.value.record;
    expect(record.voter).toBe("alice");
    expect(record.at).toBe(AT);
    expect(record.transport).toBe("agmsg");
    expect(record.provenance).toBe("spawn-exit");
    expect(Object.keys(record).sort()).toEqual(["at", "provenance", "transport", "voter"]);
  });

  test("exit 1 → send-failed error and no record", () => {
    const t = agmsg(fakeSend("fail.sh", "exit 1"), ["alice"]);
    const res = t.notify("alice", buildShortNotification("E-T2", viewPath));
    expect(res).toEqual({ ok: false, error: "send-failed" });
  });
});

describe("BR-T3 — spawn uses array argv and explicit env: process.env", () => {
  test("positional args reach send.sh and a runtime-set env var propagates", () => {
    // Set AFTER process start: only reaches the child if env: process.env is
    // passed explicitly (bun-spawn-env-snapshot).
    process.env.T240_MARKER = "propagated";
    const scriptPath = fakeSend("args.sh", "exit 0");
    const t = agmsg(scriptPath, ["alice"]);
    const res = t.notify("alice", buildShortNotification("E-T3", viewPath));
    expect(res.ok).toBe(true);
    const captured = readFileSync(join(dir, "args.sh.args"), "utf8");
    const lines = captured.split("\n");
    // argv[0..3] = team, from, to, body (array argv — no shell splitting)
    expect(lines[0]).toBe("amadeus");
    expect(lines[1]).toBe("leader");
    expect(lines[2]).toBe("alice");
    expect(lines[3]).toContain("E-T3");
    expect(lines[3]).toContain(viewPath);
    expect(captured).toContain("MARKER=propagated");
  });
});

describe("BR-T4 — both transports' record schema match bar transport+provenance", () => {
  test("agmsg record vs subagent record deep-equal on the remaining fields", () => {
    const t = agmsg(fakeSend("pass.sh", "exit 0"), ["alice"]);
    const res = t.notify("alice", buildShortNotification("E-T4", viewPath));
    if (!res.ok || res.value.kind !== "delivered") throw new Error("expected delivered");
    const agmsgRecord = res.value.record;
    const subagentRecord = reportDelivery("alice", AT);
    const strip = (r: { voter: string; at: string }) => ({ voter: r.voter, at: r.at });
    expect(strip(agmsgRecord)).toEqual(strip(subagentRecord));
    // The two differing fields are exactly transport + provenance.
    expect(agmsgRecord.transport).toBe("agmsg");
    expect(agmsgRecord.provenance).toBe("spawn-exit");
    expect(subagentRecord.transport).toBe("subagent");
    expect(subagentRecord.provenance).toBe("reported-by-conductor");
  });
});

describe("BR-T5 — partial send: per-voter records over a mixed exit", () => {
  test("k of N delivered, the rest send-failed, each recorded voter-by-voter", () => {
    // Fake fails only for "bob" (by the `to` positional arg = argv[2]).
    const script = fakeSend("mixed.sh", 'if [ "$3" = "bob" ]; then exit 1; fi\nexit 0');
    const t = agmsg(script, ["alice", "bob", "carol"]);
    const results = distribute(t, "E-T5", ["alice", "bob", "carol"], () => viewPath);
    expect(results.map((r) => r.voter)).toEqual(["alice", "bob", "carol"]);
    expect(results[0].result.ok).toBe(true);
    expect(results[1].result).toEqual({ ok: false, error: "send-failed" });
    expect(results[2].result.ok).toBe(true);
    // The delivered entries carry a record; the failed one does not.
    const delivered = results.filter((r) => r.result.ok);
    expect(delivered).toHaveLength(2);
  });
});

describe("view-missing and voter-unknown reachability", () => {
  test("agmsg: unknown voter is rejected before any spawn", () => {
    const t = agmsg(fakeSend("pass.sh", "exit 0"), ["alice"]);
    const res = t.notify("stranger", buildShortNotification("E-T6", viewPath));
    expect(res).toEqual({ ok: false, error: "voter-unknown" });
  });

  test("agmsg: a nonexistent viewPath yields view-missing (not send-failed)", () => {
    const t = agmsg(fakeSend("pass.sh", "exit 0"), ["alice"]);
    const res = t.notify("alice", buildShortNotification("E-T6", join(dir, "absent.json")));
    expect(res).toEqual({ ok: false, error: "view-missing" });
  });

  test("subagent: unknown voter and missing view are both reachable", () => {
    const t = createSubagentTransport({ voters: new Set(["alice"]) });
    expect(t.notify("stranger", buildShortNotification("E-T6", viewPath))).toEqual({
      ok: false,
      error: "voter-unknown",
    });
    expect(t.notify("alice", buildShortNotification("E-T6", join(dir, "absent.json")))).toEqual({
      ok: false,
      error: "view-missing",
    });
  });
});

describe("SubagentTransport — directive only, no record, no spawn", () => {
  test("happy path returns a directive and never a record", () => {
    const t = createSubagentTransport({ voters: new Set(["alice"]) });
    const res = t.notify("alice", buildShortNotification("E-T7", viewPath));
    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error("expected ok");
    expect(res.value.kind).toBe("directive");
    if (res.value.kind !== "directive") throw new Error("expected directive");
    expect(res.value.directive.voter).toBe("alice");
    expect(res.value.directive.viewPath).toBe(viewPath);
    expect(Object.keys(res.value).sort()).toEqual(["directive", "kind"]);
  });
});
