# Component Methods — インストーラの実装

> Stage: application-design / Intent: `260706-installer-impl`  
> Upstream: `requirements.md`, `stories.md`, `architecture.md`, `component-inventory.md`, `team-practices.md`, refined CLI/DX mockups

## Shared Types

```ts
type Harness = "claude" | "codex" | "kiro" | "kiro-ide";
type CommandName = "install" | "upgrade";
type FileClass = "owned" | "shared" | "user-preserved";
type TargetState =
  | "manifest-installed"
  | "manual-or-unknown"
  | "partial"
  | "none"
  | "unsupported-layout";

type SetupCommand = {
  command: CommandName;
  harness?: Harness;
  target?: string;
  version?: string;
  yes: boolean;
  force: boolean;
};

type InteractionMode = {
  interactive: boolean;
  promptsAllowed: boolean;
  confirmationsAllowed: boolean;
  suppressPrompts: boolean;
};

type ResolvedVersion = {
  distributionVersion: string;
  sourceTag: string;
  sourceRepo: "https://github.com/amadeus-dlc/amadeus";
  ignoredTags: Array<{ tag: string; reason: string }>;
};

type DistributionFile = {
  path: string;
  class: FileClass;
  required: boolean;
  md5: string;
};

type FileOperation =
  | { kind: "add"; path: string; class: FileClass; sourcePath: string; sourceMd5: string }
  | { kind: "update"; path: string; class: FileClass; sourcePath: string; previousMd5?: string; sourceMd5: string }
  | { kind: "skip"; path: string; class: FileClass; reason: string }
  | { kind: "backup"; path: string; backupPath: string; reason: string }
  | { kind: "conflict"; path: string; class: FileClass; reason: string }
  | { kind: "force-update"; path: string; class: FileClass; sourcePath: string; backupPath?: string; sourceMd5: string };

type FileOperationPlan = {
  command: CommandName;
  harness: Harness;
  target: string;
  resolvedVersion: ResolvedVersion;
  manifestPath: string;
  operations: FileOperation[];
  canApply: boolean;
  noWriteReason?: string;
  requiresConfirmation: boolean;
  confirmationReason?: string;
};

type ProcessEnv = Record<string, string | undefined>;
type ExitResult = { code: number; stdout: string; stderr: string };
type ParseResult<T> = { ok: true; value: T } | { ok: false; error: SetupError };
type ApplyDecision = { apply: true } | { apply: false; reason: "declined" | "not-allowed" };
type SetupResult = {
  exit: ExitResult;
  plan?: FileOperationPlan;
  applyResult?: ApplyResult;
  manifest?: InstallerManifest;
  verificationResult?: VerificationResult;
  classifiedError?: SetupError;
};
type SetupContext = { mode: InteractionMode; ports: RuntimeDeps; reporter: ReporterPort };

type SetupError = {
  code: string;
  message: string;
  noFilesModified: boolean;
  nextAction?: string;
  details?: Record<string, string>;
};

type LoadedDistribution = {
  root: string;
  harness: Harness;
  resolvedVersion: ResolvedVersion;
  files: Array<{ path: string; absolutePath: string; md5: string }>;
};

type InstallerManifest = {
  schemaVersion: 1;
  installerPackageVersion: string;
  distributionVersion: string;
  sourceTag: string;
  installedAt: string;
  harness: Harness;
  files: DistributionFile[];
};

type TargetDetection =
  | { state: "manifest-installed"; target: string; manifest: InstallerManifest; inferredHarness: Harness }
  | { state: "manual-or-unknown"; target: string; inferredHarness: Harness }
  | { state: "partial"; target: string; inferredHarness?: Harness; missing: string[]; ambiguousHarnesses?: Harness[] }
  | { state: "none"; target: string }
  | { state: "unsupported-layout"; target: string; reason: string }
  | { state: "ambiguous-harness"; target: string; candidates: Harness[]; reason: string };

type TargetSnapshot = {
  target: string;
  detection: TargetDetection;
  existingFiles: Array<{ path: string; md5?: string; exists: boolean }>;
};

type VerificationResult =
  | { ok: true; checks: Array<{ name: string; status: "passed" }> }
  | { ok: false; checks: Array<{ name: string; status: "passed" | "failed"; reason?: string }> };

type ApplyResult =
  | {
      ok: true;
      applied: FileOperation[];
      backups: Array<{ path: string; backupPath: string }>;
      manifestWrite: "not-started" | "written" | "failed";
      diagnostics: string[];
    }
  | {
      ok: false;
      failedPhase: "backup" | "copy";
      failedOperation: FileOperation;
      applied: FileOperation[];
      backups: Array<{ path: string; backupPath: string }>;
      manifestWrite: "not-started";
      diagnostics: string[];
    };

type PackageCheckResult = { ok: boolean; checks: Array<{ name: string; status: "passed" | "failed"; reason?: string }> };
type ReleaseValidationPlan = { tag?: string; dryRun: boolean; requiredGates: string[] };

type RuntimeDeps = {
  tagSource: TagSourcePort;
  archiveSource: ArchiveSourcePort;
  archiveExtractor: ArchiveExtractorPort;
  filesystem: FileSystemPort;
  manifestStore: ManifestStorePort;
  clock: ClockPort;
  prompt: PromptPort;
};

type ApplyPorts = {
  filesystem: FileSystemPort;
  clock: ClockPort;
};

type ManifestStorePort = {
  readManifest(path: string): Promise<InstallerManifest | null>;
  writeManifestAtomic(path: string, manifest: InstallerManifest): Promise<void>;
};

type ReporterPort = {
  renderPlan(plan: FileOperationPlan): string;
  renderError(error: SetupError): string;
  renderResult(result: SetupResult): string;
};

type TagSourcePort = {
  listTags(sourceRepo: string): Promise<string[]>;
};

type ArchiveSourcePort = {
  fetchArchive(input: { sourceRepo: string; sourceTag: string }): Promise<{ archivePath: string }>;
};

type ArchiveExtractorPort = {
  extractHarness(input: { archivePath: string; harness: Harness }): Promise<LoadedDistribution>;
  cleanup(distribution: LoadedDistribution): Promise<void>;
};

type FileSystemPort = {
  readFile(path: string): Promise<Uint8Array>;
  writeFileAtomic(path: string, content: Uint8Array): Promise<void>;
  exists(path: string): Promise<boolean>;
  listFiles(root: string): Promise<string[]>;
  md5(path: string): Promise<string>;
  copyFile(src: string, dst: string): Promise<void>;
  renameOrCopyBackup(src: string, backupPath: string): Promise<void>;
};

type ClockPort = {
  now(): Date;
  operationTimestamp(): string; // UTC basic format: YYYYMMDDTHHMMSSZ
};

type PromptPort = {
  chooseHarness(candidates: Harness[]): Promise<Harness>;
  chooseTarget(defaultTarget: string): Promise<string>;
  confirmApply(plan: FileOperationPlan): Promise<ApplyDecision>;
};
```

