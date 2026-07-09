// covers: file:tools/amadeus-lib.ts, file:tools/amadeus-state.ts
//
// t112 — delegated-approval provenance (#671). The human-presence gate refuses
// a conductor's approval until a real human acted since the last resolution. In
// an agent-team topology the human is only in the LEADER session, so the fix
// lets a leader record a DELEGATED_APPROVAL into the conductor intent's audit
// dir, GROUNDED in a real HUMAN_TURN on the leader's own ledger. The conductor's
// gate accepts it ONLY after verifying that grounding HUMAN_TURN physically
// exists in the referenced issuer shard.
//
// This is the "落ちる実証" for the security property: a delegation that a model
// could fabricate (references a shard/HUMAN_TURN that is not on disk, points at
// a shard with no HUMAN_TURN, tampers the timestamp, or path-traverses out of
// the intents tree) MUST be rejected — the gate stays shut. Only a delegation
// whose grounding HUMAN_TURN is real opens it. The forgery cases are the
// injected failures: under a naive "accept any DELEGATED_APPROVAL" gate they
// would be false-greens; here they must stay red (refused).
//
// Subject under test (shipped distributable):
//   - dist/claude/.claude/tools/amadeus-lib.ts : verifyDelegatedProvenance,
//       humanActedSinceGate (verb-scoped delegated-provenance branch)
//   - grounded by amadeus-state.ts delegate-approval / delegate-rejection
//       (writers), covered via the same audit blocks they emit.
import { afterAll, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { hostname, tmpdir } from "node:os";
import { join } from "node:path";
import {
  appendAuditEntry,
  handleAppend,
  handleAppendRaw,
  presenceMintRejection,
  rawPresenceMintRejection,
} from "../../dist/claude/.claude/tools/amadeus-audit.ts";
import {
  auditShardName,
  humanActedSinceGate,
  verifyDelegatedProvenance,
} from "../../dist/claude/.claude/tools/amadeus-lib.ts";

const tmpRoots: string[] = [];
afterAll(() => {
  for (const root of tmpRoots) {
    try {
      rmSync(root, { recursive: true, force: true });
    } catch {
      // best-effort cleanup
    }
  }
});

// Two sibling intent records under one workspace: a conductor (the active
// intent, whose gate we probe) and an issuer (the leader intent that holds the
// grounding HUMAN_TURN). Mirrors the on-disk layout after git sync.
function scaffold(): { root: string; conductor: string; issuer: string } {
  const root = mkdtempSync(join(tmpdir(), "amadeus-t112-"));
  tmpRoots.push(root);
  const intents = join(root, "amadeus", "spaces", "default", "intents");
  const conductor = "canonical-settings-abcd1234";
  const issuer = "leader-intent-ef567890";
  for (const rec of [conductor, issuer]) {
    mkdirSync(join(intents, rec), { recursive: true });
    writeFileSync(join(intents, rec, "amadeus-state.md"), "# AI-DLC State\n", "utf-8");
  }
  writeFileSync(join(root, "amadeus", "active-space"), "default\n", "utf-8");
  writeFileSync(join(intents, "active-intent"), `${conductor}\n`, "utf-8");
  return { root, conductor, issuer };
}

// Build a DELEGATED_APPROVAL audit block the way appendAuditEntry serialises one.
function delegationBlock(fields: Record<string, string>): string {
  let b = "## Delegated Approval\n**Timestamp**: 2026-07-09T09:00:00.000Z\n**Event**: DELEGATED_APPROVAL\n";
  for (const [k, v] of Object.entries(fields)) b += `**${k}**: ${v}\n`;
  return `${b}\n---\n`;
}

describe("verifyDelegatedProvenance — grounding proof (#671)", () => {
  test("accepts a delegation grounded in a real HUMAN_TURN in the issuer shard", () => {
    const { root, issuer } = scaffold();
    const ht = appendAuditEntry("HUMAN_TURN", {}, root, issuer);
    const block = delegationBlock({
      Stage: "market-research",
      "Issuer Space": "default",
      "Issuer Intent": issuer,
      "Issuer Shard": auditShardName(root),
      "Issuer Human Ts": ht.timestamp,
    });
    expect(verifyDelegatedProvenance(root, block)).toBe(true);
  });

  test("rejects a delegation referencing a shard that does not exist (forged)", () => {
    const { root, issuer } = scaffold();
    appendAuditEntry("HUMAN_TURN", {}, root, issuer);
    const block = delegationBlock({
      Stage: "market-research",
      "Issuer Space": "default",
      "Issuer Intent": issuer,
      "Issuer Shard": "no-such-shard.md",
      "Issuer Human Ts": "2026-07-09T09:00:00.000Z",
    });
    expect(verifyDelegatedProvenance(root, block)).toBe(false);
  });

  test("rejects when the issuer shard exists but holds no HUMAN_TURN", () => {
    const { root, issuer } = scaffold();
    // A shard with a non-HUMAN_TURN event only.
    const started = appendAuditEntry("STAGE_STARTED", { Stage: "market-research" }, root, issuer);
    const block = delegationBlock({
      Stage: "market-research",
      "Issuer Space": "default",
      "Issuer Intent": issuer,
      "Issuer Shard": auditShardName(root),
      "Issuer Human Ts": started.timestamp,
    });
    expect(verifyDelegatedProvenance(root, block)).toBe(false);
  });

  test("rejects a tampered timestamp that no HUMAN_TURN in the shard matches", () => {
    const { root, issuer } = scaffold();
    appendAuditEntry("HUMAN_TURN", {}, root, issuer);
    const block = delegationBlock({
      Stage: "market-research",
      "Issuer Space": "default",
      "Issuer Intent": issuer,
      "Issuer Shard": auditShardName(root),
      "Issuer Human Ts": "1999-01-01T00:00:00.000Z", // no such HUMAN_TURN
    });
    expect(verifyDelegatedProvenance(root, block)).toBe(false);
  });

  test("rejects path-traversal in the issuer shard / intent fields", () => {
    const { root, issuer } = scaffold();
    appendAuditEntry("HUMAN_TURN", {}, root, issuer);
    const traversalShard = delegationBlock({
      Stage: "market-research",
      "Issuer Space": "default",
      "Issuer Intent": issuer,
      "Issuer Shard": "../../../../etc/hosts",
      "Issuer Human Ts": "2026-07-09T09:00:00.000Z",
    });
    expect(verifyDelegatedProvenance(root, traversalShard)).toBe(false);
    const traversalIntent = delegationBlock({
      Stage: "market-research",
      "Issuer Space": "default",
      "Issuer Intent": "../../../../tmp",
      "Issuer Shard": auditShardName(root),
      "Issuer Human Ts": "2026-07-09T09:00:00.000Z",
    });
    expect(verifyDelegatedProvenance(root, traversalIntent)).toBe(false);
  });

  test("rejects a block missing the issuer fields", () => {
    const { root } = scaffold();
    const block = delegationBlock({ Stage: "market-research" });
    expect(verifyDelegatedProvenance(root, block)).toBe(false);
  });
});

describe("humanActedSinceGate — delegated approval opens the conductor gate (#671)", () => {
  test("a verified delegation after the last resolution counts as a human act", () => {
    const { root, conductor, issuer } = scaffold();
    // A prior resolution on the conductor sets the freshness boundary.
    appendAuditEntry("GATE_APPROVED", { Stage: "intent-capture" }, root, conductor);
    // Leader's real human turn, then the delegation into the conductor dir.
    const ht = appendAuditEntry("HUMAN_TURN", {}, root, issuer);
    appendAuditEntry(
      "DELEGATED_APPROVAL",
      {
        Stage: "market-research",
        "Issuer Space": "default",
        "Issuer Intent": issuer,
        "Issuer Shard": auditShardName(root),
        "Issuer Human Ts": ht.timestamp,
      },
      root,
      conductor,
    );
    expect(humanActedSinceGate(root)).toBe(true);
  });

  test("a forged delegation after the last resolution does NOT open the gate", () => {
    const { root, conductor, issuer } = scaffold();
    appendAuditEntry("GATE_APPROVED", { Stage: "intent-capture" }, root, conductor);
    appendAuditEntry("HUMAN_TURN", {}, root, issuer);
    appendAuditEntry(
      "DELEGATED_APPROVAL",
      {
        Stage: "market-research",
        "Issuer Space": "default",
        "Issuer Intent": issuer,
        "Issuer Shard": "no-such-shard.md", // unverifiable grounding
        "Issuer Human Ts": "2026-07-09T09:00:00.000Z",
      },
      root,
      conductor,
    );
    expect(humanActedSinceGate(root)).toBe(false);
  });
});

// #685 — delegated REJECTION, verb-scoped presence. The reject-side mirror of
// #671: a leader records a DELEGATED_REJECTION into the conductor intent's audit
// dir, grounded in a real HUMAN_TURN on the leader's own ledger, so the
// conductor's REJECT gate can open remotely. The security property is symmetric
// (a fabricated grounding must stay refused) PLUS a verb wall: a DELEGATED_
// APPROVAL must never open a REJECT gate and vice versa (FR-1.4). That verb wall
// is the current mixing bug's regression — before the fix humanActedSinceGate
// counted any verified delegation regardless of verb, so an approval delegation
// falsely opened the reject gate.
describe("humanActedSinceGate — verb-scoped delegated rejection opens the conductor REJECT gate (#685)", () => {
  test("AC-1a: a verified DELEGATED_REJECTION after the last resolution opens the REJECT gate", () => {
    const { root, conductor, issuer } = scaffold();
    appendAuditEntry("GATE_APPROVED", { Stage: "intent-capture" }, root, conductor);
    const ht = appendAuditEntry("HUMAN_TURN", {}, root, issuer);
    appendAuditEntry(
      "DELEGATED_REJECTION",
      {
        Stage: "market-research",
        "Issuer Space": "default",
        "Issuer Intent": issuer,
        "Issuer Shard": auditShardName(root),
        "Issuer Human Ts": ht.timestamp,
        Feedback: "revise the framing",
      },
      root,
      conductor,
    );
    expect(humanActedSinceGate(root, "reject")).toBe(true);
  });

  test("AC-1c: a verified DELEGATED_APPROVAL does NOT open the REJECT gate (no verb mixing)", () => {
    const { root, conductor, issuer } = scaffold();
    appendAuditEntry("GATE_APPROVED", { Stage: "intent-capture" }, root, conductor);
    const ht = appendAuditEntry("HUMAN_TURN", {}, root, issuer);
    appendAuditEntry(
      "DELEGATED_APPROVAL",
      {
        Stage: "market-research",
        "Issuer Space": "default",
        "Issuer Intent": issuer,
        "Issuer Shard": auditShardName(root),
        "Issuer Human Ts": ht.timestamp,
      },
      root,
      conductor,
    );
    // The approval delegation is a real human act for APPROVE, but the reject
    // gate must ignore it entirely — this is the #685 mixing-bug regression.
    expect(humanActedSinceGate(root, "reject")).toBe(false);
  });

  test("AC-1c: a verified DELEGATED_REJECTION does NOT open the APPROVE gate (no verb mixing)", () => {
    const { root, conductor, issuer } = scaffold();
    appendAuditEntry("GATE_APPROVED", { Stage: "intent-capture" }, root, conductor);
    const ht = appendAuditEntry("HUMAN_TURN", {}, root, issuer);
    appendAuditEntry(
      "DELEGATED_REJECTION",
      {
        Stage: "market-research",
        "Issuer Space": "default",
        "Issuer Intent": issuer,
        "Issuer Shard": auditShardName(root),
        "Issuer Human Ts": ht.timestamp,
      },
      root,
      conductor,
    );
    expect(humanActedSinceGate(root, "approve")).toBe(false);
  });

  test("AC-1b: a forged DELEGATED_REJECTION (unverifiable shard) does NOT open the REJECT gate", () => {
    const { root, conductor, issuer } = scaffold();
    appendAuditEntry("GATE_APPROVED", { Stage: "intent-capture" }, root, conductor);
    appendAuditEntry("HUMAN_TURN", {}, root, issuer);
    appendAuditEntry(
      "DELEGATED_REJECTION",
      {
        Stage: "market-research",
        "Issuer Space": "default",
        "Issuer Intent": issuer,
        "Issuer Shard": "no-such-shard.md", // unverifiable grounding
        "Issuer Human Ts": "2026-07-09T09:00:00.000Z",
      },
      root,
      conductor,
    );
    expect(humanActedSinceGate(root, "reject")).toBe(false);
  });
});

// #685 — the delegate-rejection WRITER command (FR-1.2). The issuance is gated on
// a REAL human turn in the leader's own shard: a model cannot fabricate a
// rejection delegation because HUMAN_TURN lines are written only by the
// UserPromptSubmit hook. Exercised at the PROCESS boundary against the shipped
// dist tool (spawnSync), the same subject the conductor's gate later verifies.
describe("delegate-rejection writer — grounded issuance gate (#685)", () => {
  const REPO_ROOT = join(import.meta.dir, "..", "..");
  const STATE = join(REPO_ROOT, "dist", "claude", ".claude", "tools", "amadeus-state.ts");
  const BUN = process.execPath;
  // Pinned clone token: the writer subprocess reads this from `.amadeus-clone-id`
  // and resolves its shard as `<host>-<token>.md`, so the direct-write fixture
  // below lands the HUMAN_TURN in the SAME shard the delegate-rejection path reads
  // for issuerHumanTs.
  const CLONE_TOKEN = "t112rejclone";

  // Env with the human-presence guard ENABLED (clear the suite-wide bypass
  // run-tests.ts sets) so the grounding gate is live, not bypassed.
  function guardedEnv(): NodeJS.ProcessEnv {
    const env = { ...process.env };
    delete env.AMADEUS_SKIP_HUMAN_PRESENCE_GUARD;
    return env;
  }

  function runDelegateRejection(root: string, toIntent: string): { rc: number; out: string; err: string } {
    const r = spawnSync(
      BUN,
      [STATE, "delegate-rejection", "market-research", "--to-intent", toIntent, "--project-dir", root],
      { encoding: "utf-8", env: guardedEnv() },
    );
    return { rc: r.status ?? -1, out: r.stdout ?? "", err: r.stderr ?? "" };
  }

  // The shard leaf the tool resolves for CLONE_TOKEN — mirrors auditShardName's
  // host normalisation in amadeus-lib.ts.
  function shardLeaf(): string {
    const host =
      hostname().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) || "host";
    return `${host}-${CLONE_TOKEN}.md`;
  }

  // Seed a real HUMAN_TURN by writing the issuer shard file DIRECTLY. This is a
  // TEST FIXTURE, not the production path: it deliberately does NOT go through the
  // audit CLI (now refused for HUMAN_TURN — #685 review) nor the in-process writer
  // (whose cached clone id would not match the subprocess's). Pinning the clone
  // token and reproducing appendAuditEntryUnlocked's block shape makes the writer
  // subprocess resolve and read exactly this shard. Because the fixture bypasses
  // the production writer, it does not undermine the "hook/state-tool only" trust
  // premise the guard establishes.
  function seedHumanTurnDirect(root: string, issuer: string): void {
    writeFileSync(join(root, "amadeus", ".amadeus-clone-id"), `${CLONE_TOKEN}\n`, "utf-8");
    const auditDir = join(root, "amadeus", "spaces", "default", "intents", issuer, "audit");
    mkdirSync(auditDir, { recursive: true });
    const block =
      "## Human Turn\n**Timestamp**: 2026-07-09T09:00:00.000Z\n**Event**: HUMAN_TURN\n\n---\n";
    writeFileSync(join(auditDir, shardLeaf()), `# AI-DLC Audit Log\n\n${block}`, "utf-8");
  }

  // Point the leader's active intent at the issuer record (the session that
  // holds — or lacks — the grounding HUMAN_TURN).
  function makeIssuerActive(root: string, issuer: string): void {
    writeFileSync(join(root, "amadeus", "spaces", "default", "intents", "active-intent"), `${issuer}\n`, "utf-8");
  }

  test("refuses to issue when this session's shard holds no HUMAN_TURN", () => {
    const { root, conductor, issuer } = scaffold();
    makeIssuerActive(root, issuer);
    const r = runDelegateRejection(root, conductor);
    expect(r.rc).not.toBe(0);
    expect(r.err).toContain("no HUMAN_TURN in this session's own audit shard");
  });

  test("issues a DELEGATED_REJECTION into the target when grounded in a real HUMAN_TURN", () => {
    const { root, conductor, issuer } = scaffold();
    makeIssuerActive(root, issuer);
    seedHumanTurnDirect(root, issuer); // a real human prompt on the leader (direct fixture)
    const r = runDelegateRejection(root, conductor);
    expect(r.rc).toBe(0);
    expect(r.out).toContain('"delegated":true');
    expect(r.out).toContain('"verb":"reject"');
  });
});

