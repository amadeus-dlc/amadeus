# Construction ノート

## 対象タスク

| タスク | 状態 | 方針 | 証拠 |
|---|---|---|---|
| T001 | 完了 | Amadeus skill 確認時の skill-forge 観点を README に追加する。 | [test-results.md](test-results.md) |
| T002 | 完了 | skill-forge の責務境界を README 更新に限定する。 | [test-results.md](test-results.md) |

## 実行方針

Amadeus skill を確認または変更するときの確認入口として、README と README.ja.md に `skill-forge` を明記する。

確認観点は skill 境界、trigger description、本文指示、eval coverage、Codex metadata に限定した。

## 実装判断

`skill-forge` の SKILL.md は変更していない。

README は既存 skill の挙動を変えず、確認時の参照観点だけを追加した。

## 検証入口

| 観点 | 結果 | 根拠 |
|---|---|---|
| 入力 | pass | Inception の R002 と U002 Functional Design を根拠にした。 |
| スコープ | pass | README の確認観点追加に限定した。 |
| 互換性 | pass | skill-forge の実体や既存 Amadeus skill 契約は変更していない。 |

## 未確認事項

- PR は未作成である。
