import { createHash } from "node:crypto";
import type { Harness } from "../../../packages/setup/src/domain/installer-contracts.ts";
import type { ApplyDecision } from "../../../packages/setup/src/domain/apply-types.ts";
import type { FileOperationPlan } from "../../../packages/setup/src/domain/plan-types.ts";
import { setupSourceError } from "../../../packages/setup/src/domain/source-types.ts";
import type { ManifestReadResult } from "../../../packages/setup/src/domain/target-types.ts";
import type { ArchiveSourcePort } from "../../../packages/setup/src/ports/archive-source.ts";
import type { TargetFilePort } from "../../../packages/setup/src/ports/filesystem.ts";
import type { TagSourcePort } from "../../../packages/setup/src/ports/tag-source.ts";
import type { PromptPort, TargetManifestReadPort, TargetReadOnlyFilePort } from "../../../packages/setup/src/ports/target-state.ts";

export function fakeTagSource(tags: string[]): TagSourcePort {
  return {
    async listTags() {
      return { ok: true, value: tags };
    },
  };
}

export type ArchiveSourceMode = "success" | "transient-then-success" | "failure";

export function fakeArchiveSource(input: {
  archivePath: string;
  mode?: ArchiveSourceMode;
}): ArchiveSourcePort & { fetchCalls: number } {
  let fetchCalls = 0;
  const mode = input.mode ?? "success";
  return {
    get fetchCalls() {
      return fetchCalls;
    },
    async fetchArchive() {
      fetchCalls += 1;
      if (mode === "failure" || (mode === "transient-then-success" && fetchCalls < 2)) {
        return {
          ok: false,
          error: setupSourceError({
            code: "archive-fetch-failed",
            message: "archive fetch failed",
            nextAction: "Check network access to GitHub and retry the setup command.",
            details: { attempt: String(fetchCalls) },
          }),
        };
      }
      return {
        ok: true,
        value: {
          archivePath: input.archivePath,
          diagnostics: fetchCalls > 1 ? [`attempt ${fetchCalls - 1}: fetch failed`] : [],
        },
      };
    },
  };
}

export class FakeTargetFiles implements TargetReadOnlyFilePort, TargetFilePort {
  readonly existsCalls: string[] = [];
  readonly md5Calls: string[] = [];
  readonly readCalls: string[] = [];
  readonly writeCalls: Array<{ path: string; content: Uint8Array }> = [];
  readonly copyCalls: Array<{ sourcePath: string; destinationPath: string }> = [];
  readonly backupCalls: Array<{ sourcePath: string; backupPath: string }> = [];
  private readonly entries = new Map<string, Uint8Array | Error>();
  private readonly existing = new Set<string>();
  private readonly md5Failures = new Set<string>();
  private readonly copyFailures = new Set<string>();
  private readonly backupFailures = new Set<string>();

  addExisting(path: string, content = ""): void {
    this.existing.add(path);
    this.entries.set(path, Buffer.from(content));
  }

  addUnreadable(path: string): void {
    this.existing.add(path);
    this.entries.set(path, new Error("unreadable"));
  }

  failMd5(path: string): void {
    this.md5Failures.add(path);
  }

  failCopy(destinationPath: string): void {
    this.copyFailures.add(destinationPath);
  }

  failBackup(backupPath: string): void {
    this.backupFailures.add(backupPath);
  }

  exists(path: string): boolean {
    this.existsCalls.push(path);
    return this.existing.has(path);
  }

  readFile(path: string): Uint8Array {
    this.readCalls.push(path);
    const entry = this.entries.get(path);
    if (entry instanceof Error || entry === undefined) {
      throw new Error("unreadable");
    }
    return entry;
  }

  md5(path: string): string {
    this.md5Calls.push(path);
    if (this.md5Failures.has(path)) {
      throw new Error("unreadable");
    }
    const entry = this.entries.get(path);
    if (entry instanceof Error || entry === undefined) {
      throw new Error("unreadable");
    }
    return createHash("md5").update(entry).digest("hex");
  }

  copyFile(sourcePath: string, destinationPath: string): void {
    if (this.copyFailures.has(destinationPath)) {
      throw new Error(`copy failed: ${destinationPath}`);
    }
    this.copyCalls.push({ sourcePath, destinationPath });
    this.existing.add(destinationPath);
    const source = this.entries.get(sourcePath);
    if (source instanceof Uint8Array) {
      this.entries.set(destinationPath, source);
    }
  }

  backupFile(sourcePath: string, backupPath: string): void {
    if (this.backupFailures.has(backupPath)) {
      throw new Error(`backup failed: ${backupPath}`);
    }
    this.backupCalls.push({ sourcePath, backupPath });
    this.existing.add(backupPath);
    const source = this.entries.get(sourcePath);
    if (source instanceof Uint8Array) {
      this.entries.set(backupPath, source);
    }
  }

  writeFileAtomic(path: string, content: Uint8Array): void {
    this.writeCalls.push({ path, content });
    this.existing.add(path);
    this.entries.set(path, content);
  }
}

export class StubManifestReader implements TargetManifestReadPort {
  constructor(private readonly result: ManifestReadResult) {}

  readManifestForDetection(): ManifestReadResult {
    return this.result;
  }
}

export function fakePromptPort(input: {
  chooseHarness?: (candidates: readonly Harness[]) => Harness | undefined;
  confirmApply?: (plan: FileOperationPlan) => ApplyDecision;
} = {}): PromptPort {
  return {
    chooseHarness(request) {
      return input.chooseHarness?.(request.candidates);
    },
    confirmApply(plan) {
      return input.confirmApply?.(plan) ?? { apply: false, reason: "declined" };
    },
  };
}
