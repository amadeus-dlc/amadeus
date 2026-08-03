# Intent Statement — record-roundtrip-pbt

上流入力(consumes 全数): なし（本ステージは consumes を宣言しない。入力はユーザー記述と GitHub Issue #1980 本文・クロスレビュー裁定）

## Problem Statement（何を解決するか）

記録系（mirror / state / audit / election）の永続化境界に write⇔read 非対称・発行⇔消費非対称が集中しており（#1979 と同一の全量調査: バグ Issue 全259件中、分類済み181件のうち不整合/drift/非対称が44件で第2位）、人手のケース列挙による例示テストではこの族の再発を止められない。決定的な現行実測として、`Election.parse` の硬化（#1459 修正）をディスク読み戻し経路（`amadeus-election-store.ts:80` の `JSON.parse(text) as T` 無検査キャスト）が丸ごと素通りしている。

本 intent は GitHub Issue #1980（クロスレビュー2名成立 2026-08-03・本文全面改稿・独立再検証済み）の実装であり、次を導入する:

1. **state / election の各1境界以上**への write⇔read round-trip PBT ＋ fail-closed プロパティ（fast-check、既存 #697 基盤の上）
2. **発行側と消費側が同一のスキーマバリデータを食う構造への一本化**（境界ごと。対象コーデックは既に `packages/framework/core/tools/` 配下 — 移設ではなく一本化）と読み側の fail-closed 化
3. 「共有バリデータ非経由の読み戻し経路」残存を検出する **callsite-guard 同型の allowlist ratchet 静的ガード**（落ちる実証必須）
4. 既知バグの PBT 再現（#1547 pre-fix 面切替 または #1459 読み戻し経路）と shrink 最小反例のテスト固定

## Target Customer（誰のためか）

- Amadeus の記録系を保守する開発チーム（builder / reviewer）— 非対称バグの実装前検出
- Amadeus 利用者 — fail-closed parse は配布物（dist 7ハーネス）に乗り、破損した台帳・grant・receipt をユーザー環境でもその場で棄却する

## Success Metrics（成功指標）

- state / election の各1境界以上に round-trip + fail-closed プロパティが `test:ci` で常駐（AC-1）
- 既知バグ1件以上の shrink 最小反例がテストに固定される（AC-2、候補は射程内の #1547 / #1459 のみ）
- バリデータ非経由経路の静的ガードが green かつ「落ちる実証」済み（AC-3）
- seed / numRuns が既存規約（PBT_SEED 固定・numRuns 100・AMADEUS_PBT_DEEP=1）に準拠（AC-4）
- coverage / dist:check / promote:self:check / t258 等の既存ブロッキングゲート全緑

## Initiative Trigger（なぜ今か）

- 2026-08-01 の全量調査で不整合/drift/非対称が第2位（44件）と判明し、shift-left 施策群（#1979〜#1984）が起票された
- ノルム `cid:build-and-test:pbt-developer-testing-posture`（PR #2053、2026-08-03 マージ）が「新設・変更する永続化境界に round-trip プロパティを標準観点として付ける」を規定 — 本 intent はその既存境界へのレトロフィット
- #1980 のクロスレビューが election 読み戻しの無検査キャストを実測で確定し、対象と手段が検証済みになった

## Initial Scope Signal

- スコープ: `self-feature`（Amadeus 自身の新機能 — project.md § Scope Overrides）
- **ユーザー裁定 3件**（2026-08-02T16:11:16Z、intent-capture-questions.md 参照）:
  - Q1=C: 分類台帳は軽量版 — 直接根拠9件＋射程判定のみ record 化、44件全量は #1979 へ
  - Q2=B: mirror の render→parse property 化は任意（Could）— 必須は state / election
  - Q3=C: QA 深掘りは workflow_dispatch 最小形のみ新設、schedule 化は別 Issue
- 非対象: #688/#697 完了済み領域の再拡充 / 射程外バグ族（#1878→#1979、#1860・#1906→#1981、#1953→個別修正）/ crash-consistency（将来課題）
- 承認系譜: #1980 本文（改稿版）が要求の正本。クロスレビュー verdict 2件（CONFIRMED_WITH_REFINEMENTS×2、対象 SHA 8e5dc6c4）→ 本文改稿 → 独立再検証（Major 2/Minor 6 全件是正）→ ユーザーによる intent birth 指示（2026-08-03）
