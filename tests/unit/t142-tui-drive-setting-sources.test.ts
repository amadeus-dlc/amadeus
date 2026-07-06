// covers: harness-instrument:tui-drive-setting-sources
// covers: harness-instrument:tui-drive-revision-recovery
//
// Pins the TUI harness' setting-source isolation. Live TUI journeys drive the
// real Claude CLI, but should load only the copied project .claude settings by
// default so developer/user-level hooks cannot contaminate deterministic tests.

import { describe, expect, test } from "bun:test";
import {
  normalizeTuiCommand,
  pickRevisionOption,
  pickRevisionTypeSomethingOption,
} from "../harness/tui-drive.ts";

function env(settingSources?: string): NodeJS.ProcessEnv {
  return settingSources === undefined
    ? {}
    : { AIDLC_TUI_SETTING_SOURCES: settingSources };
}

describe("tui-drive setting-source isolation", () => {
  test("bare claude commands default to project-only settings", () => {
    expect(
      normalizeTuiCommand(["claude", "--dangerously-skip-permissions"], env()),
    ).toEqual([
      "claude",
      "--setting-sources",
      "project",
      "--dangerously-skip-permissions",
    ]);
  });

  test("absolute claude paths and Windows executables are normalized too", () => {
    expect(
      normalizeTuiCommand(["/opt/homebrew/bin/claude", "--resume"], env()),
    ).toEqual([
      "/opt/homebrew/bin/claude",
      "--setting-sources",
      "project",
      "--resume",
    ]);

    expect(
      normalizeTuiCommand(["C:\\Program Files\\nodejs\\claude.exe"], env()),
    ).toEqual([
      "C:\\Program Files\\nodejs\\claude.exe",
      "--setting-sources",
      "project",
    ]);
  });

  test("Windows claude.cmd npm shims are normalized too", () => {
    expect(
      normalizeTuiCommand(["claude.cmd", "--dangerously-skip-permissions"], env()),
    ).toEqual([
      "claude.cmd",
      "--setting-sources",
      "project",
      "--dangerously-skip-permissions",
    ]);

    expect(
      normalizeTuiCommand(["C:\\Users\\dev\\AppData\\Roaming\\npm\\claude.cmd"], env()),
    ).toEqual([
      "C:\\Users\\dev\\AppData\\Roaming\\npm\\claude.cmd",
      "--setting-sources",
      "project",
    ]);
  });

  test("Windows claude.ps1 npm shims are normalized too", () => {
    expect(
      normalizeTuiCommand(["claude.ps1", "--resume"], env()),
    ).toEqual([
      "claude.ps1",
      "--setting-sources",
      "project",
      "--resume",
    ]);

    expect(
      normalizeTuiCommand(["C:\\Users\\dev\\AppData\\Roaming\\npm\\claude.ps1"], env()),
    ).toEqual([
      "C:\\Users\\dev\\AppData\\Roaming\\npm\\claude.ps1",
      "--setting-sources",
      "project",
    ]);
  });

  test("explicit setting sources win", () => {
    expect(
      normalizeTuiCommand(
        ["claude", "--setting-sources", "user,project,local", "--resume"],
        env(),
      ),
    ).toEqual(["claude", "--setting-sources", "user,project,local", "--resume"]);

    expect(
      normalizeTuiCommand(["claude", "--setting-sources=user,project,local"], env()),
    ).toEqual(["claude", "--setting-sources=user,project,local"]);
  });

  test("environment override can customize or disable injection", () => {
    expect(
      normalizeTuiCommand(["claude"], env("project,local")),
    ).toEqual(["claude", "--setting-sources", "project,local"]);

    expect(normalizeTuiCommand(["claude"], env("default"))).toEqual(["claude"]);
    expect(normalizeTuiCommand(["claude"], env(""))).toEqual(["claude"]);
  });

  test("non-claude commands are left unchanged", () => {
    expect(
      normalizeTuiCommand(["node", "script.js", "claude"], env()),
    ).toEqual(["node", "script.js", "claude"]);
  });
});

describe("tui-drive revision recovery detection", () => {
  test("does not treat a pending multi-tab learnings tab as revision feedback", () => {
    const learningsTab = `
←  ☒ RE Gate  ☐ Learnings  ✔ Submit  →

The stage diary surfaced learning candidates. Persist any as a project-level rule?

❯ 1. [ ] None (recommended)
  These are one-off diagnostic findings for this bug.
  2. [ ] localStorage default
  Persist: prefer browser-native localStorage.
  3. [ ] Type something
     Submit
────────────────────────────────────────────────────────────────
Enter to select · Tab/Arrow keys to navigate · Esc to cancel
`;

    expect(pickRevisionOption(learningsTab)).toBeNull();
  });

  test("picks the first real revision directive from the recovery menu", () => {
    const recoveryMenu = `
What would you like to change?

❯ 1. Actually approve & continue
  I didn't mean to request changes.
  2. Narrow root cause to checkbox persistence
  Revise the analysis before advancing.
  3. Type something.
────────────────────────────────────────────────────────────────
Enter to select · Tab/Arrow keys to navigate · Esc to cancel
`;

    expect(pickRevisionOption(recoveryMenu)).toBe(2);
  });

  test("selects the typed-feedback path from a change-type recovery menu", () => {
    const changeTypeMenu = `
What would you like changed in the reverse-engineering artifacts?

❯ 1. Fix a specific artifact
  One or more files has an inaccuracy or omission.
  2. Add detail / depth
  The artifacts are correct but too shallow somewhere.
  3. Redo the stage
  Re-run the scan and synthesis from scratch.
  4. Type something.
────────────────────────────────────────────────────────────────
Enter to select · ↑/↓ to navigate · Esc to cancel
`;

    expect(pickRevisionOption(changeTypeMenu)).toBeNull();
    expect(pickRevisionTypeSomethingOption(changeTypeMenu)).toBe(4);
  });
});
