# Construction ノート

## 対象タスク

| タスク | 状態 | 方針 | 証拠 |
|---|---|---|---|
| T001 | 完了 | source skill と昇格先成果物の確認境界を README に追加する。 | [test-results.md](test-results.md) |
| T002 | 完了 | 今回の変更で skill 昇格が不要であることを確認する。 | [test-results.md](test-results.md) |

## 実行方針

README と README.ja.md に、Amadeus source 変更時は `skills/amadeus-*` と `.agents/skills/amadeus-*` の両方を確認する方針を追加する。

今回の実変更は README と Amadeus 成果物であり、skill 本文は変更していない。

## 実装判断

skill 本文を変更していないため、`dev-scripts/promote-skill.ts` による昇格は実行しない。

代わりに source skill と昇格先成果物の一覧が同じであることを確認する。

## 検証入口

| 観点 | 結果 | 根拠 |
|---|---|---|
| 入力 | pass | R003 と U002 Functional Design を根拠にした。 |
| スコープ | pass | README 上の確認方針と一覧確認に限定した。 |
| 互換性 | pass | skill 本文を変更せず、昇格処理も不要と判断した。 |

## 未確認事項

- PR は未作成である。
