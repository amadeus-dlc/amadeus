# Scope Document — OTel Upstream 統合

上流入力（consumes 全数）: `intent-statement.md`、`feasibility-assessment.md`、`constraint-register.md`（すべて参照済み）

## In Scope

`intent-statement.md` の成功指標を達成するため、#1672 の採用方針に基づく以下を含む。

- **Phase 1（#1678）**: Trace／Event／Metrics Provider と Local Exporters の walking skeleton。hard gate 付き risk-first 実証（`feasibility-assessment.md` の4不確実性の実測検証）
- **Phase 2（#1676）**: AuditLogExporter、Journal schema v2、Completed Span Store
- **Phase 3（#1677）**: W3C Trace Context の子 process／subagent への伝播
- **Phase 4（#1674）**: `appendAuditEntry()` 廃止と全 Domain Event の OTel API 移行（約1600 call site の段階移行、互換 Adapter は移行期間限定）
- **Phase 5（#1675）**: Metrics（Counter／Histogram subset）と Trace 相関 diagnostic Logs
- **Phase 6（#1673）**: Projector の OTLP Relay への縮退（推測ロジック削除）
- 横断: Event Registry と drift guard、mixed schema merge、削除ゲート、全 harness 生成面への同期（`constraint-register.md` TC-3）

## Out of Scope

#1672 の非目標6件をそのまま Out とする（Q1 確定）。

- Collector を状態機械の正本にすること
- audit 出力をネットワークへ依存させること
- Audit API と OTel API の恒久 dual-write
- Node auto-instrumentation の初期導入
- 全関数の無差別 Span 化
- 初期段階での Metrics API 全機能（Observable callback・任意 aggregation）の自前実装

## 優先度（MoSCoW）

- **Must**: Phase 1-4 — 監査の正本移行の完了（`intent-statement.md` の「基盤の単一化」達成に必要）
- **Should**: Phase 6 — Projector の推測廃止。因果の正確性の完全な達成
- **Could**: Phase 5 — Metrics／diagnostic Logs。初期スコープは Counter／Histogram subset（`constraint-register.md` の Out 境界と整合）

## シーケンシング

risk-first（Q3 確定）: Phase 1 の walking skeleton で最大リスク（Bun Context・Logs API・bundle・性能）を最初に潰す。不合格なら hard gate どおり撤回。以後は依存順（Phase 2→3→4→5→6）。Phase 間は直列依存、Phase 内の module 分割を Unit として並行化する（Q5 確定 — units-generation への入力）。

## 最初の価値スライス

Phase 1 の walking skeleton 自体（Q4 確定）— canonical Event が OTel API 経由で audit JSONL に同期出力され、async 境界で Context が維持される実証。撤回可否の判断材料でもある。
