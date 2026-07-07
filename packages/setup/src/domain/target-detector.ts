import { join } from "node:path";
import type { Harness, SetupError } from "../cli/types.ts";
import { setupSourceError } from "./source-types.ts";
import type { SentinelSet, TargetDetection, TargetDetectionDiagnostics, TargetDetectionResult } from "./target-types.ts";
import type { PromptPort, TargetManifestReadPort, TargetReadOnlyFilePort } from "../ports/target-state.ts";

export const SENTINEL_PATHS: Record<Harness, string[]> = {
  claude: [".claude", "amadeus"],
  codex: [".codex", ".agents", "AGENTS.md", "amadeus"],
  kiro: [".kiro", "AGENTS.md", "amadeus"],
  "kiro-ide": [".kiro", "AGENTS.md", "amadeus"],
};

export type DetectTargetRequest = {
  targetPath: string;
  requestedHarness?: Harness;
  promptsAllowed: boolean;
  manifestReader: TargetManifestReadPort;
  files: TargetReadOnlyFilePort;
  promptPort?: PromptPort;
};

function noWriteError(input: Omit<SetupError, "noFilesModified">): SetupError {
  return setupSourceError(input);
}

function diagnostics(
  manifestRead: TargetDetectionDiagnostics["manifestRead"],
  sentinelMatches: SentinelSet[],
  extra: Omit<TargetDetectionDiagnostics, "manifestRead" | "sentinelMatches"> = {},
): TargetDetectionDiagnostics {
  return { manifestRead, sentinelMatches, ...extra };
}

async function evaluateSentinels(targetPath: string, harnesses: readonly Harness[], files: TargetReadOnlyFilePort): Promise<SentinelSet[]> {
  const existsCache = new Map<string, boolean>();
  const exists = async (relativePath: string): Promise<boolean> => {
    const cached = existsCache.get(relativePath);
    if (cached !== undefined) {
      return cached;
    }
    const present = await files.exists(join(targetPath, relativePath));
    existsCache.set(relativePath, present);
    return present;
  };

  const sets: SentinelSet[] = [];
  for (const harness of harnesses) {
    const requiredPaths = SENTINEL_PATHS[harness];
    const presentPaths: string[] = [];
    const missingPaths: string[] = [];
    for (const path of requiredPaths) {
      if (await exists(path)) {
        presentPaths.push(path);
      } else {
        missingPaths.push(path);
      }
    }
    const matchKind = presentPaths.length === requiredPaths.length ? "full" : presentPaths.length > 0 ? "partial" : "none";
    sets.push({ harness, requiredPaths, presentPaths, missingPaths, matchKind });
  }
  return sets;
}

function bestPartial(sets: SentinelSet[]): SentinelSet {
  return [...sets].sort((left, right) => right.presentPaths.length - left.presentPaths.length)[0] as SentinelSet;
}

function isKiroPair(candidates: readonly Harness[]): boolean {
  return candidates.length === 2 && candidates.includes("kiro") && candidates.includes("kiro-ide");
}

function hasOnlyAmadeusRoot(sets: SentinelSet[]): boolean {
  const present = new Set(sets.flatMap((set) => set.presentPaths));
  return present.size === 1 && present.has("amadeus");
}

async function resolveKiroPair(request: DetectTargetRequest, candidates: Harness[]): Promise<Harness | undefined> {
  if (!request.promptsAllowed || request.promptPort === undefined) {
    return undefined;
  }
  const selected = await request.promptPort.chooseHarness({
    targetPath: request.targetPath,
    candidates,
    reason: "kiro-kiro-ide-ambiguity",
  });
  return selected !== undefined && candidates.includes(selected) ? selected : undefined;
}

function ambiguousDetection(targetPath: string, candidates: Harness[], detail: TargetDetectionDiagnostics): TargetDetection {
  const reason = `Target matches multiple harness candidates: ${candidates.join(", ")}.`;
  return {
    state: "ambiguous-harness",
    target: targetPath,
    candidates,
    reason,
    diagnostics: diagnostics(detail.manifestRead, detail.sentinelMatches, {
      ambiguousHarnesses: candidates,
      reason,
    }),
  };
}

