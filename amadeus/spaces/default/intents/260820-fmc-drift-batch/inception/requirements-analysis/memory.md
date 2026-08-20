# Stage Diary — requirements-analysis

## Interpretations

- 2026-08-20T08:18:00Z — FR-010 replace 意味論の裁定(XR-260820-2289 refinement 3 の申し送り)は、ユーザーの実 HUMAN_TURN によるバッチ承認(#2289 実装を含む選択肢1)で確定済みと解釈し再質問しない; requirements.md の provenance 節に明記する。
- 2026-08-20T08:18:00Z — RE 発見の新裁定点3件(provenance 帰属 / 境界拡張粒度 / 述語統一方式)+ 再発トリガ入力ソースを本ステージの4問として梯子裁定。

## Deviations

- 2026-08-20T11:57:00Z — §12a reviewer を宣言型 amadeus-product-lead-agent で2回起動したが、同型は本ハーネスの mailbox 環境で結果返送手段(SendMessage)を持たず無音 idle 化。3回目以降は general-purpose 型で起動し、プロンプトで「レビュー作業は Read/Grep/Glob のみ・許可パス限定・Bash/Write/Edit 禁止・結果は SendMessage で返送」を課す運用へ切替(read-only 規律はツール強制からプロンプト強制へ縮退 — 逸脱として記録)。

## Tradeoffs

- 2026-08-20T08:18:00Z — FR 構成は unit 対応の4グループ + 横断1グループとし、Standard 帯(15-30)の下半分を狙う; クロスレビュー確定事実は引用で消費し FR を薄く保つ(depth-budget 2400B/FR advisory)。

## Open questions

## §12a 記録

- 2026-08-20T12:06:00Z — iteration 1 NOT-READY(BLOCKER 3)→ 是正(FR-REG-6 新設 / FR-ARM-2 改訂+FR-ARM-5・6 新設 / FR-REG-5 集約の applicability-arms 移管)→ iteration 2 READY(complete-review exit 0)。FOLLOW-UP 4件(AUTHORING_ROUTES 集約の正本方向・t481/t527 の処分・RFC:249 の census 除外条件・non-target 禁止節)+ NIT 1件は functional-design / units-generation への申し送りとして Review 節に永続化済み。

## §13 記録

- 2026-08-20T12:20:00Z — §13 選挙 E-260820-FMC-RA-S13 が 2-0 established「c3 のみ採用」(GoA 2/3、両票の留保 = 影響範囲・発火条件・規律縮退の明記、を本文へ反映)。persist 実行済み(project.md ## Corrections、RULE_LEARNED 1件)。c1/c2/c4 は不採用(intent 固有)。
