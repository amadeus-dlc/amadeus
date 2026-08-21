# Intent Backlog — 260821-fmc-retirement

上流入力: `scope-document.md` の In Scope 10 項目を実装単位へ整列。優先順は「本線 green を保つ削除順序」(scope-definition-questions Q3=A)。

## バックログ(優先順)

| # | 項目 | 内容 | 依存 |
|---|---|---|---|
| B1 | 参照棚卸しの確定 | 153 テストの FMC 専用/混在の機械分類、docs・scripts・packager manifest・runner の全消費者 census(検索述語併記) | なし |
| B2 | コード面の一括削除 | plugins/formal-model-check、specs/tla、config 2 項、ci.yml job+集約、テスト削除/除去、coverage-registry regen、patch-allowlist 整理、runner-gen 再生成、build+投影再生成 | B1 |
| B3 | docs 対訳の除去 | guide / harness-engineering / reference の FMC 記述除去、t3028 整合 | B1(B2 と同一 Bolt 可) |
| B4 | ノルム整理 PR | team.md 形式検証面 + project.md fmc/tla 系 cid の整理(単独ノルム PR) | B2 着地 |
| B5 | Issue クローズ | FMC 系 open Issue(#3246 ほか棚卸し分)を理由コメント付きクローズ | B2 着地 |

## 補足

- B2 は「テスト+コードの同時削除で各 PR 単独 green」を維持する範囲で1 Bolt(必要なら B3 同梱)を志向
- B4/B5 はワークフロー内の後段ステージ(pr-convergence 後の申し送り)または完了ゲート直前に実行
- 全項目は intent-capture の裁定(Q1〜Q4)へ trace 済み