// #685 review — the general audit CLI must NOT mint presence/provenance events.
// Before this guard, `amadeus-audit append HUMAN_TURN` succeeded, so a model could
// fabricate the very presence token verifyDelegatedProvenance trusts. These are
// the 落ちる実証 at the PROCESS boundary: each protected event (and an append-raw
// smuggling attempt) must be REFUSED with a non-zero exit, while an ordinary
// event still appends.
describe("audit CLI presence/provenance minting guard (#685 review)", () => {
  const REPO_ROOT = join(import.meta.dir, "..", "..");
  const AUDIT = join(REPO_ROOT, "dist", "claude", ".claude", "tools", "amadeus-audit.ts");
  const BUN = process.execPath;

  function runAudit(root: string, args: string[]): { rc: number; out: string; err: string } {
    const r = spawnSync(BUN, [AUDIT, ...args, "--project-dir", root], { encoding: "utf-8" });
    return { rc: r.status ?? -1, out: r.stdout ?? "", err: r.stderr ?? "" };
  }

  for (const ev of ["HUMAN_TURN", "DELEGATED_APPROVAL", "DELEGATED_REJECTION"]) {
    test(`append ${ev} is refused with a non-zero exit`, () => {
      const { root } = scaffold();
      const r = runAudit(root, ["append", ev]);
      expect(r.rc).not.toBe(0);
      expect(`${r.out}${r.err}`).toContain("presence/provenance");
    });
  }

  test("append-raw carrying a **Event**: HUMAN_TURN line in the body is refused", () => {
    const { root } = scaffold();
    const r = runAudit(root, ["append-raw", "Custom Event", "**Event**: HUMAN_TURN\\n**Details**: forged"]);
    expect(r.rc).not.toBe(0);
    expect(`${r.out}${r.err}`).toContain("presence/provenance");
  });

  test("append-raw with a protected heading is refused", () => {
    const { root } = scaffold();
    const r = runAudit(root, ["append-raw", "Human Turn", "**Details**: forged"]);
    expect(r.rc).not.toBe(0);
    expect(`${r.out}${r.err}`).toContain("presence/provenance");
  });

  test("an ordinary event still appends via the CLI (guard is not over-broad)", () => {
    const { root } = scaffold();
    const r = runAudit(root, ["append", "STAGE_STARTED", "--field", "Stage=market-research"]);
    expect(r.rc).toBe(0);
  });

  // In-process assertions on the guard predicates themselves (the CLI entry only
  // forwards their result to jsonError). These exercise both branches directly.
  test("presenceMintRejection rejects every protected event and passes ordinary ones", () => {
    for (const ev of ["HUMAN_TURN", "DELEGATED_APPROVAL", "DELEGATED_REJECTION"]) {
      expect(presenceMintRejection(ev)).toContain("presence/provenance");
    }
    expect(presenceMintRejection("STAGE_STARTED")).toBeNull();
    expect(presenceMintRejection("GATE_APPROVED")).toBeNull();
  });

  test("rawPresenceMintRejection catches protected heading OR body event line, passes clean blocks", () => {
    // Heading matches a protected EVENT_HEADINGS value.
    expect(rawPresenceMintRejection("Human Turn", "**Details**: x")).toContain("presence/provenance");
    // Body carries a protected **Event**: line (post \n-expansion).
    expect(
      rawPresenceMintRejection("Custom Event", "**Event**: DELEGATED_REJECTION\n**Details**: x"),
    ).toContain("presence/provenance");
    // Clean: non-protected heading and event.
    expect(rawPresenceMintRejection("Custom Event", "**Event**: CUSTOM\n**Details**: x")).toBeNull();
  });

  // The enforcement lives in the CLI append handlers (throwing, which main()
  // surfaces as a non-zero exit). These in-process calls exercise the throw
  // branch directly (the CLI-only main() dispatch cannot be reached in-process).
  test("handleAppend throws for every protected event", () => {
    const { root } = scaffold();
    for (const ev of ["HUMAN_TURN", "DELEGATED_APPROVAL", "DELEGATED_REJECTION"]) {
      expect(() => handleAppend(ev, {}, root)).toThrow(/presence\/provenance/);
    }
  });

  test("handleAppendRaw throws for a protected heading or a smuggled **Event** body line", () => {
    const { root } = scaffold();
    expect(() => handleAppendRaw("Human Turn", "**Details**: x", root)).toThrow(/presence\/provenance/);
    expect(() =>
      handleAppendRaw("Custom Event", "**Event**: HUMAN_TURN\\n**Details**: x", root),
    ).toThrow(/presence\/provenance/);
  });
});
