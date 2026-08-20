# Stage Diary — application-design

## Interpretations

- 2026-08-20T12:22:00Z — 本 intent は既存 plugin 内の変更が主で新サービスを持たないため、services.md は「新設サービスなし + 既存 CLI 面の変更一覧」の形で書く(execution: CONDITIONAL の趣旨に沿いつつ、self-feature スコープの EXECUTE 指定に従い5成果物を全て作る)。
- 2026-08-20T12:22:00Z — RA §12a の MAJOR-1(集約の正本方向)は本ステージ Q1 で設計解を確定。MAJOR-2/3・MINOR-1 は functional-design の担当として申し送りを維持。

## Deviations

- 2026-08-20T12:38:00Z — AD Q1=A(registration 正本)を実測(既在の registration→applicability import)により撤回し C(leaf モジュール)へ改訂(auto-decision-c056d2fd)。教訓: 「循環しない」等の import グラフ前提は起草時に census で実測すべきだった(mechanism-cite-verify-at-draft の適用漏れ — §12a 新 invocation が捕捉)。

## Tradeoffs

## Open questions
- 2026-08-20T12:26:00Z — component-dependency.md で FR-BND-4 の entries 追加登録経路(登録経路 vs updateModelMap)を OQ-AD-1 として functional-design へ申し送り(手動編集は stage 契約が禁止)。

## §12a 記録

- 2026-08-20T12:50:00Z — 3 invocation(2b127202 → a40e33c5 → ea4741bc)で BLOCKER 計6件を是正し READY(complete-review exit 0)。最重要の発見はレビュアーによる「循環なし前提の未実測」の捕捉 — 実測で registration→applicability の既在 import が確定し ADR-1 を A 案から C 案(leaf モジュール)へ改訂。quality-repair(observe-quality)経路を2回使用。FOLLOW-UP(census AC の帰属条件化・マトリクス C1 列)は FD/DP へ申し送り。

## §13 記録

- 2026-08-20T12:55:00Z — §13 選挙 E-260820-FMC-AD-S13 は 1-1 tie で hold → 正準リスト(1)によりユーザー裁定へエスカレーション → 実 HUMAN_TURN で「採用しない(0件)」確定(既存則 mechanism-cite-verify-at-draft の適用徐行と整理)。選挙は terminate で記録閉包。persist なし。
