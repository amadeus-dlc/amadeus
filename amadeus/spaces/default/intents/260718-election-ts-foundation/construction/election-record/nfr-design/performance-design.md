# Performance Design — election-record(nfr-design)

> 上流入力(consumes 全数): performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md、business-rules.md、domain-entities.md

## 設計方針

performance-requirements.md の「O(n) 単一走査・SLO 非設定」を次で実現する:

- render(記録生成)は票列 1 走査で GoA 度数・タイムライン・persist 素案を同時構築(business-logic-model.md の生成フロー)。verifyReservations/verifySelf も各 1 走査(business-rules.md BR-R3/R4 の検査対象別)
- GoA 度数分布は長さ8の固定配列への積算 — 中間 Map・ソートを設けない(全8値常時出力の Q3=A 設計と一体)

## 検証設計

- 決定性(BR-R5 の同一入力 deep-equal)のみをテスト対象とし、性能ベンチマークは追加しない(performance-requirements.md 測定と検証節の写像)
