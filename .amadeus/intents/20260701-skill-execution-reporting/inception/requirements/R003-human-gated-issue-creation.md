# R003: 人間承認付き Issue 候補化

## 要求

- GitHub Issue 作成は人間承認を前提にし、agent は後続 Issue 候補として提示できる。

## 受け入れ条件

- agent が人間の承認なしに GitHub Issue を大量作成しないことを skill から読める。
- 後続 Issue 候補には、Issue タイトル案、背景、影響、推奨対応、根拠、現在の Intent から外す理由を含める。
- 現在の Intent に含めない問題は、traceability や decisions に混入させず、作業報告または人間確認へ切り出す。
- 人間が Issue 化を承認した場合だけ、GitHub Issue への起票を実行できる。

## 根拠

- `ideation/scope.md` は、人間の判断なしに GitHub Issue を大量作成することを対象外にしている。
- `.amadeus/steering/external-systems.md` は、GitHub を Issue、Pull Request、review comment、CI 状態の外部システムとして定義している。

## 未確認事項

- なし。
