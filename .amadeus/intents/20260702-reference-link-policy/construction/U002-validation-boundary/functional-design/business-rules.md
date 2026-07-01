# Business Rules

## 目的

U002 の業務ルールは、validator が検出する PR 記録欠落と PRリンク形式を固定する。

## 業務ルール

| 識別子 | 規則 | 根拠 | 状態 |
|---|---|---|---|
| BR001 | Construction 完了状態では、対象 Bolt の `pr.md` を必須 Bolt 成果物として扱う。 | [Issue #286](https://github.com/amadeus-dlc/amadeus/issues/286) | adopted |
| BR002 | `pr.md` の Pull Request 欄は、GitHub Pull Request URL を持つ Markdown リンクとして扱う。 | [Issue #286](https://github.com/amadeus-dlc/amadeus/issues/286) | adopted |
| BR003 | `construction/traceability.md` の PR 欄は、Construction 完了状態では GitHub Pull Request リンクを持つ。 | [Issue #286](https://github.com/amadeus-dlc/amadeus/issues/286) | adopted |
| BR004 | PR番号は `[PR #nnn](https://github.com/<owner>/<repo>/pull/<nnn>)` の形を validator で検出する。 | [R002](../../../inception/requirements/R002-link-target-rules.md) | adopted |
| BR005 | GitHub permalink の全件品質確認は eval または人間判断に残す。 | [R004](../../../inception/requirements/R004-validation-boundary.md) | adopted |

## 例外

PR URL がまだ存在しない作業中の Bolt では、`pr.md` を必須にしない。

ただし、Construction 完了状態または gate passed の状態では、PR 記録を必須にする。

## Intent Contracts

| 識別子 | 種別 | 条件 | 根拠 | 状態 |
|---|---|---|---|---|
| PRE001 | 事前条件 | 対象 Construction は `targetBolts` と `construction.bolts[]` で対象 Bolt を特定できる。 | [B003](../../../inception/bolts/B003-validation-boundary.md) | adopted |
| POST001 | 事後条件 | `pr.md` 欠落を validator が fail として報告する。 | [Issue #286](https://github.com/amadeus-dlc/amadeus/issues/286) | adopted |
| POST002 | 事後条件 | PR欄の裸の `PR #nnn` を validator が fail として報告する。 | [Issue #286](https://github.com/amadeus-dlc/amadeus/issues/286) | adopted |
| INV001 | 不変条件 | validator の pass は内容承認ではなく、参照できる構造条件として扱う。 | [U002 Unit Design](../../../inception/units/U002-validation-boundary/design.md) | adopted |

## 未確認事項

- なし。
