#!/usr/bin/env node
// amadeus-setup: fetches a tagged Amadeus distribution from GitHub and
// installs it into a target project (CLI Contract, FR-003/004/007/010/011/
// 013/016). This is the only place ports are wired together (nfr-design
// logical-components.md) and the only place exit codes are produced
// (BR-I06: 0=success, 1=runtime failure, 2=usage error).

import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { InstallInputs, ParsedCommand, UsageError } from "./domain/command.ts";
import { Installation } from "./domain/installation.ts";
import { Manifest } from "./domain/manifest.ts";
import { Plan } from "./domain/plan.ts";
import { UpgradeRefusal, UpgradeSource } from "./domain/upgrade.ts";
import { NextSteps } from "./domain/verify-result.ts";
import { Applier } from "./modules/applier.ts";
import { createManifestIo, type ManifestIo } from "./modules/manifest-io.ts";
import * as reporter from "./modules/reporter.ts";
import { createFetcher } from "./modules/fetcher.ts";
import { createResolver } from "./modules/resolver.ts";
import { Verifier } from "./modules/verifier.ts";
import { runWizard } from "./modules/wizard.ts";
import { createApplyWrite, type ApplyWrite } from "./ports/apply-write.ts";
import { createFsRead, createFsWrite, createTmpWrite, type IoError, type TmpWrite } from "./ports/fsops.ts";
import { createHttp, type Http } from "./ports/http.ts";
import { createTtyIO, type TtyIO } from "./ports/tty.ts";
import { createVerifyRead, type VerifyRead } from "./ports/verify-read.ts";
import type { Result } from "./shared/result.ts";

const PACKAGE_JSON_PATH = join(dirname(fileURLToPath(import.meta.url)), "..", "package.json");
const SETUP_VERSION: string = JSON.parse(readFileSync(PACKAGE_JSON_PATH, "utf8")).version;
const API_TIMEOUT_MS = 10_000;
const ARCHIVE_TIMEOUT_MS = 30_000;

// Everything main()/runInstall() need from the outside world, gathered in
// one bag so tests can inject fakes for all of it (code-generation-plan.md
// Step 10: "配線は fake ポート"). createDefaultPorts() wires the real thing.
export type CliPorts = {
  readonly tty: TtyIO;
  readonly manifestIo: ManifestIo;
  readonly http: Http;
  readonly createTmpWrite: (prefix: string) => Promise<Result<TmpWrite, IoError>>;
  readonly applyWrite: ApplyWrite;
  readonly verifyRead: VerifyRead;
};

export function createDefaultPorts(): CliPorts {
  return Object.freeze({
    tty: createTtyIO(),
    manifestIo: createManifestIo(createFsRead(), createFsWrite()),
    http: createHttp({ apiTimeoutMs: API_TIMEOUT_MS, archiveTimeoutMs: ARCHIVE_TIMEOUT_MS }),
    createTmpWrite,
    applyWrite: createApplyWrite(),
    verifyRead: createVerifyRead(),
  });
}

export async function main(argv: readonly string[], ports: CliPorts = createDefaultPorts()): Promise<number> {
  const parsed = ParsedCommand.parse(argv);
  if (parsed.type === "err") {
    console.error(reporter.renderError(parsed.error));
    return 2;
  }

  if (parsed.value.subcommand === "help") {
    console.log(reporter.renderHelp());
    return 0;
  }
  if (parsed.value.subcommand === "upgrade") {
    return runUpgrade(parsed.value, ports);
  }
  return runInstall(parsed.value, ports);
}

type Mode = "interactive" | "non-interactive";

// Shared by runInstall/runUpgrade (both subcommands take the same --harness/
// --target/--yes flags, per the CLI Contract's symmetric grammar): resolves
// mode, runs the wizard if fields are missing, and prints the one message
// each non-ok path needs — callers just propagate an "exit" result verbatim.
type ResolvedInputs =
  | { readonly type: "exit"; readonly code: number }
  | { readonly type: "ok"; readonly inputs: InstallInputs; readonly mode: Mode };

