上流入力(consumes 全数): business-logic-model, business-rules, requirements, technology-stack

# Reliability Requirements — core-harness-enums

> 上流入力の使用箇所: business-rules.md の BR-3/BR-4、business-logic-model.md の決定木と swarm resolve 分岐、requirements.md の NFR-4 を根拠とする。

## 対象の概要

doctor arm と列挙の信頼性は「誤検出しない・静かに落ちない」ことに集約される。

## 信頼性の仕組み

- **フロア判定は決定的**: named constant の下限と semver 比較(business-rules.md BR-3)。kimi バイナリ不在は「未導入」として明確に表示し、失敗と混同しない(business-logic-model.md 決定木)
- **probe は advisory**: 機能 probe の失敗は doctor 全体を落とさず、未検証として表示(business-rules.md BR-4、requirements.md NFR-4)
- **swarm の未知 driver は fail-closed**: 既存 resolveDriver の契約を継承し、静かな fallback を作らない(business-logic-model.md §swarm resolve)
