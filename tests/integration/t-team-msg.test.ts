// size: large
import { afterEach, describe, expect, test } from "bun:test";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "../..");
const TEAM_MSG = join(ROOT, "scripts/team-msg.sh");
const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

// A fake herdr binary whose behavior is tuned by env:
//   FAIL_WAIT=<name>   `agent wait <name>` exits 1 (a turn-completion timeout)
//   FAIL_SEND=<name>   `agent send <name>` exits 7 (an uncertain delivery)
//   HERDR_ACTION_LOG   the send target and send-keys are logged here (one line
//                      each) so ordering is observable
//   HERDR_SEND_BODY    the full (possibly multiline) send text is written here
// `agent list` returns leader + engineer-1 with deliberately reordered fields to
// prove the pane lookup is order-insensitive.
function fakeHerdr(dir: string) {
  const herdr = join(dir, "herdr");
  writeFileSync(
    herdr,
    `#!/usr/bin/env bash
set -eu
verb="\${1:-} \${2:-}"
case "$verb" in
  "agent list")
    printf '%s' '{"result":{"agents":[{"agent_session":{"value":"a"},"name":"engineer-1","pane_id":"w1:p1","workspace_id":"w1"},{"agent_session":{"value":"b"},"pane_id":"w1:p2","name":"leader","workspace_id":"w1"}]}}'
    ;;
  "agent wait")
    [ "\${FAIL_WAIT:-}" = "\${3:-}" ] && exit 1
    exit 0 ;;
  "agent send")
    [ "\${FAIL_SEND:-}" = "\${3:-}" ] && exit 7
    [ -n "\${HERDR_ACTION_LOG:-}" ] && printf 'SEND %s\\n' "\${3:-}" >>"\$HERDR_ACTION_LOG"
    [ -n "\${HERDR_SEND_BODY:-}" ] && printf '%s' "\${4:-}" >"\$HERDR_SEND_BODY"
    exit 0 ;;
  "pane send-keys")
    [ -n "\${HERDR_ACTION_LOG:-}" ] && printf 'KEY %s %s\\n' "\${3:-}" "\${4:-}" >>"\$HERDR_ACTION_LOG"
    exit 0 ;;
  "agent read")
    printf 'history for %s\\n' "\${3:-}" ;;
  *) echo "unexpected herdr verb: $verb" >&2; exit 2 ;;
esac
`,
  );
  chmodSync(herdr, 0o755);
  return herdr;
}

function run(args: string[], env: Record<string, string>) {
  return Bun.spawnSync({
    cmd: ["bash", TEAM_MSG, ...args],
    env: { ...process.env, ...env },
    stderr: "pipe",
    stdout: "pipe",
  });
}

describe("team-msg backend resolution", () => {
  test("an unknown backend is rejected fail-closed", () => {
    const result = run(["send", "e1", "hi"], { TEAM_MSG: "bogus" });
    expect(result.exitCode).toBe(1);
    expect(result.stderr.toString()).toContain("unknown msg backend: bogus (agmsg|herdr)");
  });

  test("no verb prints usage and fails", () => {
    const result = run([], { TEAM_MSG: "agmsg" });
    expect(result.exitCode).toBe(1);
    expect(result.stderr.toString()).toContain("Usage:");
  });

  test("an unknown verb is rejected", () => {
    const result = run(["frobnicate", "e1"], { TEAM_MSG: "agmsg" });
    expect(result.exitCode).toBe(1);
    expect(result.stderr.toString()).toContain("unknown verb: frobnicate (send|read)");
  });

  test("send requires a role and text", () => {
    const result = run(["send", "e1"], { TEAM_MSG: "agmsg" });
    expect(result.exitCode).toBe(1);
    expect(result.stderr.toString()).toContain("send requires exactly");
  });
});