## Entrypoint And CLI

### `runSetup`

```ts
async function runSetup(argv: string[], env: ProcessEnv, deps: RuntimeDeps): Promise<ExitResult>;
```

- Purpose: top-level process entry.
- Inputs: argv, process env, runtime adapters.
- Outputs: exit code and rendered output.
- Errors: catches `SetupError` and unexpected errors, mapping both to human-readable stderr.

### `parseCommand`

```ts
function parseCommand(argv: string[]): ParseResult<SetupCommand>;
```

- Purpose: parse `install` / `upgrade` contract.
- Rejects: `init`, unknown commands, duplicate harness, unknown harness.
- Does not inspect filesystem or network.

### `resolveInteractionMode`

```ts
function resolveInteractionMode(input: {
  stdinIsTty: boolean;
  yes: boolean;
  force: boolean;
}): InteractionMode;
```

- Purpose: encode `--yes` / non-TTY / `--force` semantics once.
- Output drives prompt and validation behavior.

### Harness / Target Validation Matrix

| Command | Target state | Interactive | Non-interactive / `--yes` | Result |
|---|---|---|---|---|
| install | not relevant | missing harness/target may prompt | missing harness or target fails | install always needs explicit or prompted values |
| upgrade | manifest-installed | `--harness` optional; manifest harness wins | `--harness` optional; manifest harness wins | proceed if target present |
| upgrade | no manifest, unique sentinel | `--harness` optional; inferred harness may be confirmed | `--harness` optional if unique sentinel | proceed with inferred harness |
| upgrade | no manifest, `kiro`/`kiro-ide` ambiguous | prompt for harness | fail no-write with `ambiguous-harness` | prevents wrong harness update |
| upgrade | no sentinels | harness cannot rescue missing install | fail no-write | instruct to run `install` |

