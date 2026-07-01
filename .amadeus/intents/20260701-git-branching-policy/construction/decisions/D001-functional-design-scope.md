# D001: Functional Design の対象 Unit と Domain Map 反映範囲

## 状態

active

## 文脈

Issue #254 は、Git ブランチ戦略を Amadeus 自己開発の steering policy として扱う。

Inception では U001 と U002 が定義済みであり、どちらも Construction の対象 Bolt に対応している。

## 判断

U001 と U002 の Functional Design を作成する。

UI 構成はないため、`frontend-components.md` は作らない。

Git ブランチ戦略 policy は既存の `BC001 自己開発運用` の範囲に収まるため、Domain Map と Context Map は更新しない。

## 影響

Functional Design は U001 と U002 の core 3 文書に限定する。

Domain Map と Context Map には候補を載せない。

## 根拠

- [U001 Unit Design](../../inception/units/U001-git-branching-policy/design.md)
- [U002 Unit Design](../../inception/units/U002-policy-traceability-validation/design.md)
- [Domain Map](../../../../domain-map.md)
- [Context Map](../../../../context-map.md)
