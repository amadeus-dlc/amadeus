# Scope Definition — 明確化質問

## SETTLED 境界の宣言(scope-boundary 質問の省略根拠)

能力目録(intent-statement.md と Issue #2814 完了条件から列挙)は全件 SETTLED — 上流ソース(Issue #2814 完了条件 (1)〜(4) + クロスレビュー訂正 (a)〜(f) のユーザー起動指示)が in-scope を名指し済みのため、scope-boundary 質問(最小価値スコープ / must-have vs nice-to-have)は省略する:

| # | 能力 | SETTLED 根拠 |
|---|---|---|
| 1 | 制御バイト検出の決定的検査(CI blocking) | Issue 完了条件 (1) |
| 2 | 検査述語の canonical 再利用(`amadeus-migrate.ts:477` isUtf8) | 起動指示 (f) |
| 3 | 正当バイナリ(PDF 1件)への allowlist | 起動指示 (e) — 現時点で必須 |
| 4 | `docs/` 対象化時の `detect-ci-changes.sh` 分岐追加 | 起動指示 (c) |
| 5 | 落ちる実証(注入→赤→復元→残渣ゼロの1セット) | Issue 完了条件 (2) |
| 6 | 偽陽性ゼロの全数 sweep | Issue 完了条件 (3) |
| 7 | ファイル・オフセット名指しのエラーメッセージ | Issue 完了条件 (4) |

`tests/` fixture 自己衝突の解消方式と対象範囲の最終確定(`amadeus/` の扱い)は要件・設計段の送付事項(intent-statement 固定済み)であり、scope 境界の縮小・拡大ではない。

## Operational 質問(3問 — autonomy full の decide-question 梯子で裁定)

### Q1. 能力間の依存関係は?

- A. 線形連鎖(述語再利用 → ゲートスクリプト+allowlist+メッセージ → CI 配線 → docs 分岐 → 落ちる実証)【推奨】
- B. CI 配線とスクリプトを並行トラック化

[Answer]: A — AUTO_DECIDED(decider: agent-recommendation、questionId: sd-q1-dependencies)

### Q2. シーケンシング方針は?

- A. walking-skeleton 先行(最小 end-to-end スライス → 残余の精緻化)— project.md Mandated「self-feature は最初の Construction Bolt に walking-skeleton gate を維持」準拠【推奨】
- B. value-first で一括実装

[Answer]: A — AUTO_DECIDED(decider: agent-recommendation、questionId: sd-q2-sequencing)

### Q3. 期限に紐づく能力はあるか?

- A. なし(P2 通常 — Issue・レビュー・起動指示のいずれも期限を名指ししない)【推奨】
- B. 期限あり

[Answer]: A — AUTO_DECIDED(decider: agent-recommendation、questionId: sd-q3-deadlines)

## 裁定の記録

- 3問とも `amadeus-bolt decide-question`(5段梯子)で AUTO_DECIDED(reviewState: unreviewed — `list-auto-decisions` で後日人間レビュー可能)。グラント: intent-grant-a62c587cfa45e9316dc381840bdf7745。
- ユーザー承認: 2026-08-10T08:32:03Z(autonomy full 起動指示の実 HUMAN_TURN、audit seq 19)
