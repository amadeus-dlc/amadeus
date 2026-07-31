# Code Generation Plan — callsite-migration

上流入力（consumes 全数）: functional-design（business-logic-model.md、business-rules.md、domain-entities.md）、nfr-requirements、nfr-design、unit-of-work.md、requirements.md（すべて参照済み）

## 対象要件

FR-MIG-1, FR-MIG-2, VER-4（unit-of-work.md U7）

## 実施方針

- 互換 Adapter（`appendAuditEntryViaEvents` — 引数形状互換・別名。E-U7CG-Q1/Q3A/Q3B 裁定準拠）: registry 引き当て → emitEvent 委譲、未登録 throw、intent/space 指定は fail-closed throw、post-complete 抑止は appendJournalRecordV2 → exportCanonicalEvent → emitEvent の3段伝播で観測（案A'、ユーザー裁定 2026-07-30）
- call-site guard（VER-4）: (file, symbol) 件数キーの shrink-only ratchet、tests/ 配置（E-U7CG-Q1）、CI は lint ジョブ内1ステップ
- shadow 比較ハーネス本番化（BR-10 4次元 + unexplainedDiffs、判別ユニオン ComparisonVerdict）
- 実書換え batch は E-U7CG-Q2R 裁定により本 Bolt 対象外（前提不成立の実測2機構 — bootstrap 不在・requiredAttributes 乖離）
- TDD（Red 実測 → 最小実装 → Green の vertical slice）。成果は PR #1733

## 検証計画

- t367 系 + ci.yml 構造ピンテスト + callsite-guard --check の落ちる実証（注入→赤→revert 不可分1セット）
- typecheck・lint・dist:check・promote:self:check・complexity-gate・patch coverage（push 前ローカル lcov）
