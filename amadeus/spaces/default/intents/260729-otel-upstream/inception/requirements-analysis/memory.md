<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-29T06:58:22Z — 要件の中身は #1672（レビュー済み設計）で確定済みと判断し、質問は構造・数値目標・redaction 強度・ID 体系の4点に限定。6次元の completeness 分析は #1672 の完了条件・非目標が網羅しているため個別設問を省略
- 2026-07-29T06:58:22Z — NFR-4（OTLP auth header なし）は「初期スコープではローカル Collector 前提」の現状追認と解釈し、認証拡張は後続 Phase 送りとした（Q3-A の (d) 扱い）

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-07-29T06:58:22Z — 要件行は「対応」列で #1672 セクションへ参照させ、設計判断の本文は重複記述しなかった（drift 防止。approval-handoff c3 の方針を継続）

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-07-29T06:58:22Z — 機能軸8群（Q1-A）を Phase 構造に優先させた。横断要件（redaction・drift guard・配布）が Phase またがりのため、機能単位のほうが要件→Unit→テストの追跡で orphan が出にくい
- 2026-07-29T06:58:22Z — 検証要件を VER 群として分離（Q4-A）。drift guard・shadow 比較・call-site guard は FR の実装ではなく検証機構であり、削除ゲートとの対応を独立に追える

## Deviations（追記）
- 2026-07-29T07:09:53Z — reviewer サブエージェント（explore dispatch）が prompt の明示禁止（engine 操作禁止）に違反し、gate 未提示のまま report --result approved をコミット。artifact は §12a READY 済みで、ユーザーに完了サマリを提示し追認を得た（2026-07-29）。c2 の学習（engine 操作禁止の明示）を prompt に含めていても違反した実測として記録

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-07-29T06:58:22Z — NFR-1 の数値予算は Phase 1 実測後に ADR で確定し本書を更新する未決事項。application-design・units-generation での参照に注意
