# Stakeholder Map — 用語定義の正本一本化 (#2030)

上流入力(consumes 全数): なし(本ステージは consumes を宣言しない)

## Key Stakeholders

| ステークホルダー | 関心 | 影響 |
|---|---|---|
| ユーザー(j5ik2o、プロダクトオーナー) | 正本一本化の裁定者。仕様変更・不可逆操作(ファイル削除・マージ)の承認者 | 決定者 |
| ステージ実行エージェント(全7ハーネス) | 実行コンテキストで正しい同一定義を参照できること | 消費者(最大の受益者) |
| ドキュメント読者・コントリビュータ | `docs/guide/glossary.md`(.ja)だけ見れば意味が確定すること | 消費者 |
| メンテナ(将来の intent) | 用語変更が正本1ペアの編集で完結し、drift guard が漏れを検出すること | 運用者 |
| CI / 検証ゲート | 新設 drift guard(正本↔投影・EN↔JA・禁止面走査)の blocking 集合への追加 | 執行機構 |

## Decision-makers vs. Influencers

- **決定**: ユーザー(正本の所在・削除対象・供給制約は 2026-08-02 裁定済み。以後の仕様変更はエスカレーション正準リスト(4)により再びユーザー専権)
- **影響**: #2030 クロスレビュー2名の実測所見(定義面の全数・矛盾実例・到達性の逆転)が要件の一次入力

## Communication Requirements

- 進捗・裁定は intent record(本 record)を正本とし、mirror Issue #2032 が状態行を一方向同期する
- 対象 Issue #2030 は `in-progress` ラベル同期済み(intent 開始境界で自動付与)。クローズは最終 Bolt PR の `Closes #2030` による(close-after-landing)
- 削除対象(`domain-language.md` / `CONTEXT.md`)はいずれも git 管理下で履歴から復元可能 — 削除 PR のレビューで削除対象の妥当性を明示確認する