describe("team-msg agmsg backend", () => {
  test("send delegates to agmsg send.sh with team, from, to and body", () => {
    const dir = mkdtempSync(join(tmpdir(), "amadeus-team-msg-"));
    tempDirs.push(dir);
    const sendLog = join(dir, "send.log");
    const send = join(dir, "send.sh");
    writeFileSync(send, `#!/usr/bin/env bash\nprintf '%s|%s|%s|%s\\n' "$1" "$2" "$3" "$4" >"${sendLog}"\n`);
    chmodSync(send, 0o755);

    const result = run(["send", "e1", "ping"], {
      TEAM_MSG: "agmsg",
      AGMSG_SEND: send,
      AGMSG_TEAM: "amadeus",
      TEAM_MSG_FROM: "e2",
    });
    expect(result.exitCode, result.stderr.toString()).toBe(0);
    // agmsg carries the sender in its own metadata, so the body is delivered
    // verbatim with NO machine header (that is a herdr-only transport frame).
    const delivered = readFileSync(sendLog, "utf8").trim();
    expect(delivered).toBe("amadeus|e2|e1|ping");
    expect(delivered).not.toContain("via:herdr machine");
  });

  test("read delegates to agmsg history.sh with team and role", () => {
    const dir = mkdtempSync(join(tmpdir(), "amadeus-team-msg-"));
    tempDirs.push(dir);
    const history = join(dir, "history.sh");
    writeFileSync(history, `#!/usr/bin/env bash\nprintf 'HISTORY %s %s\\n' "$1" "$2"\n`);
    chmodSync(history, 0o755);

    const result = run(["read", "leader"], {
      TEAM_MSG: "agmsg",
      AGMSG_HISTORY: history,
      AGMSG_TEAM: "amadeus",
    });
    expect(result.exitCode, result.stderr.toString()).toBe(0);
    expect(result.stdout.toString().trim()).toBe("HISTORY amadeus leader");
  });

  test("send fails loudly when the agmsg send script is missing", () => {
    const result = run(["send", "e1", "hi"], {
      TEAM_MSG: "agmsg",
      AGMSG_SEND: join(tmpdir(), "amadeus-no-such-send.sh"),
    });
    expect(result.exitCode).toBe(1);
    expect(result.stderr.toString()).toContain("missing agmsg send script");
  });
});

