# Build & Test Results — election-ts-foundation

> 上流入力(consumes 全数): code-generation 各ユニットの code-generation-plan.md と code-summary.md、requirements.md、bolt-plan.md、team-practices.md

## 実測結果(2026-07-19、branch head 時点 — 状態区分は PENDING/PASS を分離)

| 対象 | 結果 | 実測 |
|---|---|---|
| 着地済み Bolt 1-3(main cf92b6813→#1233)| **PASS** | 各 PR の head CI green+マージ着地(GitHub 実測)。main 上で選挙スイート実行済み(Bolt 3 統合時 57 テスト 0 fail) |
| Bolt 4 head(bolt/cli-complete c5e7901c9 系)| **PASS(branch head)** | 選挙スイート8ファイル `bun test` — **Ran 63 tests / 0 fail**(集計出力転記)。PR #1235 CI: Coverage Report pass / typecheck-lint-drift-tests pass(gh pr checks 実測) |
| Bolt 5 head(bolt/skill-wrap)| **PASS(branch head)** | t242 5 pass・promote:self:check exit 0。PR #1236 CI: Coverage Report pass / typecheck-lint-drift-tests pass(gh pr checks 実測) |
| main 統合後の全スイート再実測 | **PASS**(2026-07-19 閉包) | #1235・#1236 着地後の main 統合ツリーで `bash tests/run-tests.sh --ci` → RESULT: PASS・Failed assertions 0(集計出力転記)+選挙 e2e 2本 3 tests 0 fail |
| FR-0 受け入れ実演(ADR-6 (ii))| **PASS**(2026-07-19 閉包) | ノルム無参照 subagent が指令列 distribute→collect-wait→tally-ready→render→verify→done で完走・record 生成(fr0-acceptance-demo.md に全文転記) |

## 判定方針

PENDING 2行は 2026-07-19 に閉包済み(上表)。閉包前はステージ approve へ進まない方針を維持した(検証は実行結果からのみ — 検証劇場 Forbidden。PENDING/PASS の相互代用をしない — deployment-execution:c3 の様式)