`--target` remains required in non-interactive mode for both commands. `--harness` is required in non-interactive install, but not in manifest-installed upgrade.

## Application Service

### `install`

```ts
async function install(command: SetupCommand, ctx: SetupContext): Promise<SetupResult>;
```

- Purpose: execute install use case.
- Flow: validate values, prompt if allowed, resolve version, load distribution, plan, report/confirm, apply, manifest, verify.
- Important invariant: `FileOperationPlan` is rendered before any target write.

### `upgrade`

```ts
async function upgrade(command: SetupCommand, ctx: SetupContext): Promise<SetupResult>;
```

- Purpose: execute upgrade use case.
- Flow: validate values, detect target manifest-first, snapshot target, resolve or prompt harness if needed, resolve version, compare versions, plan, report/confirm, apply, write manifest, verify.
- Important invariant: target states `none` and `unsupported-layout` return no-write errors.

## Version And Distribution

### `resolveVersion`

```ts
async function resolveVersion(request: {
  requestedVersion?: string;
  sourceRepo: string;
  allowExplicitPrerelease: boolean;
  tagSource: TagSourcePort;
}): Promise<ResolvedVersion>;
```

- Purpose: stable SemVer tag first policy.
- Error codes: `no-stable-version`, `version-not-found`, `network-timeout`.
- GitHub Release metadata is not an ordering input.

### `loadDistribution`

```ts
async function loadDistribution(request: {
  resolvedVersion: ResolvedVersion;
  harness: Harness;
  archiveSource: ArchiveSourcePort;
  archiveExtractor: ArchiveExtractorPort;
}): Promise<LoadedDistribution>;
```

- Purpose: fetch archive through `ArchiveSourcePort` and extract selected `dist/<harness>/`; retry is owned by `ArchiveSourcePort` / adapter, not by `loadDistribution`.
- Error codes: `archive-fetch-failed`, `harness-dist-missing`, `archive-invalid`.
- Does not write target project.

### `readDistributionMetadata`

```ts
async function readDistributionMetadata(input: {
  distributionRoot: string;
  harness: Harness;
}): Promise<DistributionFile[]>;
```

- Purpose: read source metadata or fallback to first-release path policy.
- Output feeds planner and manifest store.
- Exact required inventory is refined in Functional Design.

## Target And Planning

### `detectTarget`

```ts
async function detectTarget(input: {
  target: string;
  requestedHarness?: Harness;
  mode: InteractionMode;
  filesystem: FileSystemPort;
  manifestStore: ManifestStorePort;
  prompt?: PromptPort;
}): Promise<TargetDetection>;
```

- Purpose: classify target state manifest-first, then sentinel-based.
- Manifest-first: if manifest exists and has valid `harness`, use manifest harness even when `--harness` is omitted.
- Sentinel inference: if no manifest exists, infer selected harness from sentinel files.
- Ambiguity: because `kiro` and `kiro-ide` sentinels are identical, ambiguous sentinel matches require an interactive prompt; non-interactive mode returns `ambiguous-harness` no-write error.
- Requested harness mismatch: if `--harness` conflicts with manifest harness, return validation error and modify no files.
- Does not write.

### `snapshotTarget`

```ts
async function snapshotTarget(input: {
  target: string;
  detection: TargetDetection;
  metadata: DistributionFile[];
  filesystem: FileSystemPort;
}): Promise<TargetSnapshot>;
```

- Purpose: produce existing-file/md5 snapshot for planning after target detection.
- Keeps detection contract separate from file inventory comparison.

### `planInstall`

