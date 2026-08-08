// covers: function:consumePresenceReservation, file:tools/amadeus-presence-reservation.ts
//
// t505 — consumePresenceReservation must run its read-modify-write of the
// reservation marker under the SAME audit-lock bucket as the only other writer
// of that marker (issue #2590).
//
// THE DEFECT. Every sibling that mutates the reservation ledger — arm, cancel,
// the active-marker scan, and mint — wraps its read-modify-write in
// withAuditLock. consume alone read the marker, validated it, and wrote the
// consumed marker with no lock at all, so a concurrent mint could interleave
// between consume's read and consume's write and have its state transition
// silently overwritten.
//
// THE BUCKET. The lock identity matters as much as the lock: the only other
// writer of a GIVEN marker is mint's inner section, whose identity is the
// marker's OWNER INTENT (projectDir + space + targetIntentDir), not the
// workspace sentinel. A workspace-bucket lock here would serialise against
// nothing that actually writes this marker, and — because the live
// prompt-submit path runs workspace(outer) -> owner-intent(inner) — would also
// invert the hierarchy against consume's callers in amadeus-state.ts, which
// already hold the owner-intent bucket when they call in.
//
// THE CONTRACT this pins:
//   - a foreign process holding the marker's OWNER-INTENT bucket blocks
//     consume: it exhausts its acquire budget and leaves the marker untouched.
//     (Before the fix consume ignored the lock entirely and wrote through.)
//   - a foreign process holding the WORKSPACE bucket does NOT block consume.
//     This is the order-inversion regression pin: moving consume back to the
//     workspace bucket turns this case into a 5s acquire failure.
//
// Mechanism: in-process. A "foreign holder" is a lock dir planted on disk with
// an owner stamp naming a LIVE pid, which is exactly what acquireAuditLock's
// reaper refuses to steal — the same shape t161 uses.

import { afterAll, afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  auditLockDir,
  AuditLockAcquireError,
} from "../../packages/framework/core/tools/amadeus-lib.ts";
import {
  armPresenceReservation,
  consumePresenceReservation,
  readPresenceReservation,
} from "../../packages/framework/core/tools/amadeus-presence-reservation.ts";
import { DEFAULT_INTENT_UUID } from "../harness/fixtures.ts";
import {
  ROUTE_ID,
  SESSION_ID,
  STAGE,
  armAndMintTargetedApproval,
  cleanupSoloGateRoots,
  restoreSoloEnv,
  setup,
  useSoloEnv,
} from "../harness/solo-gate-fixture.ts";

// Isolate this run's audit-lock dirs (#831): the planted "foreign holder" dirs
// below must never alias a concurrent run's real lock in the shared tmpdir.
const LOCK_BASE_DIR = mkdtempSync(join(tmpdir(), "amadeus-t505-locks-"));
process.env.AMADEUS_LOCK_BASE_DIR = LOCK_BASE_DIR;

// The default acquire budget is 50 x 100ms, so a blocked consume takes ~5s.
const BLOCKED_ACQUIRE_TIMEOUT_MS = 20_000;

function cleanLocks(): void {
  for (const name of readdirSync(LOCK_BASE_DIR)) {
    if (!name.includes(".amadeus-audit-")) continue;
    try {
      rmSync(join(LOCK_BASE_DIR, name), { recursive: true, force: true });
    } catch {
      // A best-effort sweep: a dir already gone is the state we wanted.
    }
  }
}

// Plant a lock dir owned by a LIVE process. acquireAuditLock reaps only DEAD or
// long-unstamped holders, so a stamp naming this very process is an
// unreclaimable holder for the whole acquire budget.
function plantLiveForeignLock(lockDir: string): void {
  mkdirSync(lockDir, { recursive: true });
  writeFileSync(
    join(lockDir, "owner.json"),
    JSON.stringify({ pid: process.pid, startedAtMs: 1 }),
    "utf-8",
  );
}

function mintedReservation(): {
  readonly root: string;
  readonly targetIntentId: string;
  readonly reservationId: string;
  readonly ownerLockDir: string;
  readonly workspaceLockDir: string;
} {
  const { root } = setup();
  useSoloEnv(root);
  const ids = armAndMintTargetedApproval(root);
  const marker = readPresenceReservation(root, ids.reservationId);
  expect(marker?.state).toBe("minted");
  return {
    root,
    targetIntentId: ids.targetIntentId,
    reservationId: ids.reservationId,
    ownerLockDir: auditLockDir(root, marker!.targetIntentDir, marker!.space),
    workspaceLockDir: auditLockDir(root),
  };
}

