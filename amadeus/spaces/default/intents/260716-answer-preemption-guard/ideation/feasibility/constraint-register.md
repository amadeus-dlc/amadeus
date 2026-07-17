# Constraint Register — answer-preemption-guard

上流入力(consumes 全数): `../intent-capture/intent-statement.md`。

## 制約一覧

| # | 制約 | 出典 | 影響 |
|---|------|------|------|
| C1 | 述語の意味論は変更しない(発火点追加のみ) | intent-statement スコープ境界(OUT) | sensor は `checkQuestionsEvidence` の薄い adapter に限定 |
| C2 | enforcement cutoff(intent dir ≥ 260716)を新発火点でも適用 | #1106 の corpus sweep 実測(111 中 59 が旧様式) | cutoff なしの発火は false-red 59 件 — corpus-sweep-for-new-guards の両側実測必須 |
| C3 | sensor は advisory(非ブロック)契約 | `.claude/sensors/` 既存4 manifest の default_severity | fail-closed は gate-start(既存)が担う二層構造を維持 |
| C4 | 正本編集 → dist 再生成の同期 | project.md Mandated | `packages/framework/core/` 編集 + `bun scripts/package.ts` + `promote:self` |
| C5 | canonical パス直実行禁止 | cid:no-canonical-direct-execution(E-PM7 M2) | 動作確認は `.claude/tools/` 配布コピー経由 |
| C6 | 落ちる実証+corpus sweep の両側 | cid:corpus-sweep-for-new-guards(E-PM7 M1) | fixture 赤+corpus 全数 false-red 0 の両方を実測 |
| C7 | 語彙衝突の vacuity guard | cid:vocabulary-collision-vacuity-guard(E-1101-CG) | 述語再利用のため新規リスク低いが、sensor 側フィルタ(対象ファイル選定 glob)の交差を机上トレース |
| C8 | 注入は実行時消費行へ | cid:inject-runtime-consumed-lines(E-PM7 M3) | 落ちる実証 fixture は実データ(questions md)注入 — 型層でない |

## 制約の帰結(設計への引き継ぎ)

C2+R2(raid-log)により cutoff 定数の canonical 化(amadeus-lib.ts への移設)を design の必須検討事項とする。C3 により sensor 発火点は advisory 層、gate-start は fail-closed 層という二層責務を design 文書に明記する。
