# Build & Test Summary — election-ts-foundation

> 上流入力(consumes 全数): code-generation 各ユニットの code-generation-plan.md と code-summary.md、requirements.md、bolt-plan.md、team-practices.md

## 総括(全5 Bolt 着地後の main 実測 — 2026-07-19)

- **main 統合スイート**: `bash tests/run-tests.sh --ci` → **RESULT: PASS / Failed assertions: 0**(集計出力転記)。選挙 e2e 2本(t237/t241)→ **Ran 3 tests / 0 fail**
- **着地 PR**: #1227(Bolt 1)/ #1231(Bolt 2)/ #1233(Bolt 3)/ #1235(Bolt 4 — e2 レビュー REVISE→M1 是正→READY GoA 2)/ #1236(Bolt 5)— 全てユーザー承認スカッシュマージ(各 code-summary.md の生成物と 1:1)
- **FR-0 受け入れ実演(ADR-6 (ii))**: ノルム無参照 subagent が SKILL 文書+指令のみで実選挙1件を完走(fr0-acceptance-demo.md — requirements.md FR-0 受け入れ基準の実演層)。常設保証は t241 機械実行器(CI 層)が担う
- **成功指標への接続**: 違反カウントゼロ+照合指摘ゼロ(D-03)の機械化面 = verify verb(FR-6)+t242 語彙ガード(bolt-plan.md Bolt 5)が CI 常設

## 残課題(スコープ外の申し送り)

- e2 レビュー留保(#1235): reopen 跨ぎの hold 裁定履歴継承は運用未実測(実装+単体はテスト済み — 初回の実運用選挙で観測する)
- 型付き readTally parse(明示 deferral — PR #1235 本文)
