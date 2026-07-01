# Construction Notes

## 対象タスク

- B003/T001
- B003/T002
- B003/T003

## 実行方針

- Skill Contract、validator、evaluator、eval を decision review の内容承認として扱わない。
- 既存契約が足りている場合は、不要な変更をしない。
- evaluator の本格実装が必要になった場合は後続 Issue 候補として報告する。

## 対象外

- validator を意味検証へ拡張しない。
- evaluator の本格実装はしない。
- `codecov.yml` は変更しない。

## 実装判断

- Skill Contract catalog に `amadeus-decision-review` の契約を追加し、生成済み contract 参照を再生成した。
- validator skill に、decision review の質問要否や採用判断を validator 結果だけで決めないことを追記した。
- template eval に `amadeus-decision-review` と公開 phase skill の Decision Review 節を確認する text contract を追加した。

## 検証入口

- `npm run typecheck`
- `npm run contracts:check`
- `npm run diff:check`

## 未確認事項

なし。
