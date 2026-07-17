# Component Methods — amadeus-mirror ツール

上流入力(consumes 全数): requirements.md、architecture.md、component-inventory.md、team-practices.md

## シグネチャ(functional-domain-modeling-ts: type+判別ユニオン Result)

## C1 args-parser

```ts
type ArgsOutcome =
  | { kind: "create"; intentDir: string | null }
  | { kind: "sync"; intentDir: string | null }
  | { kind: "close"; intentDir: string | null }
  | { kind: "usage"; message: string };   // exit 2 経路
export function parseArgs(argv: string[]): ArgsOutcome;
```

## C2 state-snapshot

```ts
type MirrorSnapshot = {
  dirName: string;            // intents.json エントリ(recordDirMatches 解決)
  slug: string;
  projectSummary: string;     // state.md Project フィールド(3〜5行概要の素材)
  recordPath: string;         // amadeus/spaces/<space>/intents/<dirName>/
  phase: string; stage: string;          // state.md Current Status
  stagesApproved: number; stagesTotal: number;  // amadeus-state.md Stage Progress checkbox tally (ADR-3a)
  parked: boolean; parkedAtStage: string | null; // state.md Parked フィールド(RE 重点3)
  workflowStatus: string;     // state.md Status(Running/Completed)
  intentStatus: string;       // intents.json status(in-flight/complete)
  mirrorIssue: number | null; // state.md Mirror Issue フィールド(FR-2.3)
};
type SnapshotOutcome = { kind: "ok"; snapshot: MirrorSnapshot } | { kind: "error"; message: string };
export function buildSnapshot(projectDir: string, intentDir: string | null): SnapshotOutcome;
```

## C3 mirror-template

```ts
export function renderBody(s: MirrorSnapshot): string;   // 定型3要素のみ(FR-5)
export function renderStatusLine(s: MirrorSnapshot): string; // ADR-3 の1行形
export function renderTitle(s: MirrorSnapshot): string;
```

## C4 gh-gateway

```ts
type GhResult = { kind: "ok"; stdout: string } | { kind: "error"; exitCode: number; stderr: string };
export type GhRunner = (args: string[]) => GhResult;     // port(テストは fake を注入)
export function spawnGh(args: string[]): GhResult;        // 既定実装(ADR-2)
export function ensureGhReady(run: GhRunner): GhResult;   // gh auth status 検査(FR-1.3)
```

## C5 commands

```ts
export function handleCreate(projectDir: string, intentDir: string | null, run: GhRunner): number;
export function handleSync(projectDir: string, intentDir: string | null, run: GhRunner): number;
export function handleClose(projectDir: string, intentDir: string | null, run: GhRunner): number;
// 返り値 = exit code(0/1)。FR-2.2 重複ガード / FR-4.1 AND 検査は handler 内の実行行に置く
```

## C6 entry

```ts
export function main(argv: string[]): number;  // parseArgs → dispatch(exit 0/1/2)
if (import.meta.main) process.exit(main(process.argv.slice(2)));
```