export async function detectTarget(request: DetectTargetRequest): Promise<TargetDetectionResult> {
  const manifestRead = await request.manifestReader.readManifestForDetection(request.targetPath);
  if (manifestRead.status === "valid") {
    if (request.requestedHarness !== undefined && request.requestedHarness !== manifestRead.manifest.harness) {
      return {
        ok: false,
        error: noWriteError({
          code: "target-harness-mismatch",
          message: `Requested harness ${request.requestedHarness} does not match installed manifest harness ${manifestRead.manifest.harness}.`,
          nextAction: "Run the command with the manifest harness or choose a different target.",
          details: {
            requestedHarness: request.requestedHarness,
            manifestHarness: manifestRead.manifest.harness,
          },
        }),
      };
    }
    return {
      ok: true,
      detection: {
        state: "manifest-installed",
        target: request.targetPath,
        manifest: manifestRead.manifest,
        inferredHarness: manifestRead.manifest.harness,
        diagnostics: diagnostics(manifestRead.diagnostics, []),
      },
    };
  }

  const harnesses = request.requestedHarness === undefined ? (Object.keys(SENTINEL_PATHS) as Harness[]) : [request.requestedHarness];
  const sentinelMatches = await evaluateSentinels(request.targetPath, harnesses, request.files);
  const detail = diagnostics(manifestRead.diagnostics, sentinelMatches);
  const fullMatches = sentinelMatches.filter((set) => set.matchKind === "full").map((set) => set.harness);
  if (fullMatches.length === 1) {
    return {
      ok: true,
      detection: {
        state: "manual-or-unknown",
        target: request.targetPath,
        inferredHarness: fullMatches[0] as Harness,
        diagnostics: detail,
      },
    };
  }
  if (isKiroPair(fullMatches)) {
    const selected = await resolveKiroPair(request, fullMatches);
    if (selected !== undefined) {
      return {
        ok: true,
        detection: {
          state: "manual-or-unknown",
          target: request.targetPath,
          inferredHarness: selected,
          diagnostics: diagnostics(manifestRead.diagnostics, sentinelMatches, { ambiguousHarnesses: fullMatches }),
        },
      };
    }
    return { ok: true, detection: ambiguousDetection(request.targetPath, fullMatches, detail) };
  }
  if (fullMatches.length > 1) {
    return { ok: true, detection: ambiguousDetection(request.targetPath, fullMatches, detail) };
  }

  const partialMatches = sentinelMatches.filter((set) => set.matchKind === "partial");
  if (partialMatches.length === 0) {
    return {
      ok: true,
      detection: {
        state: "none",
        target: request.targetPath,
        diagnostics: detail,
      },
    };
  }

  if (request.requestedHarness === undefined && hasOnlyAmadeusRoot(sentinelMatches)) {
    const reason = "Target contains amadeus/ without a supported first-release harness sentinel.";
    return {
      ok: true,
      detection: {
        state: "unsupported-layout",
        target: request.targetPath,
        reason,
        diagnostics: diagnostics(manifestRead.diagnostics, sentinelMatches, { reason }),
      },
    };
  }

  const selectedPartial = request.requestedHarness === undefined ? bestPartial(partialMatches) : (partialMatches[0] as SentinelSet);
  const ambiguousHarnesses = partialMatches.length > 1 ? partialMatches.map((set) => set.harness) : undefined;
  return {
    ok: true,
    detection: {
      state: "partial",
      target: request.targetPath,
      inferredHarness: ambiguousHarnesses === undefined ? selectedPartial.harness : undefined,
      missingPaths: selectedPartial.missingPaths,
      ...(ambiguousHarnesses !== undefined ? { ambiguousHarnesses } : {}),
      diagnostics: diagnostics(manifestRead.diagnostics, sentinelMatches, {
        ...(ambiguousHarnesses !== undefined ? { ambiguousHarnesses } : {}),
      }),
    },
  };
}