```ts
function planInstall(input: {
  command: SetupCommand;
  mode: InteractionMode;
  distribution: LoadedDistribution;
  metadata: DistributionFile[];
  target: TargetSnapshot;
  now: Date;
  backupPathExists: (path: string) => boolean;
}): FileOperationPlan;
```

- Purpose: produce install plan for clean/collision target.
- Handles non-interactive collision abort unless `--force`.
- Ensures changed/unknown shared files have backup rows before force-update rows.

### `planUpgrade`

```ts
function planUpgrade(input: {
  command: SetupCommand;
  mode: InteractionMode;
  targetDetection: TargetDetection;
  targetSnapshot: TargetSnapshot;
  distribution: LoadedDistribution;
  metadata: DistributionFile[];
  manifest?: InstallerManifest;
  now: Date;
  backupPathExists: (path: string) => boolean;
}): FileOperationPlan;
```

- Purpose: produce upgrade plan for every target state.
- Handles version-state branches: up-to-date, downgrade unsupported, installed newer than latest, explicit newer target.

### `classifyFile`

```ts
function classifyFile(input: {
  path: string;
  sourceMetadata?: DistributionFile;
  harness: Harness;
}): FileClass;
```

- Purpose: centralize `owned` / `shared` / `user-preserved` decision.
- Source metadata wins over fallback path policy.

### `buildBackupPath`

```ts
function buildBackupPath(input: {
  originalPath: string;
  operationTimestamp: string;
  existingBackupExists: (path: string) => boolean;
}): string;
```

- Purpose: produce portable backup paths.
- Format: `${originalPath}.${YYYYMMDDTHHMMSSZ}.bk`; timestamp uses UTC basic format with no `:`.
- Collision: append `.1`, `.2`, ... before `.bk` if the backup path already exists.
- Path behavior: preserve original directory and file basename; no path separator is introduced by timestamp.

## Apply, Manifest, Verification

### `applyPlan`

```ts
async function applyPlan(plan: FileOperationPlan, ports: ApplyPorts): Promise<ApplyResult>;
```

- Purpose: apply an approved plan.
- Writes backups before overwrite.
- Does not mutate if `plan.canApply === false`.
- Does not write the installer manifest. After `applyPlan` succeeds, `Setup Application Service` calls `writeManifest`; if that fails, the service classifies `manifest-write-failed`, reports applied operations and backup diagnostics, and future upgrade must classify the target as `manual-or-unknown` or `partial` rather than `manifest-installed`.
- Unexpected write failure returns partial apply diagnostics; rollback restore remains out of scope.

### `writeManifest`

```ts
async function writeManifest(input: {
  path: string;
  manifest: InstallerManifest;
  manifestStore: ManifestStorePort;
}): Promise<void>;
```

- Purpose: write `amadeus/.installer/amadeus-setup-manifest.json`.
- Minimum fields: `schemaVersion`, `installerPackageVersion`, `distributionVersion`, `sourceTag`, `installedAt`, `harness`, `files[]`.
- Atomicity: write to a temp file in the manifest directory, fsync where available, then rename into place. Failure is classified separately from file-copy failure.

### `verifyInstallation`

```ts
async function verifyInstallation(input: {
  target: string;
  harness: Harness;
  manifest: InstallerManifest;
}): Promise<VerificationResult>;
```

- Purpose: file existence and doctor-equivalent readiness.
- Checks required files from manifest, harness directory, tools directory, active-space memory shell, and state/intent absence tolerance.

## Reporting And Prompting

### `renderPlan`

```ts
function renderPlan(plan: FileOperationPlan): string;
```

- Purpose: canonical plain-text plan output.
- Keeps table columns stable: `Operation`, `Files`, `Example`.

### `confirmApply`

```ts
async function confirmApply(plan: FileOperationPlan, mode: InteractionMode): Promise<ApplyDecision>;
```

- Purpose: prompt only when confirmations are allowed and required.
- Defaults to no-write.
- `--yes` suppresses prompt but not plan rendering or validation.

### `renderError`

```ts
function renderError(error: SetupError): string;
```

- Purpose: classified error, no-change guarantee where applicable, one next action.

## Adapter Contracts

### `GitHubArchiveAdapter`

