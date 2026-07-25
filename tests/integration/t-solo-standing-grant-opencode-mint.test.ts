// covers: file:harness/opencode/plugin/amadeus-opencode-plugin.ts, file:harness/opencode/plugin/amadeus-opencode-vocab.ts
//
// The OpenCode prompt-hook mint site, driven end-to-end against the SHIPPED
// projection (dist/opencode/.opencode/plugin/) so the file OpenCode actually
// loads is the file under test.
//
// Seam measured 2026-07-26 on opencode 1.18.3: the runtime dispatches
//   trigger("chat.message",{sessionID:t.sessionID,…},{message,parts})
// so the plugin receives a stable per-session identity. What this test fixes:
//   1. a human `chat.message` in the session that armed a standing-grant
//      fallback mints the TARGETED owner presence (the continuation fires on
//      OpenCode, not only on Claude/Codex/Cursor/Kiro CLI);
//   2. a payload with no session identity is fail-closed — the reservation
//      stays `armed`, and nothing degrades onto a shared key, the PID, or the
//      active-intent cursor (HR-04e);
//   3. machine turns (the runtime's `synthetic` text parts, and the shared
//      machine-injected marker catalog) mint nothing at all (#755/#811).

import { afterAll, afterEach, describe, expect, test } from "bun:test";
import { join } from "node:path";
import {
  opencodeProjectDir,
  opencodePromptText,
} from "../../packages/framework/harness/opencode/plugin/amadeus-opencode-vocab.ts";
import { handleReport } from "../../packages/framework/core/tools/amadeus-orchestrate.ts";
import { readPresenceReservation } from "../../packages/framework/core/tools/amadeus-presence-reservation.ts";
import { REPO_ROOT } from "../harness/fixtures.ts";
import {
  GRANT_ID,
  ROUTE_ID,
  SESSION_ID,
  STAGE,
  captureStdout,
  cleanupSoloGateRoots,
  restoreSoloEnv,
  setup,
  useSoloEnv,
} from "../harness/solo-gate-fixture.ts";

afterAll(() => {
  cleanupSoloGateRoots();
});

const PLUGIN_PATH = join(
  REPO_ROOT,
  "dist",
  "opencode",
  ".opencode",
  "plugin",
  "amadeus-opencode-plugin.ts",
);

type ChatMessage = (
  input: { sessionID?: unknown },
  output: { parts?: unknown },
) => Promise<void>;

async function chatMessageHook(projectDir: string): Promise<ChatMessage> {
  const module = (await import(PLUGIN_PATH)) as {
    default: (input: unknown) => Promise<{ "chat.message": ChatMessage }>;
  };
  const hooks = await module.default({ worktree: projectDir, directory: projectDir });
  return hooks["chat.message"];
}

// Drive the grant carrier to its await-approval fallback and return the armed
// reservation id, exactly as the conductor's report does at a real gate.
function armFallback(root: string): string {
  const fallback = JSON.parse(
    captureStdout(() => {
      handleReport(
        [
          "--stage",
          STAGE,
          "--result",
          "approved",
          "--standing-grant-id",
          GRANT_ID,
          "--standing-grant-route-id",
          ROUTE_ID,
        ],
        root,
      );
    }),
  ) as { kind: string; presence_reservation_id: string };
  if (fallback.kind !== "await-approval") {
    throw new Error(`fixture did not fall back: ${JSON.stringify(fallback)}`);
  }
  return fallback.presence_reservation_id;
}

function armedRoot(): { root: string; reservationId: string } {
  // An EXPIRED grant is what drives the carrier into its await-approval
  // fallback — the branch that arms a presence reservation for the human.
  const expiredAt = Date.now() - 1_000;
  const { root } = setup(new Date(expiredAt).toISOString(), expiredAt - 1_000);
  useSoloEnv(root);
  const reservationId = armFallback(root);
  expect(readPresenceReservation(root, reservationId)?.state).toBe("armed");
  return { root, reservationId };
}

describe("OpenCode chat.message mint site", () => {
  afterEach(() => {
    restoreSoloEnv();
  });

  test("a human prompt carrying the session identity mints the targeted presence", async () => {
    const { root, reservationId } = armedRoot();
    const hook = await chatMessageHook(root);

    await hook({ sessionID: SESSION_ID }, { parts: [{ type: "text", text: "1" }] });

    expect(readPresenceReservation(root, reservationId)?.state).toBe("minted");
  });

  test("a payload with no session identity stays fail-closed", async () => {
    const { root, reservationId } = armedRoot();
    const hook = await chatMessageHook(root);

    await hook({}, { parts: [{ type: "text", text: "1" }] });

    expect(readPresenceReservation(root, reservationId)?.state).toBe("armed");
  });

  test("machine turns mint nothing — synthetic parts and injected markers", async () => {
    const { root, reservationId } = armedRoot();
    const hook = await chatMessageHook(root);

    await hook(
      { sessionID: SESSION_ID },
      { parts: [{ type: "text", text: "<task-notification>ping</task-notification>" }] },
    );
    expect(readPresenceReservation(root, reservationId)?.state).toBe("armed");

    // A synthetic part is dropped before classification, so the surviving human
    // text is null and the mint proceeds only on the human's own turn.
    expect(
      opencodePromptText([{ type: "text", text: "injected", synthetic: true }]),
    ).toBeNull();
  });
});

describe("OpenCode payload vocabulary", () => {
  test("resolves the project dir, preferring the worktree over the cwd", () => {
    expect(opencodeProjectDir({ worktree: "/w", directory: "/d" })).toBe("/w");
    expect(opencodeProjectDir({ directory: "/d" })).toBe("/d");
    expect(opencodeProjectDir({ worktree: "  ", directory: "/d" })).toBe("/d");
    expect(opencodeProjectDir({ worktree: 7 })).toBeNull();
    expect(opencodeProjectDir(null)).toBeNull();
    expect(opencodeProjectDir("not-an-object")).toBeNull();
  });

  test("joins the human text parts and drops everything else", () => {
    expect(
      opencodePromptText([
        { type: "text", text: "first" },
        { type: "text", text: "", synthetic: false },
        { type: "text", text: "injected", synthetic: true },
        { type: "file", text: "not text" },
        { type: "text", text: 7 },
        "not-an-object",
        null,
        { type: "text", text: "second" },
      ]),
    ).toBe("first\nsecond");
    expect(opencodePromptText([])).toBeNull();
    expect(opencodePromptText("nope")).toBeNull();
  });
});
