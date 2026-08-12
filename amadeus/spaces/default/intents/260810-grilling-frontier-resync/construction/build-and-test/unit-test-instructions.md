# Unit Test Instructions

**Intent**: 260810-grilling-frontier-resync / **Stage**: build-and-test (3.6) / **Test Strategy**: Comprehensive

上流入力(consumes 全数): `code-generation-plan.md` / `code-summary.md` / `pr-convergence-report.md`(各 Unit の実装実績と検証実測 — 本書の検証対象の正本)、`unit-of-work.md`(U1/U2/U3 の完了条件)、`requirements.md`(FR/NFR の受け入れ基準)、`bolt-plan.md`(Bolt ごとの検証列)。

## 対象と根拠

Comprehensive 戦略だが、検査は**承認済み FR/NFR と実在境界へ trace できる範囲**に限る(cid:build-and-test:bt-proportional-selection)。本 intent の unit 層は純関数の述語に限定し、実 FS を使う検証は integration 層へ置く(cid:code-generation:fs-tests-integration-first)。

| # | テスト | trace 先 | 実行 |
|---|---|---|---|
| U-1 | `tests/unit/t530-grilling-marker-predicate.test.ts` | FR-CONTRACT-4(i) 検知面 / BR-U2-1 / BR-U2-2b / BR-U2-4(count 側 vacuity guard)/ BR-U2-5 | `bun test tests/unit/t530-grilling-marker-predicate.test.ts` |
| U-2 | `tests/unit/t199-grilling-distribution.test.ts` | NFR-2(配布同一性)/ FR-PROJ-4 | `bun test tests/unit/t199-grilling-distribution.test.ts` |

## 合否

各 exit 0。**パス集合の実在を実行前に配列展開で機械確認**し、実行後に runner の `Ran ... across M files` と期待ファイル数を照合する(cid:build-and-test:test-path-set-completeness / cid:build-and-test:bt-path-existence-array-expansion)。exit code はパイプを介さず個別取得する(cid:code-generation:no-exit-capture-through-pipe)。
