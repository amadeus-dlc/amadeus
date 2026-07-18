# Performance Design — harness-wiring(swarm-dispatch-enum / Issue #1157)

上流入力(consumes 全数): `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。

## 設計

- PD-W1(PNR-W1): wave 分割は SKILL 手順の条件分岐(「slot 不足なら残 unit を次 wave へ」)として記述 — 実装機構を持たない prose 契約。正しさの並行度非依存は referee check のステートレス per-unit 性に帰着 — 根拠は実装機構 `amadeus-swarm.ts` の handleCheck(:477-517、単一 unit 引数のみを取り共有状態を持たない — U2 FD レビュー iteration 1 観点3で実読確認済み)
- PD-W2(PNR-W2): resolve はバッチ開始時に 1 回 — SKILL 手順の順序(resolve → prepare → fan-out)で固定

## 保証機構(層別)

- prose 層: 手順の順序と条件形の明文(t181 トークンで存在検査)
- referee 層: 既存 per-unit check(変更なし)
