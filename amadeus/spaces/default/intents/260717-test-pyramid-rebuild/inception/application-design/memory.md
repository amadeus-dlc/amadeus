<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-07-17T13:20Z — 設計論点5問を blind 選挙 E-TPR-AD にかけた。**Q2(smoke tier)で blind 多数決が起草者(architect/e2)推奨 A=規約対象外を覆し B=integration 相当 medium 許容を採用(3票一致)** — チーム運用初の「blind が起草者推奨を覆した」実例。アンカリング防止の blind 配布が実効した好例として記録。裁定 Q1=B/Q2=B/Q3=A/Q4=A/Q5=A、留保2件(Q1 e4 一方向依存・二重化禁止/Q2 e1 medium 上限・large 是正)を全成果物へ焼き込み。
- 2026-07-17T13:11Z — application-design は mode:inline だが、5成果物の multi-artifact drafting を architect subagent へ委任し、conductor(e2)が sensors/reviewer/§13/gate を所有(subagent-utilization)。委任申告済み。

## Deviations
- 2026-07-17T13:22Z — architecture-reviewer が引用ズレ計9件を指摘(Major 1: C5 出典 architecture.md:150-153 は無関係な buildTree/manifest 節で、正しい lcov 経路は component-inventory.md:150,153 に実在。Minor: metrics-snapshot split :99→:100/key :101→:102)。全9件を functional-design 前に即是正、残留 wrong citation 0 実測。mechanism-cite-verify / verbatim-quote-with-cite の実例。
- 2026-07-17T13:24Z — **是正 diff 自身の欠陥を自己捕捉**: Q1 e4 留保を焼き込む際に書いた「コレクタ現行 :102 の classifyTestSize 直呼び」が誤り(classifyTestSize 呼びは :101、:102 は ${tier}_${size} キー代入)。fix-diff-independent-reverify に従い是正コミット前に metrics-snapshot.ts を実測し :101 へ訂正。是正が新たな誤りを固定する二次欠陥を封鎖。

## Tradeoffs
- 2026-07-17T13:12Z — architect subagent は run_in_background:false 指定でも async 起動された。disk-evidence-early-takeover で5成果物のディスク出現を待って引き取り。ただし**私の初回 ls 確認が questions.md 書き込み前に発火し false MISSING を検出**(race)→ 自前 questions 作成に着手しかけたが、architect 完了通知で6ファイル完備を確認し自作を破棄(Write が既存ファイルで失敗し事故回避)。教訓: subagent 完了報告(SendMessage)受領までは produces 欠落を確定しない。

## Open questions
- 2026-07-17 — FR-5(実行時間予算)は専用コンポーネントを持たず ADR-02 に FR-2 併記(reviewer #5 が非対称として記録、AC-5a の値 routing 済みにより許容)。値は units-generation U-2 選挙で確定。C3 tier-aware ゲート実装・比率/時間の強制ゲート化は移設 intent(OQ-2)。
