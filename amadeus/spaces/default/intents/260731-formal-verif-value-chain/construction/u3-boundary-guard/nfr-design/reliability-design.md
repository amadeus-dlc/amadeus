# Reliability Design — u3-boundary-guard

上流入力(consumes 全数 — requirements は宣言5件の consumes_absent fallback 先、business-rules/domain-entities は同 unit FD の随伴成果物): requirements, business-logic-model, business-rules, domain-entities

## 障害モードと回復(FD の I1〜I3 を表内で全数カバー)

| 障害 | 挙動 | 根拠 |
|---|---|---|
| u1 未着地で恒常赤 | 正しい検出(I1 — バグではない)。u3 の CI 編入は u1 着地後 | business-logic-model.md I1 / edge block |
| 検査の空文化(語彙衝突) | 許容リスト空 assert+vacuity guard テストで検出 | I2 のテスト設計 (3)、vocabulary-collision-vacuity-guard |
| 偽陽性(正当な配布物で赤) | corpus sweep(u1 着地後の全配布物で 0 件)を AC に含む | I2 / NFR-5 の両側実測 |
| 偽陰性(検査面の漏れ) | 4面の明示列挙(FR-A2 AC と同一集合)+t258 非依存の単独保証 | business-logic-model.md G1 |
| unit 層への誤配置(FS mock 化で偽陽性/偽陰性) | t377 を integration 層へ配置(実 FS を読む)— size purity ratchet が unit 層の fs 使用を機械検出 | business-logic-model.md I3 / fs-tests-integration-first |

## 決定性

検査は LLM 不使用・決定的順序の列挙(domain-entities.md E2)— 同一入力で同一 verdict(I3 の integration 層配置と併せ再現性を担保)。
