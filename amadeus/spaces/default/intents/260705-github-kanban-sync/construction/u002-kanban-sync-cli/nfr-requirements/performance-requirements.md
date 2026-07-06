# Performance Requirements — u002-kanban-sync-cli

上流入力: [business-logic-model.md](../functional-design/business-logic-model.md)、[business-rules.md](../functional-design/business-rules.md)、[requirements.md](../../../inception/requirements-analysis/requirements.md)

## 要求

sync 1 回の処理時間は「hook の timeout 60 秒以内に十分収まる」ことを実用条件とする（U003 BR-10 が上限を規定する）。
対象は十数 Intent × 1 card 1 リクエスト（D-AD4）であり、律速は GraphQL の往復である。性能チューニングは行わない（N3）。実測は walking skeleton（B002）の board 確認時に行い、60 秒に近づく場合だけ D-AD4 の束ね方を見直す。
規模前提の注記: 60 秒の実用条件は現在規模（十数 Intent）での見込みであり、scalability の許容上限（100 未満）まで伸びた場合に収まる保証ではない。上限接近時は実測で再評価する（暫定機構のため事前の定量見積もりはしない）。

## 根拠と検証

requirements.md の N1〜N5 を本 Unit へ具体化したものであり、新しい NFR は追加しない（暫定機構 C07）。検証は build-and-test の TDD と walking skeleton の board 実確認で行う。
