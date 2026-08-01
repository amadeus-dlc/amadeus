# Functional Design — 質問票（U1: otel-walking-skeleton）

Stage: functional-design (construction) / Unit: otel-walking-skeleton
Context: `unit-of-work.md` U1、`requirements.md`（FR-EXP-1/6, FR-EVT-2〜6, FR-TRC-2/3, FR-DST-1/2, NFR-1〜3, VER-3）、`components.md`・`component-methods.md`・`services.md` を参照済み。設計の大部分は #1678 と ADR-1〜6 で確定済みのため、Construction 相の最小限の2問。

## 判定と根拠（E-OC1 3段順序）

- Q1-Q2: 選挙不要 — ソロ運用。ユーザー本人が AskUserQuestion で直接回答（HUMAN_TURN 実測）
- leader 承認: ユーザー本人の直接回答をもって承認済み 2026-07-29T08:04:59Z

---

## Q1. skeleton の代表接続対象は？

#1678 は「代表1 CLI・1 hook・1 subprocess だけを Walking Skeleton へ接続」とする。どれを選ぶか。

- A. CLI: `amadeus-log.ts`（decision/answer 発行、canonical Event の典型）／hook: `amadeus-session-end.ts`（短命 process・flush trigger との関連）／subprocess: session-end からの projector 起動（現行の子 process 経路そのもの）
- B. CLI: `amadeus-state.ts`（状態遷移の中核）／hook: `amadeus-session-start.ts`／subprocess: 別のもの
- X. Other (please specify)

[Answer]: A. CLI: `amadeus-log.ts`／hook: `amadeus-session-end.ts`／subprocess: session-end からの projector 起動

## Q2. Logs API 採否の検証方法は？

#1678 の ADR 事項。「`@opentelemetry/api-logs` 利用か最小 EventRecord Interface か」の比較方法。

- A. api-logs を先に spike — api-logs で最小実装を組み、Bun/bundle 互換・API 形状の検証を先に行い、不成立または不適なら最小 EventRecord Interface に切り替える（依存追加が1回で済む可能性が高い）
- B. 両案を最小実装で並行比較 — 評価は厳密になるが skeleton の工数が増える
- C. 最小 EventRecord Interface を先に実装 — 依存を増やさない安全側から始める
- X. Other (please specify)

[Answer]: A. api-logs を先に spike — 不成立または不適なら最小 EventRecord Interface に切り替える
