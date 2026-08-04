#!/usr/bin/env bun
import {
  type AppliedBundle,
  applyReboundBundle,
  buildReconcileBundle,
  buildReboundBundle,
  errorEnvelope,
  EvidenceRebindError,
  type RebindEnvelope,
  rollbackAppliedBundle,
  successEnvelope,
} from "../tests/no-silent-drop/evidence-rebind.ts";
import {
  NoSilentDropEvidenceAdapter,
  type CommandRunner,
} from "./no-silent-drop-evidence-adapter.ts";

type RebindCommand = {
  operation: "rebind";
  targetRevision: string;
};

type ReconcileCommand = {
  operation: "reconcile";
  eventRevision: string;
  repository: string;
};

type EvidenceCommand = RebindCommand | ReconcileCommand;

const USAGE =
  "Usage: bun scripts/no-silent-drop-evidence.ts rebind --target-revision <full-sha>\n" +
  "       bun scripts/no-silent-drop-evidence.ts reconcile --event-revision <full-sha> --repository <owner/name>";

function parseOptions(argv: readonly string[], allowed: ReadonlySet<string>): Map<string, string> {
  const options = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (flag === undefined || value === undefined || !flag.startsWith("--")) {
      throw new EvidenceRebindError("REBIND_INPUT_INVALID", USAGE);
    }
    if (!allowed.has(flag)) throw new EvidenceRebindError("REBIND_INPUT_INVALID", `unknown option: ${flag}`);
    if (options.has(flag)) throw new EvidenceRebindError("REBIND_INPUT_INVALID", `duplicate option: ${flag}`);
    options.set(flag, value);
  }
  return options;
}

function requireFullSha(value: string | undefined, flag: string): string {
  if (value === undefined || !/^[0-9a-f]{40}$/.test(value) || /^0+$/.test(value)) {
    throw new EvidenceRebindError("REBIND_INPUT_INVALID", `${flag} must be a non-zero lowercase full SHA`);
  }
  return value;
}

export function parseEvidenceCommand(argv: readonly string[]): EvidenceCommand {
  const operation = argv[0];
  if (operation === "rebind") {
    const options = parseOptions(argv.slice(1), new Set(["--target-revision"]));
    return { operation, targetRevision: requireFullSha(options.get("--target-revision"), "--target-revision") };
  }
  if (operation === "reconcile") {
    const options = parseOptions(argv.slice(1), new Set(["--event-revision", "--repository"]));
    const repository = options.get("--repository");
    if (repository === undefined || !/^[^/\s]+\/[^/\s]+$/.test(repository)) {
      throw new EvidenceRebindError("REBIND_INPUT_INVALID", "--repository must be owner/name");
    }
    return {
      operation,
      eventRevision: requireFullSha(options.get("--event-revision"), "--event-revision"),
      repository,
    };
  }
  throw new EvidenceRebindError("REBIND_INPUT_INVALID", USAGE);
}

function runPureRebind(command: RebindCommand, adapter: NoSilentDropEvidenceAdapter): RebindEnvelope {
  let bindingRevision: string | null = null;
  let applied: AppliedBundle | null = null;
  try {
    adapter.assertPureRebindTarget(command.targetRevision);
    const bundle = buildReboundBundle(adapter.repositoryRoot, command.targetRevision);
    bindingRevision = bundle.bindingRevision;
    if (!bundle.changed) {
      return successEnvelope({
        status: "no-op",
        code: "REBIND_NOOP",
        bindingRevision,
        targetRevision: command.targetRevision,
      });
    }
    applied = applyReboundBundle(adapter.repositoryRoot, bundle);
    adapter.assertOnlyExpectedChanges(bundle.paths);
    return successEnvelope({
      status: "changed",
      code: "REBIND_OK",
      bindingRevision,
      targetRevision: command.targetRevision,
      counts: bundle.counts,
      paths: bundle.paths,
    });
  } catch (error) {
    return errorEnvelope(
      rollbackOrReplaceError(adapter, applied, error),
      { bindingRevision, targetRevision: command.targetRevision },
    );
  }
}

function rollbackOrReplaceError(
  adapter: NoSilentDropEvidenceAdapter,
  applied: AppliedBundle | null,
  originalError: unknown,
): unknown {
  if (applied === null) return originalError;
  const rollbackProblems = [
    recoveryFailure(() => rollbackAppliedBundle(adapter.repositoryRoot, applied)),
    recoveryFailure(() => adapter.clearReconcileIndex(applied.paths)),
  ].filter((problem): problem is string => problem !== null);
  if (rollbackProblems.length > 0) {
    return new EvidenceRebindError(
      "REBIND_ROLLBACK_FAILED",
      `operation failed and rollback failed: ${rollbackProblems.join("; ")}`,
    );
  }
  return originalError;
}

