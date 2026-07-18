# Reliability Requirements — driver-contract-core(swarm-dispatch-enum / Issue #1157)

上流入力(consumes 全数): `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。

## 要件

- RNR-1(決定性): 同一入力(raw, harness)に対し常に同一の `DriverResolution`(`business-logic-model.md` 決定表の全射性。受け入れ = 16 セル matrix テスト)
- RNR-2(エラー分類): rejected = 回復可能な利用者エラー(exit 1・明示メッセージ・副作用ゼロ)/ 内部矛盾(未知 harness が型を通過等)= defect として fail-fast(`requirements.md` FR-2 と error-classification 原則の適用)
- RNR-3(監査整合): degrade の監査可能性は resolve でなく prepare 経路が担保(`business-rules.md` BR-4 の emit 単一化)— resolve 自体の失敗は audit を汚さない(受け入れ = resolve 実行前後で audit 行数不変)

## 検証

- 可用性 SLO は非該当(常駐サービスなし — observability-setup:c3 の既決に整合)— 明示 N/A
