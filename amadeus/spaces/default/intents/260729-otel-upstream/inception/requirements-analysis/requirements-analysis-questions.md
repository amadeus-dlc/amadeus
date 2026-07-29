# Requirements Analysis — 質問票

Stage: requirements-analysis (inception)
Depth: Standard（文脈適応で 4 問）
Context: `intent-statement.md`、`scope-document.md`、`team-practices.md`、codekb（`business-overview.md`・`architecture.md`・`code-structure.md`）を参照済み。要件の中身は #1672（採用方針・失敗契約・移行設計・完了条件、レビュー済み）で大部分が確定しているため、ここでは要件書の構造・数値目標・redaction 要件の強度・トレーサビリティの4点を確認する。

## 判定と根拠（E-OC1 3段順序）

- Q1-Q4: 選挙不要 — ソロ運用。ユーザー本人が AskUserQuestion で直接回答（HUMAN_TURN 実測）
- leader 承認: ユーザー本人の直接回答をもって承認済み 2026-07-29T06:56:22Z

---

## Q1. 要件書の構造は？

- A. 機能軸の FR グループ — Event Registry／Journal v2／AuditLogExporter／Trace（Span・Context）／Metrics・Logs／OTLP Relay／移行・削除ゲート／配布・redaction の8群。Phase 構造とは独立に、要件→設計→コード→テストのトレーサビリティを機能単位で追える
- B. Phase 構造に沿った FR グループ（Phase 1-6 の6群）。#1672 の実装順との対応が直接だが、横断要件（redaction・drift guard・配布）の置き場が曖昧
- X. Other (please specify)

[Answer]: A. 機能軸の FR グループ8群（Event Registry／Journal v2／Exporters／Trace／Metrics・Logs／Relay／移行・削除ゲート／配布・redaction）

## Q2. NFR の数値目標はいつ確定するか？

性能（canonical Event の sync append レイテンシ）、bundle size、起動時間の予算値。

- A. Phase 1 計測後に確定 — 要件書では「現行 appendAuditEntry 同等を上回る回帰なし」「Bun-only 単一 bundle 成立」のような比較基準で記述し、数値予算は Phase 1 の cold/warm 実測後に ADR で確定して要件を更新する（feasibility F-4 と整合）
- B. 今、仮の数値目標を置く（例: p95 で現行比 +10% 以内）
- X. Other (please specify)

[Answer]: A. 比較基準で記述し、数値予算は Phase 1 の cold/warm 実測後に ADR で確定して要件を更新する

## Q3. redaction 要件の強度は？

devsecops スキャンの残ギャップ4件（(a) `command` safe-key で argv にトークン混入の余地、(b) `redactionOptIn` が値スクラブなしの無制限キー許可、(c) telemetry 成果物の credential-free を検査するゲート未配線、(d) OTLP exporter の auth header なし）。

- A. 全4件を要件化 — (a)(b) は redaction policy の要件、(c) は drift guard 系の検証要件、(d) は Relay の非機能要件（初期は auth なしローカル運用を非目標確認のうえ明記）
- B. (a)(b)(c) のみ要件化し、(d) は非目標の確認に留める
- C. 新 Mandated（export 境界 redaction）のみ要件化し、残りは Phase 1-2 の ADR に委ねる
- X. Other (please specify)

[Answer]: A. 全4件を要件化 — (a)(b) は redaction policy、(c) は検証要件、(d) は Relay の非機能要件として明記

## Q4. トレーサビリティの ID 体系は？

- A. FR-<群>-<番号>／NFR-<番号> とし、各要件に #1672 の完了条件・設計セクションへの対応を付記する。削除ゲート・drift guard の検証要件は VER-<番号> として分離
- B. FR-<番号>／NFR-<番号> の単純連番
- X. Other (please specify)

[Answer]: A. FR-<群>-<番号>／NFR-<番号>、検証要件は VER-<番号> で分離。各要件に #1672 完了条件・設計セクションへの対応を付記
