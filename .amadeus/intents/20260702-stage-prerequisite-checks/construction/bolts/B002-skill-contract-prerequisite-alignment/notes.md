# Construction Notes

## 対象タスク

- B002/T001
- B002/T002
- B002/T003

## 実行方針

- Skill Contract は catalog を変更し、生成物は `npm run contracts:generate` で更新する。
- phase skill は source skill を編集し、`promote-skill` で昇格先成果物へ同期する。
- `.agents/skills/**` を手動同期しない。

## 対象外

- Skill Contract の型構造は変更しない。
- 全 skill の契約一括移行は行わない。

## 実装判断

- `amadeus-decision-review` の Skill Contract に `PRE003` と `FB002` を追加した。
- `POST001` は `upstream_feedback_required` を含む分類に更新した。
- Ideation、Inception、Construction の Decision Review 節に stage 前提確認を追加した。

## 検証入口

- `npm run test:it:amadeus-contracts`
- `npm run test:it:promote-skill`
- `npm run diff:check`

## 未確認事項

なし。