async function resolveInputs(parsed: ParsedCommand, ports: CliPorts): Promise<ResolvedInputs> {
  const { tty } = ports;
  const mode: Mode = parsed.isNonInteractive(tty.isTTY) ? "non-interactive" : "interactive";
  const missing = parsed.missingRequiredFor(mode);

  if (mode === "non-interactive") {
    if (missing.length > 0) {
      console.error(reporter.renderError(UsageError.missingRequired(missing)));
      return { type: "exit", code: 2 };
    }
    return { type: "ok", inputs: InstallInputs.fromFlags(parsed), mode };
  }
  if (missing.length > 0) {
    const wizardResult = await runWizard(parsed, missing, tty);
    if (wizardResult.type === "err") {
      console.log(reporter.renderWizardAborted());
      return { type: "exit", code: 1 };
    }
    return { type: "ok", inputs: wizardResult.value, mode };
  }
  return { type: "ok", inputs: InstallInputs.fromFlags(parsed), mode };
}

// Shared by runInstall/runUpgrade: a temp working directory that must be
// cleaned up exactly once, whether the run finishes normally, fails, or is
// interrupted by SIGINT/SIGTERM. `fn` receives the ready TmpWrite and its
// returned exit code becomes this function's own result.
async function withTmpWrite(ports: CliPorts, prefix: string, fn: (tmpWrite: TmpWrite) => Promise<number>): Promise<number> {
  const tmpWriteResult = await ports.createTmpWrite(prefix);
  if (tmpWriteResult.type === "err") {
    console.error(reporter.renderTmpDirFailure(tmpWriteResult.error.detail));
    return 1;
  }
  const tmpWrite = tmpWriteResult.value;

  let cleaned = false;
  const cleanup = (): void => {
    if (cleaned) return;
    cleaned = true;
    void tmpWrite.remove();
  };
  const onSignal = (): void => {
    cleanup();
    process.exit(1);
  };
  process.once("SIGINT", onSignal);
  process.once("SIGTERM", onSignal);

  try {
    return await fn(tmpWrite);
  } finally {
    process.removeListener("SIGINT", onSignal);
    process.removeListener("SIGTERM", onSignal);
    cleanup();
  }
}

async function runInstall(parsed: ParsedCommand, ports: CliPorts): Promise<number> {
  const resolvedInputs = await resolveInputs(parsed, ports);
  if (resolvedInputs.type === "exit") return resolvedInputs.code;
  const { inputs, mode } = resolvedInputs;

  // REL-I02: detection is the first I/O — an already-installed target is
  // rejected before any network cost is paid.
  const installation = await Installation.detect(inputs.target, ports.manifestIo);
  const admission = installation.admitsInstall(parsed.force);
  if (admission.type === "refuse-suggest-upgrade") {
    console.error(reporter.renderAlreadyInstalled(admission));
    return 1;
  }

  const resolved = await createResolver(ports.http).resolveVersion(parsed.version);
  if (resolved.type === "err") {
    console.error(reporter.renderError(resolved.error));
    return 1;
  }

  return withTmpWrite(ports, "amadeus-setup-install-", async (tmpWrite) => {
    const fetched = await createFetcher(ports.http, tmpWrite).fetchArchive(resolved.value);
    if (fetched.type === "err") {
      console.error(reporter.renderError(fetched.error));
      return 1;
    }

    const startedAt = new Date().toISOString();
    const planResult = Plan.forInstall(fetched.value, inputs.harness, inputs.target, { force: parsed.force, startedAt });
    if (planResult.type === "err") {
      console.error(reporter.renderError(planResult.error));
      return 1;
    }
    const plan = planResult.value;
    console.log(reporter.renderPlanReport(plan)); // FR-007: always shown before apply/exit

    if (plan.hasConflicts() && !parsed.force) {
      if (mode === "interactive") {
        const proceed = await ports.tty.confirm("Continue past the conflicts listed above?");
        if (!proceed) return 1;
      } else {
        return 1; // BR-I11: non-interactive conflicts abort after the report
      }
    }

    const applied = await Applier.create(ports.applyWrite).apply(plan, inputs.target);
    if (applied.hasFailures()) {
      console.error(reporter.renderApplyFailure(applied));
      return 1;
    }

    const filesResult = applied.manifestFiles();
    if (filesResult.type === "err") {
      console.error(reporter.renderError(filesResult.error));
      return 1;
    }

    const manifest = Manifest.build(fetched.value, filesResult.value, {
      installerPackageVersion: SETUP_VERSION,
      harness: inputs.harness,
      installStartedAt: plan.startedAtIso,
    });
    const written = await ports.manifestIo.write(inputs.target, manifest);
    if (written.type === "err") {
      console.error(reporter.renderError(written.error));
      return 1;
    }

    const verify = await Verifier.create(ports.verifyRead).verify(inputs.target, manifest);
    if (!verify.allPassed()) {
      console.error(reporter.renderVerifyFailure(verify));
      return 1;
    }

    console.log(reporter.renderSuccess(applied, verify, NextSteps.of(inputs.harness, resolved.value, inputs.target)));
    return 0;
  });
}