```ts
class GitHubArchiveAdapter implements TagSourcePort, ArchiveSourcePort {
  listTags(sourceRepo: string): Promise<string[]>;
  fetchArchive(input: { sourceRepo: string; sourceTag: string }): Promise<{ archivePath: string }>;
}
```

- `listTags` has no target filesystem side effects.
- `fetchArchive` retries transient archive download failure once.
- Both methods return classified errors with no target writes.

### `ArchiveExtractor`

```ts
class ArchiveExtractor implements ArchiveExtractorPort {
  extractHarness(input: { archivePath: string; harness: Harness }): Promise<LoadedDistribution>;
  cleanup(distribution: LoadedDistribution): Promise<void>;
}
```

- Fails with `harness-dist-missing` if selected `dist/<harness>/` is absent.
- Owns temp directory cleanup.

### `BackupWriter`

```ts
class BackupWriter {
  backup(input: { path: string; backupPath: string; filesystem: FileSystemPort }): Promise<void>;
}
```

- Uses `renameOrCopyBackup`.
- Must complete backup before any overwrite of a changed or unknown `shared` file.

### `PromptAdapter`

```ts
class PromptAdapter implements PromptPort {
  chooseHarness(candidates: Harness[]): Promise<Harness>;
  chooseTarget(defaultTarget: string): Promise<string>;
  confirmApply(plan: FileOperationPlan): Promise<ApplyDecision>;
}
```

- Supports typed/numeric fallback for harness selection.
- Is never called when prompts are disallowed.

## Maintainer And Release Methods

### `checkPackageMetadata`

```ts
async function checkPackageMetadata(root: string): Promise<PackageCheckResult>;
```

- Purpose: validate `packages/setup/package.json`, bin, license, repository, files allowlist, root dev-only boundary.

### `buildReleaseValidationPlan`

```ts
function buildReleaseValidationPlan(input: {
  tag?: string;
  dryRun: boolean;
}): ReleaseValidationPlan;
```

- Purpose: model `workflow_dispatch` release checks.
- Concrete npm credentials and environment protection remain CI Pipeline / Deployment Pipeline concerns.

### `ReleaseWorkflowContract`

```ts
type ReleaseWorkflowContract = {
  workflowFile: ".github/workflows/release-setup.yml";
  trigger: "workflow_dispatch";
  defaultTagPolicy: "latest-stable-semver";
  requiredGates: Array<
    | "package-build"
    | "package-dry-run"
    | "smoke-integration"
    | "dependency-review"
    | "sbom-provenance"
    | "publish-validation"
  >;
};
```

- Models required release gates for CI Pipeline / Deployment Pipeline.
- Does not define npm credentials; that remains a later pipeline design concern.

### `DocumentationUpdateOwner`

```ts
type DocumentationUpdateOwner = {
  primaryFiles: ["README.md", "packages/setup/README.md"];
  requiredTopics: [
    "bunx install",
    "npx bun-required caveat",
    "supported harnesses",
    "upgrade",
    "manual copy not primary",
  ];
};
```

- Owns FR-015 design reference.
- Implementation may keep `packages/setup/docs/install-guidance.md` as source material, but root README must expose the user-facing path.

## Error Handling Strategy

| Error family | Example | Owner | User-visible behavior |
|---|---|---|---|
| Validation | missing `--target` in non-interactive mode | parser / mode resolver | exit non-zero, no files modified |
| Version | `version-not-found` | version resolver | exit non-zero, no files modified |
| Network | archive fetch fails twice | GitHub adapter | classified error + retry instruction |
| Target state | `none`, `unsupported-layout`, partial without force | target detector/planner | no-write error |
| Apply | backup write fails | file applier | exit non-zero with failed operation |
| Manifest | manifest atomic write fails after copy | manifest store | exit non-zero, report applied operations, future upgrade treats as manual/partial |
| Verification | tools directory missing | verifier | exit non-zero with failed check |

## Traceability

Method groups cover `requirements.md` FR-001..FR-017, `stories.md` US-001..US-012, and the brownfield boundary described in `architecture.md` / `component-inventory.md`. `team-practices.md` shapes the blocking CI/release and plain-text CLI method contracts. FR-015 is owned by `DocumentationUpdateOwner`.
