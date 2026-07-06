# build-test results（260706-docs-consistency）

上流入力: [code-generation-plan.md](../docs-consistency/code-generation/code-generation-plan.md)、[code-summary.md](../docs-consistency/code-generation/code-summary.md)

## 実行記録（fresh、2026-07-06、origin/main 6894aee9 基点の branch 上）

| 検証 | コマンド | 結果 |
|---|---|---|
| 型検査（build 相当） | `npm run typecheck`（test:all 内） | pass |
| 横断 1: リンク切れ | `skill-englishization-rollout-plan` の横断 grep | pass（record 外は skill-language-policy の `git log --` 履歴参照文字列のみ = 意図的） |
| 横断 2: Operation 矛盾表現 | 5 文字列の単純横断 grep（docs/amadeus + memory、record 除外） | pass（0 件） |
| 標準検証 | `npm run test:all` | pass（exit 0） |
| 構造検証 | AmadeusValidator（. + 260706-docs-consistency） | pass |

## 検出力・裏取りの証跡

- reviewer（architecture、3 反復）が grep・test:all・validator を毎反復independently再実行し一致確認。it1 = state 同一ファイル内矛盾 + 「2 層」表現の実装乖離（lifecycle-v2.ts 実測）、it2 = boundary 文書の空約束リンク、it3 = 全解消 READY。
- 文字列回避方式により、NFR-1(3) は文脈判定なしの単純横断 grep = 0 件で機械判定可能。

## 実施後の状態

- rollout-plan 英日は存在しない（git rm 済み）。参照元 4 件はリンク更新済み（デッドリンク 0）。
- Operation 記述は overview / scopes / state / construction / operation.md / boundary / difference-response-plan（英日）で 3 層に統一。