// U3: updates an existing installation to a newer distribution version
// (business-logic-model.md workflow 1). Shares InstallInputs/runWizard/
// Applier/Verifier/manifestIo with runInstall — the only upgrade-specific
// decisions are UpgradeSource.fromInstallation, UpgradeAssessment (via
// source.assess), and Plan.forUpgrade.
async function runUpgrade(parsed: ParsedCommand, ports: CliPorts): Promise<number> {
  const resolvedInputs = await resolveInputs(parsed, ports);
  if (resolvedInputs.type === "exit") return resolvedInputs.code;
  const { inputs } = resolvedInputs;

  // REL-U02: detection and source classification happen before any network
  // I/O, so all no-change refusal paths below never touch the network.
  const installation = await Installation.detect(inputs.target, ports.manifestIo);
  const sourceResult = UpgradeSource.fromInstallation(installation, parsed.force);
  if (sourceResult.type === "err") {
    console.error(reporter.renderError(sourceResult.error));
    return 1;
  }
  const source = sourceResult.value;

  const resolved = await createResolver(ports.http).resolveVersion(parsed.version);
  if (resolved.type === "err") {
    console.error(reporter.renderError(resolved.error));
    return 1;
  }

  // BR-U05: assess() is null for manual-or-unknown/partial-forced sources
  // (installed version unknown) — those skip straight to a conservative plan.
  const assessment = source.assess(resolved.value, parsed.version);
  if (assessment !== null) {
    const outcome = assessment.outcome();
    if (outcome.type !== "proceed") {
      console.error(reporter.renderError(UpgradeRefusal.fromOutcome(outcome)));
      return outcome.type === "already-up-to-date" ? 0 : 1; // BR-U01: no-op is still success
    }
  }

  return withTmpWrite(ports, "amadeus-setup-upgrade-", async (tmpWrite) => {
    const fetched = await createFetcher(ports.http, tmpWrite).fetchArchive(resolved.value);
    if (fetched.type === "err") {
      console.error(reporter.renderError(fetched.error));
      return 1;
    }

    const startedAt = new Date().toISOString();
    const planResult = Plan.forUpgrade(fetched.value, source, inputs.harness, inputs.target, { force: parsed.force, startedAt });
    if (planResult.type === "err") {
      console.error(reporter.renderError(planResult.error));
      return 1;
    }
    const plan = planResult.value;
    console.log(reporter.renderPlanReport(plan, source.strategyNote())); // FR-007

    // BR-U13: upgrade has no "conflict" action — Disposition already decided
    // every existing file's treatment, so a non-interactive run proceeds
    // straight to apply once the report above has been printed.
    if (resolvedInputs.mode === "interactive" && !parsed.force) {
      const proceed = await ports.tty.confirm("Continue with the upgrade plan above?");
      if (!proceed) return 1;
    }

    const applied = await Applier.create(ports.applyWrite).apply(plan, inputs.target);
    if (applied.hasFailures()) {
      console.error(reporter.renderApplyFailure(applied));
      return 1;
    }

    const filesResult = applied.manifestFiles();
    if (filesResult.type === "err") {
      console.error(reporter.renderError(filesResult.error));
      return 1;
    }

    // BR-U14: which branch of nextManifest runs (upgradedTo vs. build) is
    // the source's own decision, not this caller's.
    const newManifest = source.nextManifest({
      payload: fetched.value,
      files: filesResult.value,
      meta: { installerPackageVersion: SETUP_VERSION, harness: inputs.harness, installStartedAt: plan.startedAtIso },
    });
    const written = await ports.manifestIo.write(inputs.target, newManifest);
    if (written.type === "err") {
      console.error(reporter.renderError(written.error));
      return 1;
    }

    const verify = await Verifier.create(ports.verifyRead).verify(inputs.target, newManifest);
    if (!verify.allPassed()) {
      console.error(reporter.renderVerifyFailure(verify));
      return 1;
    }

    console.log(reporter.renderSuccess(applied, verify, NextSteps.of(inputs.harness, resolved.value, inputs.target)));
    return 0;
  });
}

// Guarded by comparing the running script's own path, not `import.meta.main`
// (Bun-only): tests import { main, createDefaultPorts } from this same file
// with fake ports, and that import must not also trigger a real CLI run.
const isEntryPoint = process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isEntryPoint) {
  const exitCode = await main(process.argv.slice(2));
  process.exit(exitCode);
}
