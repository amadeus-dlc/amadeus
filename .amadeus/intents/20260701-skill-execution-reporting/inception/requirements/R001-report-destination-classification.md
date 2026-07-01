# R001: 報告先分類

## 要求

- skill 実行中に見つかった問題や懸念を、現在の Intent 対象、後続 Issue 候補、報告不要のいずれかに分類できる。

## 受け入れ条件

- 現在の Intent 対象に含める条件を、対象境界、要求、Use Case、Unit、Bolt のいずれかへ直接追跡できる場合として説明している。
- 後続 Issue 候補に切り出す条件を、現在の Intent の成功条件には必要ないが、Amadeus の skill、template、validator、eval、docs、運用に影響する場合として説明している。
- 報告不要にする条件を、軽い感想、すぐ解消済みの作業メモ、現在の判断に影響しない一時的な気づきとして説明している。
- validator の `pass` を内容承認として扱わない制約を分類基準から読める。

## 根拠

- [Issue #248](https://github.com/amadeus-dlc/amadeus/issues/248) は、skill 実行上の問題や懸念を現在の Intent 成果物と混ぜずに扱う必要を示している。
- `ideation/scope.md` は、現在の Intent に無関係な改善を自動で混ぜることを対象外にしている。

## 未確認事項

- なし。
