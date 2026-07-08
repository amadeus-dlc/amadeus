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
    // upgrade-flow is a separate unit (U3); the CLI Contract's symmetric
    // grammar still needs the subcommand itself to parse and dispatch here.
    console.error("`amadeus-setup upgrade` is not implemented in this release.");
    return 1;
  }
  return runInstall(parsed.value, ports);
}

async function runInstall(parsed: ParsedCommand, ports: CliPorts): Promise<number> {
  const { tty } = ports;
  const mode = parsed.isNonInteractive(tty.isTTY) ? "non-interactive" : "interactive";
  const missing = parsed.missingRequiredFor(mode);

  let inputs: InstallInputs;
  if (mode === "non-interactive") {
    if (missing.length > 0) {
      console.error(reporter.renderError(UsageError.missingRequired(missing)));
      return 2;
    }
    inputs = InstallInputs.fromFlags(parsed);
  } else if (missing.length > 0) {
    const wizardResult = await runWizard(parsed, missing, tty);
    if (wizardResult.type === "err") {
      console.log(reporter.renderWizardAborted());
      return 1;
    }
    inputs = wizardResult.value;
  } else {
    inputs = InstallInputs.fromFlags(parsed);
  }

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

  const tmpWriteResult = await ports.createTmpWrite("amadeus-setup-install-");
  if (tmpWriteResult.type === "err") {
    console.error(`could not prepare a temp directory: ${tmpWriteResult.error.detail}`);
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
        const proceed = await tty.confirm("Continue past the conflicts listed above?");
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
  } finally {
    process.removeListener("SIGINT", onSignal);
    process.removeListener("SIGTERM", onSignal);
    cleanup();
  }
}

// Guarded by comparing the running script's own path, not `import.meta.main`
// (Bun-only): tests import { main, createDefaultPorts } from this same file
// with fake ports, and that import must not also trigger a real CLI run.
const isEntryPoint = process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isEntryPoint) {
  const exitCode = await main(process.argv.slice(2));
  process.exit(exitCode);
}
