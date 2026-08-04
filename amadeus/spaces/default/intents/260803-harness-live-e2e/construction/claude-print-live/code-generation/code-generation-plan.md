# Code Generation Plan — claude-print-live

対象 Unit: U03 `claude-print-live`
Scope: `self-feature`
Test Strategy: Comprehensive

## 前提と変更面

- 承認済みFunctional/NFR Designを正本とし、Claude Code print/headless surfaceだけを既存 `tests/harness/live-e2e/` kernelへ接続する。
- Claude SDK/TUI固有transportはimportせず、既存driverと同じproject-only settings境界だけをClaude family seamへ反映する。
- `dist/`、workflow state/audit/runtime mirrorは編集しない。matrixはregistryとversioned ledgerから明示生成する。
- user storiesは本Bolt worktreeに複製されていないため、Issue #1717のcaptured intent、FR-1〜FR-11、U03設計のBR-G/I/J/Fへtraceする。

## 実装手順

- [x] Step 1: `claude-print` capability、strict opt-in、GHA hard deny、minimum/measured version、help flag、env/settings isolationをregistryとpreflightへ追加する（FR-1〜FR-4、BR-G01〜G05、BR-I01〜I07）。
- [x] Step 2: Claude family seamとしてproject-only settings builder、allow-list child env、version parser、bounded JSON normalizerを実装する（FR-3/FR-4、NFR-2/NFR-4、LC-CP-01〜05）。
- [x] Step 3: fresh project/home/tmp allocator、native keychain/API-key credential binding、closed print argv、abort/reap/credential/scratch cleanupを実装する（FR-3〜FR-6、NFR-1〜NFR-5、BR-I/J）。
- [x] Step 4: literal prompt、closed JSON schema、90秒deadline、exit/error/turn/structured-output anchorsを持つClaude print journeyを実装する（FR-7/FR-10、BR-J01〜J07、LC-CP-06）。
- [x] Step 5: U02 contract kitへ `claude-print-contract` baselineとCI/opt-in/env/settings mutantをstable assertion IDで接続する（FR-10、BR-F05）。
- [x] Step 6: pure unit testsとfake executable integration testsを追加し、policy、preflight、argv/env/cwd/settings、structured assertion、cleanup、ledgerを固定する（Comprehensive strategy）。
- [x] Step 7: explicit opt-in serial live testを追加し、gate後だけreal CLI/model/authを使用し、durable receiptを要求する（FR-7/FR-11、BR-G04/F03）。
- [x] Step 8: runbookとgenerated capability matrixへClaude print trigger、credential strategy、実行方法を追加する（FR-11、BR-F02〜F04）。
- [x] Step 9: 既存Bun設定を利用し、focused tests、lint、typecheck、matrix check、package/promote drift guardを通す。追加test config不要を確認する。
- [x] Step 10: `code-summary.md`へ変更、設計判断、tests、逸脱を記録し、U03 pathsだけを英語Conventional Commitでcommitする。

## Test Configuration

既存Bun 1.3.13、TypeScript strict、Biome、`*.serial.test.ts` discoveryを使用する。live journeyの外側timeoutは120秒、内側journeyは90秒、focused referee commandは60秒以内とする。通常testではopt-in不在またはGHA hard denyによりprobe/scratch/processを0回にする。
