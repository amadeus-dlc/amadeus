# Code Generation Plan — loop-monitor-runtime

## スコープ

#2095 の FR-LMC-001〜012 / AC01〜14 に対応する、ハーネス中立な Loop Monitor Core を実装する。Quality Repair、autonomy grant、PR、外部 plugin manifest、常駐 supervisor は対象外とする。

## 実装計画

- [x] Step 1: workflow-level manifest と正規化済み contribution の厳格な compiler を公開し、`transitionTable` と `runtimeLimits.maxPendingDeliveries` を含む決定的 `graphRevision` を生成する（FR-LMC-001、AC01）。
- [x] Step 2: compiler の正常系・unknown field・重複 cycle/route・不正 threshold・参照不整合を公開 API 経由の unit test で固定する（FR-LMC-001、AC01、AC11）。
- [x] Step 3: content-addressed delivery、因果 predecessor、ignore、cycle prefix/count/epoch、bounded pending、fork/conflict を扱う純粋 reducer を実装する（FR-LMC-002〜004、AC02〜06）。
- [x] Step 4: T-1/T、自然退出、overlap、ignore/noise、重複、successor-before-predecessor、fork、overflow を unit test で固定する（FR-LMC-002〜004、AC02〜06）。
- [x] Step 5: canonical event-set と per-clone Replay Index を扱う repository を実装し、通常 resume は index の対象 partition のみを読み、欠落・破損は明示 repair まで `INCOMPLETE` にする（FR-LMC-005〜006、AC07〜09）。
- [x] Step 6: reservation-first Judge、commit receipt 由来 permit、reconcile-first resume、1 回だけの no-effect redispatch、閉じた route 検証、result-observed 順序を実装する（FR-LMC-007〜009、AC07〜10）。
- [x] Step 7: evidence-bound latch の短絡、evidence change または verified human retry による atomic clear/unpark、live smoke authorization port を実装する（FR-LMC-009〜010、AC09〜12）。
- [x] Step 8: crash boundary、attempt cap、index repair、clone merge、latch clear を memory/integration repository test で固定する（FR-LMC-005〜010、AC07〜12）。
- [x] Step 9: Core tools が Claude Code、Codex、Cursor、OpenCode、Kimi Code の 5 harness に同一 bytes で投影される contract test を追加する（FR-LMC-011〜012、AC13〜14）。
- [x] Step 10: 既存 Bun/TypeScript test 設定を利用して focused tests、`bun run lint`、`bun run typecheck`、package/promote drift を実行する（AC01〜14）。
- [x] Step 11: 実装ファイル、設計判断、テスト結果、計画との差分を `code-summary.md` に記録する（code-generation stage completion）。

## テスト構成

- Unit: compiler、delivery/reducer、Judge/latch state machine。
- Integration: durable Replay Index、repair/merge、5 harness package projection。
- Test configuration: 既存の `bun:test`、`tsconfig.tests.json`、`tests/run-tests.ts` を変更せず利用する。
