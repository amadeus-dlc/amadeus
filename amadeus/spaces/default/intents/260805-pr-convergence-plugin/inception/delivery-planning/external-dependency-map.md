# External Dependency Map

上流入力(consumes 全数): requirements、components、unit-of-work、unit-of-work-dependency、unit-of-work-story-map

## 依存マップ

| 外部依存 | 消費 Bolt | 性質 | ゲート条件・緩和 |
|---|---|---|---|
| GitHub GraphQL API(reviewThreads / mergeStateStatus / `__typename` 語彙) | Bolt 2 | 外部 seam(A-1 — 未実測語彙) | 実装前に実 PR で実測し fixture 化。不達時は loud fail(FR-4b) |
| gh CLI(実行環境の認証状態) | Bolt 2、Bolt 3(E2E) | 実行環境依存 | readiness 検査(ADR-6 の4契約)。CI では fixture 駆動でネットワーク非依存 |
| 外部 bot レビュアー(CodeRabbit / Bugbot) | 運用時のみ(全 Bolt の PR 収束にも適用 — dogfooding) | 外部サービス | 収束述語は bot 不在でも成立(thread 0 件 = violating 0 件) |
| 人間承認(PR マージ・walking-skeleton gate) | 全 Bolt | 承認リードタイム | merge-approval-latency 既定(承認待ちはブロッカー扱いしない) |

## 非該当項目

外部チームへのハンドオフ・データ可用性ウィンドウ・承認リードタイムの長い外部 API 契約は存在しない(単一リポジトリ・AI 完結。本 map は上表4行のみの軽量形 — ステージ契約の「Lightweight or empty when fully AI-contained」に該当)。
