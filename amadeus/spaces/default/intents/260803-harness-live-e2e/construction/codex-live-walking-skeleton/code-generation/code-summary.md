# Code Summary — codex-live-walking-skeleton

## 実装概要

U01のwalking skeletonとして、C1〜C9の共通production kernelとCodex C5/C6を `tests/harness/live-e2e/` に実装した。pure gateからread-only preflight、fresh scratch、credential lease、`codex exec`、決定的anchor、cleanup/leak precedence、sanitized receipt、atomic JSONL ledger、generated matrixまでを一方向に接続した。

既存 `tests/harness/codex-exec-live.ts` は互換facadeとして残し、ambient environment spreadとsource `auth.json` copyを廃止した。既存Codex E2Eは `OPENAI_API_KEY` の短命env leaseを要求し、source auth/config/hooksを参照しない。

## 主な変更ファイル

- `tests/harness/live-e2e/contract.ts`、`policy.ts`、`adapter.ts`、`resources.ts`: closed outcome、pure policy、adapter/credential/scratch port、partial cleanup registrar。
- `tests/harness/live-e2e/lifecycle.ts`: gate-first lifecycle、explicit timeout/AbortSignal、cleanupとleak scanの独立実行、結果precedence、ledger hard failure。
- `tests/harness/live-e2e/registry.ts`: `codex-exec` typed capability正本。
- `tests/harness/live-e2e/ledger.ts`、`runs.jsonl`: owner-stamped lock、dead-owner CAS回収、0600 temp+fsync+rename、pending durability recovery、byte-preserving JSONL。
- `tests/harness/live-e2e/projector.ts`、`project-matrix.ts`: registry+ledgerからのdeterministic render/update/check。
- `tests/harness/live-e2e/codex.ts`、`journey.ts`: Codex preflight/credential injection/process cleanupとexit/schema/file anchor。
- `tests/harness/codex-exec-live.ts` と既存Codex E2E 5 files: 互換surfaceをisolated env credential契約へ移行。
- `tests/unit/t-live-e2e-*.test.ts`、`tests/integration/t-live-e2e-*.test.ts`、`tests/e2e/t-exec-codex-kernel.serial.test.ts`: unit/integration/security/live境界。
- `docs/harness-engineering/live-e2e.md`: runbook、distribution trigger、generated capability matrix。
- `dist/**` と project-local harness projection: 変更前から存在したsource→projection driftを正本から再生成して同期。

## 設計判断

1. `LiveRunReceipt`を非永続skipとrecordedに分離し、gate/preflight denyではscratch、process、ledgerを0回にした。
2. raw credentialは`CredentialBinding.expose()`のclosure内だけに置き、prepared receipt・log・ledgerへserializeしない。Codexはsource auth file/pathでなく`OPENAI_API_KEY` leaseだけを受ける。
3. cleanupとleak scanを別々に試行し、どちらかのfailureをtimeout/assertion/successより優先する。元codeはsecondary diagnosticへ残す。
4. `file-and-directory` durabilityではpending markerをrename前にdurable化し、directory fsync完了までgreenを返さない。失敗後もowner lockはfinallyで解放し、同一receiptのexplicit recoveryを可能にした。
5. matrixはlive runnerから更新せず、明示的なS2 commandのrender/update/checkに分離した。

## TDD実績

- kernel開始時: production module不在によりunit/integration 2 filesがRed。その後C1〜C4/C7〜C9を実装しGreen。
- Codex slice開始時: `codex.ts`不在でfake integrationがRed。その後C5/C6を実装しGreen。
- runbook開始時: document不在でdoc contract 2 testsがRed。その後runbookとgenerated blockを追加しGreen。
- 最終focused集合: 7 files、30 tests中29 pass、実provider 1 self-skip、0 fail。

## 検証結果

- `bun run typecheck`: PASS。
- `bun run lint`: PASS（exit 0。既存complexity等warningのみ。新規対象だけのBiome checkはwarning 0）。
- `bun scripts/package.ts --check`: PASS（8 harnessすべて同期）。
- `bun run promote:self:check`: PASS（project-local self install同期）。
- `bun tests/harness/live-e2e/project-matrix.ts check`: PASS。
- focused unit/integration/E2E/security: 29 pass、1 explicit self-skip、0 fail。
- `bun run test:ci`: smoke完了後、unit `t149-codex-hook-adapter`付近まで新規failureなし。長時間runのため親conductor指示で中断し、referee側のfull CIへ委ねる。

## Plan逸脱・残課題

- 実環境には `AMADEUS_CODEX_EXEC_LIVE=1` と `OPENAI_API_KEY` がなく、実Codex model journeyはscratch/process前にself-skipした。このためversioned ledgerは空、matrixは正しく`UNVERIFIED`であり、実green receiptを捏造していない。credentialを用意したmaintainerがrunbookのcommandを実行し、ledger append→matrix update/checkを閉じる必要がある。
- 変更前 `test:ci` は既存 `dist/kiro` driftで1件失敗した。正本から全distとself-install projectionを再生成し、package/promote drift guardは最終PASSした。
- U02所有の網羅的property/failure-injection（SIGKILL、PID再利用、double reaper等）は本Unitへ取り込んでいない。
