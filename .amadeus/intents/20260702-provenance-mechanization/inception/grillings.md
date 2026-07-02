# Grillings

## 一覧

| ID | 主題 | 対象 | 状態 | 主な確定判断 | 反映先 | 詳細 |
|---|---|---|---|---|---|---|
| G001 | provenance 記録の置き場所と検査境界 | Intent | completed | 記録先は Intent 直下の `provenance/`。既存 Intent への遡及適用はしない。記録先の存在確認は validator に含めず provenance:check が担う。`examples/skill-provenance.json` とは並立させる。 | [requirements.md](requirements.md)、[decisions.md](decisions.md) | [G001](grillings/G001-inception-record-contract.md) |
