# D004: validator 検出境界

## 状態

active

## 判断

完了済み Construction の `pr.md` 欠落と PRリンク形式は、validator の fail 対象にする。

GitHub permalink の全件品質確認は、eval または人間判断に残す。

## 根拠

- [Issue #286](https://github.com/amadeus-dlc/amadeus/issues/286) で、PR作成後の `pr.md` 欠落を validator で検出する必要が確認された。
- [R004](../../inception/requirements/R004-validation-boundary.md) は、validator、eval、人間判断の分担を求めている。
- [U002 Functional Design](../U002-validation-boundary/functional-design/business-rules.md) で、構造検出対象を定義した。

## 影響

- `skills/amadeus-validator/validator/stages/construction/bolt-preparation.ts` は、完了済み Construction の `pr.md` 必須条件を検査する。
- `skills/amadeus-validator/validator/AmadeusValidator.ts` は、GitHub Pull Request リンク形式を検査する。
- `.agents/skills/amadeus-validator/**` は source skill と同じ内容へ昇格する。

## 代替案

PR記録欠落を人間判断だけに残す案は採用しない。

今回の欠落は構造的に検出できるため、validator で fail にする。

## 未確認事項

- なし。
