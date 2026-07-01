# Construction Notes

## 対象タスク

- B003/T001
- B003/T002
- B003/T003

## 実行方針

- 前提不成立分類は text contract で確認する。
- repo 内代表例は `.amadeus/` 成果物に留める。
- 配布対象 skill では、source skill、昇格先成果物、host environment、stage 前提の一般説明にする。

## 対象外

- GitHub Issue の自動作成は行わない。
- repo 内代表例を配布対象 skill に書かない。

## 実装判断

- eval の RED を先に確認し、その後 skill 文書と契約を実装して GREEN にした。
- `amadeus-decision-review` の text contract に、`Issue #277` と `Issue #272` の除外条件を追加した。

## 検証入口

- `npm run test:it:amadeus-templates`
- `npm run test:it:amadeus-contracts`
- `npm run diff:check`

## 未確認事項

なし。
