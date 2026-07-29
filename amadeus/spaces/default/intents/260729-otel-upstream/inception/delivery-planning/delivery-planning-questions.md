# Delivery Planning — 質問票

Stage: delivery-planning (inception)
Depth: Standard（文脈適応で 5 問）
Context: `requirements.md`、`components.md`、`unit-of-work.md`（11 Unit）、`unit-of-work-dependency.md`（DAG）、`unit-of-work-story-map.md`、`team-practices.md` を参照済み。2.7 がトポロジを産出済みのため、本ステージは経済的序列（Bolt 順）を決める。

## 判定と根拠（E-OC1 3段順序）

- Q1-Q5: 選挙不要 — ソロ運用。ユーザー本人が AskUserQuestion で直接回答（HUMAN_TURN 実測）
- leader 承認: ユーザー本人の直接回答をもって承認済み 2026-07-29T07:55:25Z

---

## Q1. シーケンシング方針は？

scope-definition Q3 で risk-first は確定済み。Bolt 序列への適用形を確認する。

- A. risk-first と walking-skeleton-first の一致 — U1 が skeleton かつ最大リスク（Bun Context・Logs API・bundle・性能）なので両 heuristic が同じ序列を与える。U1 以降は依存順に従い、並行可能な Unit は swarm バッチで消化する
- B. 厳密な WSJF スコアリングを全 Bolt に適用する
- X. Other (please specify)

[Answer]: A. risk-first と walking-skeleton-first の一致 — U1 が skeleton かつ最大リスク。以降は依存順＋並行バッチ

## Q2. Bolt 粒度は？

- A. 原則 1 Unit = 1 Bolt、U9＋U10（ともに S・同一 Store 系）のみ 1 Bolt にバンドル。計10 Bolt
- B. すべて 1 Unit = 1 Bolt（11 Bolt）
- C. 並行可能な Unit を積極的にバンドルする（5-6 Bolt の粗粒度）
- X. Other (please specify)

[Answer]: A. 原則 1 Unit = 1 Bolt、U9＋U10 のみ 1 Bolt にバンドル。計10 Bolt

## Q3. 並行実行とゲート方式は？

team.md 制約: 同時アクティブ builder は 1 intent あたり最大4。swarm は prepare → 並列 fan-out → check → finalize が既定。

- A. gated モードの swarm — DAG 上の独立 Unit はバッチで並行 fan-out し、バッチ境界ごとに人間のゲート承認を挟む。監査基盤の置換という重要度に見合う
- B. autonomous モードの swarm — バッチ境界のゲートなしで連続実行
- C. 直列実行のみ（並行化しない）
- X. Other (please specify)

[Answer]: A. gated モードの swarm — バッチ境界ごとに人間のゲート承認

## Q4. 外部依存は？

- A. なし — `@opentelemetry/api` 等の依存追加は npm 経由で lead time を持たず、外部チーム・承認・データ依存もない。external-dependency-map は軽量（依存追加の ADR 文書化義務のみ記載）
- B. 外部依存がある
- X. Other (please specify)

[Answer]: A. なし — external-dependency-map は軽量（依存追加の ADR 文書化義務のみ記載）

## Q5. 最優先で潰すリスクは？

- A. Bun Context Manager の検証と Logs API 採否 — U1 の検証項目の最上位に置く（feasibility R-1/R-2、テスト先行順序の1-2番目と整合）
- B. 失敗契約（例外＋latch）の成立 — テスト先行順序の1番目どおり
- C. 両方を U1 の同等最優先とする
- X. Other (please specify)

[Answer]: A. Bun Context Manager の検証と Logs API 採否を U1 の検証項目の最上位に置く
