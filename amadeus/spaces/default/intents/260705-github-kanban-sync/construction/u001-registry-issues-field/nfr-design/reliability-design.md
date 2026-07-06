# Reliability Design — u001-registry-issues-field

上流入力: [performance-requirements.md](../nfr-requirements/performance-requirements.md)、[security-requirements.md](../nfr-requirements/security-requirements.md)、[scalability-requirements.md](../nfr-requirements/scalability-requirements.md)、[reliability-requirements.md](../nfr-requirements/reliability-requirements.md)、[tech-stack-decisions.md](../nfr-requirements/tech-stack-decisions.md)、[business-rules.md](../functional-design/business-rules.md)

## 設計

信頼性設計は「互換検証の設計」だけである。issues 有無混在の fixture を用意し、既存読み手（amadeus-lib.ts の IntentRegistryEntry 経由の読み取り、validator の Intent Registry 検査）が従来どおり動くことをテストで固定する。

## 判断の位置づけ

nfr-requirements の要求を設計へ写像したものであり、新しい機構は追加しない（暫定機構 C07）。実装の一次情報は functional-design と application-design の契約である。