function recoveryFailure(recover: () => void): string | null {
  try {
    recover();
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

function rollbackCommittedOrReplaceError(
  adapter: NoSilentDropEvidenceAdapter,
  eventRevision: string,
  originalError: unknown,
): unknown {
  if (originalError instanceof EvidenceRebindError && originalError.code === "REBIND_PUSH_OUTCOME_UNKNOWN") {
    return originalError;
  }
  const rollbackProblem = recoveryFailure(() => adapter.rollbackReconcileCommit(eventRevision));
  if (rollbackProblem === null) return originalError;
  return new EvidenceRebindError(
    "REBIND_ROLLBACK_FAILED",
    `operation failed and committed rollback failed: ${rollbackProblem}`,
  );
}

function runReconcile(command: ReconcileCommand, adapter: NoSilentDropEvidenceAdapter): RebindEnvelope {
  let bindingRevision: string | null = null;
  let applied: AppliedBundle | null = null;
  let committed = false;
  try {
    adapter.assertEventCheckout(command.eventRevision);
    bindingRevision = adapter.bindingRevision();
    if (adapter.currentBindingIsValidForEvent(command.eventRevision)) {
      return successEnvelope({
        status: "no-op",
        code: "REBIND_NOOP",
        eventRevision: command.eventRevision,
        bindingRevision,
      });
    }
    adapter.proveIdentityOnlyRebind(command.eventRevision, bindingRevision, command.repository);
    const bundle = buildReconcileBundle(adapter.repositoryRoot, command.eventRevision);
    if (bundle.bindingRevision !== bindingRevision) {
      throw new EvidenceRebindError("REBIND_BINDING_CHANGED", "binding revision changed during reconciliation");
    }
    if (!bundle.changed) {
      return successEnvelope({
        status: "no-op",
        code: "REBIND_NOOP",
        eventRevision: command.eventRevision,
        bindingRevision,
      });
    }
    applied = applyReboundBundle(adapter.repositoryRoot, bundle);
    adapter.assertOnlyExpectedChanges(bundle.paths);
    adapter.runFocusedValidation(command.eventRevision);
    if (adapter.remoteMainTip() !== command.eventRevision) {
      rollbackAppliedBundle(adapter.repositoryRoot, applied);
      applied = null;
      return successEnvelope({
        status: "superseded",
        code: "REBIND_SUPERSEDED",
        eventRevision: command.eventRevision,
        bindingRevision,
        targetRevision: command.eventRevision,
      });
    }
    adapter.commitReconcileChanges(bundle.paths);
    committed = true;
    if (adapter.remoteMainTip() !== command.eventRevision) {
      adapter.rollbackReconcileCommit(command.eventRevision);
      return successEnvelope({
        status: "superseded",
        code: "REBIND_SUPERSEDED",
        eventRevision: command.eventRevision,
        bindingRevision,
        targetRevision: command.eventRevision,
      });
    }
    if (adapter.pushFastForward(command.eventRevision) === "superseded") {
      adapter.rollbackReconcileCommit(command.eventRevision);
      return successEnvelope({
        status: "superseded",
        code: "REBIND_SUPERSEDED",
        eventRevision: command.eventRevision,
        bindingRevision,
        targetRevision: command.eventRevision,
      });
    }
    return successEnvelope({
      status: "changed",
      code: "REBIND_OK",
      eventRevision: command.eventRevision,
      bindingRevision,
      targetRevision: command.eventRevision,
      counts: bundle.counts,
      paths: bundle.paths,
    });
  } catch (error) {
    return errorEnvelope(
      committed
        ? rollbackCommittedOrReplaceError(adapter, command.eventRevision, error)
        : rollbackOrReplaceError(adapter, applied, error),
      {
        eventRevision: command.eventRevision,
        bindingRevision,
        targetRevision: bindingRevision === null ? null : command.eventRevision,
      },
    );
  }
}

export function runEvidenceCommand(
  argv: readonly string[],
  options: { repositoryRoot?: string; runner?: CommandRunner } = {},
): RebindEnvelope {
  let command: EvidenceCommand;
  try {
    command = parseEvidenceCommand(argv);
  } catch (error) {
    return errorEnvelope(error);
  }
  const adapter = new NoSilentDropEvidenceAdapter(options.repositoryRoot ?? process.cwd(), options.runner);
  return command.operation === "rebind" ? runPureRebind(command, adapter) : runReconcile(command, adapter);
}

export function evidenceExitCode(envelope: RebindEnvelope): 0 | 1 {
  return envelope.status === "error" ? 1 : 0;
}

export function serializeEvidenceEnvelope(envelope: RebindEnvelope): string {
  return `${JSON.stringify(envelope)}\n`;
}

export function evidenceMain(argv: readonly string[] = process.argv.slice(2)): number {
  const envelope = runEvidenceCommand(argv);
  process.stdout.write(serializeEvidenceEnvelope(envelope));
  return evidenceExitCode(envelope);
}

if (import.meta.main) process.exitCode = evidenceMain();