describe("team-msg herdr backend", () => {
  test("an idle recipient is sent the text and an Enter, and the delivery is logged", () => {
    const dir = mkdtempSync(join(tmpdir(), "amadeus-team-msg-"));
    tempDirs.push(dir);
    const herdr = fakeHerdr(dir);
    const actionLog = join(dir, "actions.log");
    const sendBody = join(dir, "send-body.txt");
    const msgLog = join(dir, "mlog");

    const result = run(["send", "e1", "hello world"], {
      TEAM_MSG: "herdr",
      HERDR: herdr,
      HERDR_ACTION_LOG: actionLog,
      HERDR_SEND_BODY: sendBody,
      TEAM_MSG_FROM: "leader",
      TEAM_MSG_LOG_DIR: msgLog,
    });
    expect(result.exitCode, result.stderr.toString()).toBe(0);
    // send places the text against the recipient; send-keys submits it against
    // the resolved pane_id, in that order.
    expect(readFileSync(actionLog, "utf8").trim().split("\n")).toEqual([
      "SEND engineer-1",
      "KEY w1:p1 enter",
    ]);
    // The delivered body carries the machine header on its first line, then the
    // original body.
    expect(readFileSync(sendBody, "utf8")).toBe("[team-msg from:leader via:herdr machine]\nhello world");
    // The advisory message log records `<ISO8601Z> <from> -> <to> | <body>`.
    const logged = readFileSync(join(msgLog, "messages.log"), "utf8").trim();
    expect(logged).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z leader -> e1 \| hello world$/);
  });

  test("the machine header is the first line and names the sender role", () => {
    const dir = mkdtempSync(join(tmpdir(), "amadeus-team-msg-"));
    tempDirs.push(dir);
    const herdr = fakeHerdr(dir);
    const sendBody = join(dir, "send-body.txt");

    const result = run(["send", "leader", "multi\nline body"], {
      TEAM_MSG: "herdr",
      HERDR: herdr,
      HERDR_SEND_BODY: sendBody,
      TEAM_MSG_FROM: "e3",
    });
    expect(result.exitCode, result.stderr.toString()).toBe(0);
    const body = readFileSync(sendBody, "utf8");
    const firstLine = body.split("\n")[0];
    // The header is the first line; only from:<role> varies, and it matches the
    // sender's role.
    expect(firstLine).toBe("[team-msg from:e3 via:herdr machine]");
    expect(Buffer.byteLength(firstLine, "utf8")).toBeLessThanOrEqual(256);
    // The original (multiline) body follows the header verbatim.
    expect(body).toBe("[team-msg from:e3 via:herdr machine]\nmulti\nline body");
  });

  test("a wait timeout does not send and returns non-zero", () => {
    const dir = mkdtempSync(join(tmpdir(), "amadeus-team-msg-"));
    tempDirs.push(dir);
    const herdr = fakeHerdr(dir);
    const actionLog = join(dir, "actions.log");

    const result = run(["send", "e1", "hi"], {
      TEAM_MSG: "herdr",
      HERDR: herdr,
      HERDR_ACTION_LOG: actionLog,
      FAIL_WAIT: "engineer-1",
      TEAM_MSG_FROM: "leader",
    });
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr.toString()).toContain("not idle within 60000ms — not sent");
    // Nothing was placed or submitted.
    expect(existsSync(actionLog)).toBe(false);
  });

  test("a non-zero from agent send is propagated transparently", () => {
    const dir = mkdtempSync(join(tmpdir(), "amadeus-team-msg-"));
    tempDirs.push(dir);
    const herdr = fakeHerdr(dir);

    const result = run(["send", "e1", "hi"], {
      TEAM_MSG: "herdr",
      HERDR: herdr,
      FAIL_SEND: "engineer-1",
      TEAM_MSG_FROM: "leader",
    });
    // The uncertain-delivery exit code surfaces rather than being swallowed.
    expect(result.exitCode).toBe(7);
  });

  test("an unknown recipient is rejected", () => {
    const dir = mkdtempSync(join(tmpdir(), "amadeus-team-msg-"));
    tempDirs.push(dir);
    const herdr = fakeHerdr(dir);

    const result = run(["send", "e9", "hi"], {
      TEAM_MSG: "herdr",
      HERDR: herdr,
      TEAM_MSG_FROM: "leader",
    });
    expect(result.exitCode).toBe(1);
    expect(result.stderr.toString()).toContain("no herdr agent named engineer-9");
  });

  test("an unwritable log dir warns but never fails the send", () => {
    const dir = mkdtempSync(join(tmpdir(), "amadeus-team-msg-"));
    tempDirs.push(dir);
    const herdr = fakeHerdr(dir);
    // A regular file where the log dir should be makes mkdir -p fail.
    const blocker = join(dir, "blocker");
    writeFileSync(blocker, "not a dir\n");

    const result = run(["send", "leader", "hi"], {
      TEAM_MSG: "herdr",
      HERDR: herdr,
      TEAM_MSG_FROM: "e1",
      TEAM_MSG_LOG_DIR: join(blocker, "sub"),
    });
    expect(result.exitCode, result.stderr.toString()).toBe(0);
    expect(result.stderr.toString()).toContain("WARN: could not append team message log");
  });

  test("read maps the role to the herdr agent name", () => {
    const dir = mkdtempSync(join(tmpdir(), "amadeus-team-msg-"));
    tempDirs.push(dir);
    const herdr = fakeHerdr(dir);

    const result = run(["read", "e1"], { TEAM_MSG: "herdr", HERDR: herdr });
    expect(result.exitCode, result.stderr.toString()).toBe(0);
    expect(result.stdout.toString().trim()).toBe("history for engineer-1");
  });
});

describe("team-msg send argument arity", () => {
  test("surplus arguments are rejected loudly instead of silently dropped", () => {
    const result = Bun.spawnSync({
      cmd: ["bash", TEAM_MSG, "send", "e3", "hello", "stray-extra-arg"],
      env: { ...process.env, TEAM_MSG: "herdr" },
      stderr: "pipe",
      stdout: "pipe",
    });
    expect(result.exitCode).toBe(1);
    expect(result.stderr.toString()).toContain("send requires exactly");
  });
});
