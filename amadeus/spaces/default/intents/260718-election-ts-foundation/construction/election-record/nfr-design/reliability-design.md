# Reliability Design — election-record(nfr-design)

> 上流入力(consumes 全数): performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md、business-rules.md、domain-entities.md

## 互換性設計(NFR-4 の実現機構)

reliability-requirements.md の byte 互換要件を次で実現する:

- renderGoaLine は「GoA[<code>]: 1x<n> 2x<n> … 8x<n>」の全8 bin 常時出力(度数0含む — business-logic-model.md の Q3=A 確定様式)。互換検証は実 parseGoaLine(norm-metrics.ts:688)の in-process import による round-trip テスト(business-rules.md BR-R1 の3 fixture: 度数分布3パターン+内部0 bin+複節コード reject)
- parseGoaLine 側のスキーマは変更しない(NFR-4)— U3 側が写像を負担する一方向設計

## 自己検査の対称設計

- render(生成)⇔ verify(検査)の対称 API(symmetric-pair-review の構造化 — reliability-requirements.md 自己検査節)。verifySelf は render 出力を常時検査し、検査は3クラス(票数・度数再計算・時系列逆行 — BR-R4)の判別ユニオンで失敗理由を返す
- fallible API は `Result<T, E>` で throw しない。observability は N/A(reliability-requirements.md Observability 節の設計反映 — 常駐なし、可視性は記録文書自体)
