# Code Summary: convergence-toolchain(U2)

上流入力(consumes 全数): business-logic-model、business-rules、domain-entities、unit-of-work

## 変更ファイル(コミット 7c5722421+90134e2d0 — builder 130f46778+e471c7d0b の cherry-pick、fidelity diff 空)

| ファイル | 内容 |
|---|---|
| `plugins/pr-convergence/tools/pr-convergence-gh-runner.ts`(249行) | C6 — createGhRunner(readiness 2段)・GhRunner/GhError・fetchRawPrState(raw まで)・argv 配列 spawn。葉 |
| `plugins/pr-convergence/tools/pr-convergence-predicate.ts`(269行) | C3 — classifyThread 決定表・MergeStateStatus/PrState parse(未知値 throw)・evaluateConvergence(FR-3b 単一定義)・resolveMergeable(MAX=5/10s シーム) |
| `plugins/pr-convergence/tools/pr-convergence-ledger.ts`(372行) | C4 — Severity.parse・extractTerminalRefs・isBotAuthor(__typename)・ReviewThread.parse(bodyDigest 化)・fetchAllReviewThreads(全数ページング)・ThreadLedger(humanOnly 分離・terminalized) |
| `plugins/pr-convergence/tools/pr-convergence-cli.ts`(499行) | C5 — status/report/override・renderReport・HUMAN_TURN 検証・decision spawn シーム(harness 中立パス導出) |
| `plugins/pr-convergence/plugin.json` | 最小 manifest(name+tools 4本。stages/seams/fragments 空 — U3 が拡張。build fail-closed 対応の執行) |
| テスト3本+fixture 6本+README | t446(unit 純関数)/t447(ledger integration)/t448(CLI integration)。実測4 PR+合成2ページ |

## 依存辺(grep 実測 — 設計6辺と一致)

PRED→RUNNER 型のみ / LEDGER→RUNNER / LEDGER→PRED 型のみ(分類器は注入)/ CLI→3者。core import 0 件。

## 外部 seam 語彙(A-1 確定)

`__typename==="Bot"` 実在(coderabbitai/cursor)。mergeStateStatus 実測値 UNKNOWN/BLOCKED/DIRTY(merged PR でも初回 UNKNOWN — ADR-4 retry 前提の裏付け)。replied-unresolved の実測正例 = PR #1945。severity 写像表は実測6表記のみ(未実測は null)。

## 検証結果(conductor 再実行 — 再接地後)

- typecheck 0 / lint 0 / build 0(tracked 不変)/ plugin 系11スイート 174 pass 0 fail(t377 境界ガード含む)
- builder 側で test:ci 全体 843 files PASS を実測済み

## 申し送り

- 実 gh / 実 amadeus-log.ts の実プロセス疎通は未検証(シーム注入のみ — U3 の E2E が覆う面)
- no-silent-drop BASELINE_INVALID は base 由来(census に plugins/ 不含・findings 0 件)— rebind は PR 時に conductor(c3-nsd-rebind)
