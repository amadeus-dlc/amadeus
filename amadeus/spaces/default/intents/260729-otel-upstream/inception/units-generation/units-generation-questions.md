# Units Generation — 質問票

Stage: units-generation (inception)
Depth: Standard（文脈適応で 3 問）
Context: `components.md`（13 新規コンポーネント＋既存5モジュール処置）、`decisions.md`（ADR 6件）、`requirements.md`（FR 8群）を参照済み。Unit 粒度の方針は scope-definition Q5 で「Phase 内 module 単位、Phase 間は直列依存」と確定済み。本ステージはトポロジ（DAG）のみを扱い、実装順序・優先度は 2.8 delivery-planning の領域として問わない。

## 判定と根拠（E-OC1 3段順序）

- Q1-Q3: 選挙不要 — ソロ運用。ユーザー本人が AskUserQuestion で直接回答（HUMAN_TURN 実測）
- leader 承認: ユーザー本人の直接回答をもって承認済み 2026-07-29T07:35:00Z

---

## Q1. Unit 境界戦略は？

- A. コンポーネント／要件群アライン — Unit を FR 群と所有コンポーネントに対応させる（例: Event Registry＋drift guard、Journal v2＋reader、Exporters、Context 伝播、reader 差替え、call site 移行、旧 writer 削除、Metrics、diagnostic Logs、Relay 縮退）。要件→Unit→テストの追跡が最直接的
- B. Phase アライン — Unit を #1672 の Phase 1-6 に対応させる（6 Unit の粗粒度。scope-definition Q5 で不採用とした方向）
- X. Other (please specify)

[Answer]: A. コンポーネント／要件群アライン

## Q2. Unit 数と粒度は？

Q1-A の場合、walking skeleton（Phase 1 相当）を含めて約11 Unit になる見込み。

- A. 約11 Unit — skeleton 1＋機能 10。各 Unit は S/M サイズ中心で、call site 段階移行のみ L
- B. さらに細分化する（15 前後）
- C. もう少し粗くする（7-8）
- X. Other (please specify)

[Answer]: A. 約11 Unit — skeleton 1＋機能 10。各 Unit は S/M サイズ中心で、call site 段階移行のみ L

## Q3. walking skeleton Unit の範囲は？

Skeleton Stance は on（practices-discovery Q1）。最初の Construction Bolt となる skeleton Unit の範囲。

- A. #1678 の合格条件全体 — 3 Provider＋Local Exporters＋失敗契約＋Context 検証＋bundle 成立＋性能計測＋テスト先行順序。representative 1 CLI・1 hook・1 subprocess のみ接続し、本番 call site は触らない
- B. さらに絞る — Logger Provider＋AuditLogExporter＋失敗契約のみ（残りは後続 Unit）
- X. Other (please specify)

[Answer]: A. #1678 の合格条件全体。representative 1 CLI・1 hook・1 subprocess のみ接続し、本番 call site は触らない
