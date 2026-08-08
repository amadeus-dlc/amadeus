# Unit Test Instructions — 260807-intent-2328-tests-e2e-au

上流入力(consumes 全数): code-generation-plan（対象の導出元）、code-summary（実測転記元）

## 適用範囲

本 intent の変更は e2e 層のテスト自体の修正であり、**unit 層への新規テスト追加はない**（欠陥がテストコード側にあり、既存 e2e テストの現失敗がそのまま TDD Red — 修正で Green へ）。

## unit 層の回帰確認

- 患部集合は tests/e2e/ に限られ、unit 層への diff はゼロ（`git diff --stat a5621236c HEAD -- tests/unit/` = 空を機械確認）
- unit 層の実行は PR #2461 の CI Tests（smoke+unit+integration）green を正規判定とする
- 除外4ファイルのうち unit 層該当なし（4件とも tests/integration/）