beforeEach(cleanLocks);
afterEach(() => {
  cleanLocks();
  restoreSoloEnv();
});

afterAll(() => {
  cleanupSoloGateRoots();
  delete process.env.AMADEUS_LOCK_BASE_DIR;
  try {
    rmSync(LOCK_BASE_DIR, { recursive: true, force: true });
  } catch {
    // best-effort
  }
});

describe("t505 consume takes the owner-intent audit-lock bucket (#2590)", () => {
  test(
    "a foreign holder of the owner-intent bucket blocks the consume write",
    () => {
      const fixture = mintedReservation();
      plantLiveForeignLock(fixture.ownerLockDir);
      expect(() =>
        consumePresenceReservation({
          projectDir: fixture.root,
          sessionId: SESSION_ID,
          targetIntentId: fixture.targetIntentId,
          stage: STAGE,
          reservationId: fixture.reservationId,
        }),
      ).toThrow(AuditLockAcquireError);
      // The marker must be untouched: a blocked acquire never enters the
      // section, so the state transition never lands.
      expect(
        readPresenceReservation(fixture.root, fixture.reservationId)?.state,
      ).toBe("minted");
    },
    BLOCKED_ACQUIRE_TIMEOUT_MS,
  );

  // The regression pin. It passes trivially today (consume never touches the
  // workspace bucket), and its whole job is to fail LOUDLY if consume is ever
  // moved back there: the budget is generous enough that the failure surfaces
  // as the AuditLockAcquireError naming __workspace__, not as a bare timeout.
  test(
    "a foreign holder of the workspace bucket does NOT block consume",
    () => {
      const fixture = mintedReservation();
      plantLiveForeignLock(fixture.workspaceLockDir);
      const consumed = consumePresenceReservation({
        projectDir: fixture.root,
        sessionId: SESSION_ID,
        targetIntentId: fixture.targetIntentId,
        stage: STAGE,
        reservationId: fixture.reservationId,
      });
      expect(consumed.state).toBe("consumed");
      expect(
        readPresenceReservation(fixture.root, fixture.reservationId)?.state,
      ).toBe("consumed");
    },
    BLOCKED_ACQUIRE_TIMEOUT_MS,
  );
});

// The validations moved inside the critical section with the write, so they are
// now evaluated against the marker re-read under the lock rather than the
// pre-lock read that only resolved the lock identity. These cases pin that each
// rejection still fires from in there, and that a rejected consume leaves the
// marker exactly as it found it.
describe("t505 consume rejects inside the locked section", () => {
  test("a foreign session is refused and the marker is left minted", () => {
    const fixture = mintedReservation();
    expect(() =>
      consumePresenceReservation({
        projectDir: fixture.root,
        sessionId: `${SESSION_ID}-impostor`,
        targetIntentId: fixture.targetIntentId,
        stage: STAGE,
        reservationId: fixture.reservationId,
      }),
    ).toThrow("Presence reservation session does not match");
    expect(
      readPresenceReservation(fixture.root, fixture.reservationId)?.state,
    ).toBe("minted");
  });

  test("a different stage is refused and the marker is left minted", () => {
    const fixture = mintedReservation();
    expect(() =>
      consumePresenceReservation({
        projectDir: fixture.root,
        sessionId: SESSION_ID,
        targetIntentId: fixture.targetIntentId,
        stage: "user-stories",
        reservationId: fixture.reservationId,
      }),
    ).toThrow("Presence reservation target does not match");
    expect(
      readPresenceReservation(fixture.root, fixture.reservationId)?.state,
    ).toBe("minted");
  });

  test("an armed reservation is refused before it has been minted", () => {
    const { root } = setup();
    useSoloEnv(root);
    const marker = armPresenceReservation({
      projectDir: root,
      sessionId: SESSION_ID,
      space: "default",
      targetIntentId: DEFAULT_INTENT_UUID,
      stage: STAGE,
      routeId: ROUTE_ID,
    });
    expect(marker.state).toBe("armed");
    expect(() =>
      consumePresenceReservation({
        projectDir: root,
        sessionId: SESSION_ID,
        targetIntentId: marker.targetIntentId,
        stage: STAGE,
        reservationId: marker.reservationId,
      }),
    ).toThrow("Presence reservation has not been minted");
    expect(readPresenceReservation(root, marker.reservationId)?.state).toBe("armed");
  });
});
