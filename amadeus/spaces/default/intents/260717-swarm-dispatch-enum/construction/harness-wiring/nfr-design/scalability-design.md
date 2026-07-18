# Scalability Design — harness-wiring(swarm-dispatch-enum / Issue #1157)

上流入力(consumes 全数): `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。

## 設計

- SCD-W1(SCR-W1): wave 分割は「残 unit リストの先頭から slot 数だけ」の単純規則 — 状態を持たず、SKILL の条件文1つで表現
- SCD-W2(SCR-W2): 4 harness の invoke-swarm 節は同一の骨格(resolve → 分岐 → fan-out → referee)で記述し、差分は fan-out 行のみ — t181 トークン拡張で存在検査(検証機構の確定: 新規テスト機構は作らず t181 の REQUIRED_TOKENS 追記のみ)

## 保証機構(層別)

- prose 層: 骨格の同型(t181 存在検査+レビュー)
