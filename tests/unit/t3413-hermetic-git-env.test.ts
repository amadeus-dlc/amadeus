// covers: file:tests/lib/hermetic-git-env.ts
// size: small
//
// t3413 — the pure half of the #3413 seam: the environment transform that keeps
// a test-spawned git call inside the fixture it names. The measured leak itself
// (real git, real repository, real pollution) is proved in
// tests/integration/t3413-git-ambient-binding-isolation.integration.test.ts;
// this file pins the transform's contract and asserts, at runtime, that the
// process actually running these tests carries no ambient git binding.
import { describe, expect, test } from "bun:test";
import {
  AMBIENT_GIT_BINDING_VARS,
  applyHermeticGitEnv,
  HERMETIC_GLOBAL_GITCONFIG,
  hermeticGitEnv,
} from "../lib/hermetic-git-env.ts";
import {
  REENTRY_MARKER_ENV,
  reentryVerdict,
} from "../../scripts/precommit-related-unit-tests.ts";

const CONFIG = { global: "/pinned/global.gitconfig", system: "/pinned/system.gitconfig" };

describe("hermetic git environment (#3413)", () => {
  test("removes every ambient repository-binding variable", () => {
    const base: NodeJS.ProcessEnv = {};
    for (const name of AMBIENT_GIT_BINDING_VARS) base[name] = `ambient-${name}`;

    const result = hermeticGitEnv(base, CONFIG);

    const surviving = AMBIENT_GIT_BINDING_VARS.filter((name) => result[name] !== undefined);
    expect(surviving).toEqual([]);
  });

  test("pins the global and system config away from host state", () => {
    const result = hermeticGitEnv(
      { GIT_CONFIG_GLOBAL: "/home/dev/.gitconfig", GIT_CONFIG_SYSTEM: "/etc/gitconfig" },
      CONFIG,
    );

    expect(result.GIT_CONFIG_GLOBAL).toBe(CONFIG.global);
    expect(result.GIT_CONFIG_SYSTEM).toBe(CONFIG.system);
  });

  test("leaves everything git needs to run, and everything unrelated, untouched", () => {
    const base: NodeJS.ProcessEnv = {
      PATH: "/usr/bin",
      HOME: "/home/dev",
      GIT_EXEC_PATH: "/usr/libexec/git-core",
      GIT_DIR: "/real/.git/worktrees/enhance-1",
      AMADEUS_TEST_NAME: "t3413",
    };

    const result = hermeticGitEnv(base, CONFIG);

    expect(result.PATH).toBe("/usr/bin");
    expect(result.HOME).toBe("/home/dev");
    expect(result.GIT_EXEC_PATH).toBe("/usr/libexec/git-core");
    expect(result.AMADEUS_TEST_NAME).toBe("t3413");
    expect(result.GIT_DIR).toBeUndefined();
  });

  test("does not mutate the environment it copies from", () => {
    const base: NodeJS.ProcessEnv = { GIT_DIR: "/real/.git", GIT_CONFIG_GLOBAL: "/home/dev/.gitconfig" };

    hermeticGitEnv(base, CONFIG);

    expect(base.GIT_DIR).toBe("/real/.git");
    expect(base.GIT_CONFIG_GLOBAL).toBe("/home/dev/.gitconfig");
  });

  test("applyHermeticGitEnv edits in place, which is how process.env is cleaned", () => {
    const env: NodeJS.ProcessEnv = { GIT_DIR: "/real/.git", GIT_INDEX_FILE: "/real/.git/index" };

    applyHermeticGitEnv(env, CONFIG);

    expect(env.GIT_DIR).toBeUndefined();
    expect(env.GIT_INDEX_FILE).toBeUndefined();
    expect(env.GIT_CONFIG_GLOBAL).toBe(CONFIG.global);
  });

  // Regression pin on the MEASURED hook environment (git 2.55): these are the
  // variables a pre-commit hook started from a linked worktree actually
  // inherits. Dropping any of them from the list re-opens #3413.
  test.each([
    "GIT_DIR",
    "GIT_INDEX_FILE",
    "GIT_PREFIX",
    "GIT_CONFIG_PARAMETERS",
    "GIT_AUTHOR_NAME",
    "GIT_AUTHOR_EMAIL",
    "GIT_AUTHOR_DATE",
  ])("%s — exported to hooks by git itself — is stripped", (name) => {
    expect(AMBIENT_GIT_BINDING_VARS).toContain(name);
  });

  // GIT_CONFIG_NOSYSTEM is not a repository binding, so it needs its own reason
  // to be on the list: it suppresses system config entirely, which would make
  // the GIT_CONFIG_SYSTEM pin inert. The measured proof that git behaves this
  // way lives in the integration file (it takes a real `git config` read).
  test("GIT_CONFIG_NOSYSTEM is stripped so the system pin cannot be suppressed", () => {
    expect(AMBIENT_GIT_BINDING_VARS).toContain("GIT_CONFIG_NOSYSTEM");
    expect(hermeticGitEnv({ GIT_CONFIG_NOSYSTEM: "1" }, CONFIG).GIT_CONFIG_NOSYSTEM).toBeUndefined();
  });

  test("the pinned global config restores what pinning would otherwise hide", () => {
    // safe.directory replaces the entry actions/checkout writes into the
    // runner's real global config; the identity replaces the one a bare CI
    // runner does not have; signing is forced off so a contributor's key is
    // never invoked inside a fixture.
    expect(HERMETIC_GLOBAL_GITCONFIG).toContain("directory = *");
    expect(HERMETIC_GLOBAL_GITCONFIG).toContain("amadeus-test@example.invalid");
    expect(HERMETIC_GLOBAL_GITCONFIG).toContain("gpgsign = false");
  });

  // The end-to-end assertion: whatever started this process — the suite runner,
  // the pre-commit hook chain, or a bare `bun test` — must not have handed it a
  // binding to some other repository. In the #3413 incident this process had
  // GIT_DIR set to the real worktree's git dir, and this expectation fails on
  // exactly that state.
  test("the process running these tests carries no ambient git binding", () => {
    const leaked = AMBIENT_GIT_BINDING_VARS.filter((name) => process.env[name] !== undefined);
    expect(leaked).toEqual([]);
  });
});

describe("pre-commit re-entry guard (#3413)", () => {
  test("an ordinary hook invocation proceeds", () => {
    expect(reentryVerdict({}).kind).toBe("proceed");
    expect(reentryVerdict({ GIT_DIR: "/real/.git" }).kind).toBe("proceed");
  });

  test("an invocation started from inside a pre-commit test run refuses", () => {
    const verdict = reentryVerdict({ [REENTRY_MARKER_ENV]: "1" });

    expect(verdict.kind).toBe("refuse");
    expect(verdict.kind === "refuse" ? verdict.message : "").toContain("refusing to re-enter");
  });
});
