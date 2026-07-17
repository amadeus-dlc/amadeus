# Re-scan 記録 — 260716-opencode-plugins-hooks(Issue #1049)

- **Date**: 2026-07-16
- **observed**: `3346718771f96f4f26cfe85691f2855a78cf1bdf`(`git rev-parse HEAD` 実測、engineer-3 本線)
- **base**: `1e22d6a889ca71cab82a056e07edc8a46110a297`(re-scans 全 observed のうち HEAD 祖先・距離最小 115 — rescan-base-ancestry、merge-base --is-ancestor 実測)
- **手法**: diff-refresh(c1)+opencode plugins 統合重点。Developer スキャン → Architect 合成の直列(c3、8点独立再照合 全一致)
- **Focus**: core hooks 11本の stdin/exit 契約台帳(mint-presence←prompt / stop = stdout JSON+exit 0、全 hook で exit(2) 不使用を grep 実証)/ Cursor アダプタ同型契約(reconstruct 8 target・ToolNameMap・EXIT_ADVISORY_FAIL=1・env 明示)/ opencode manifest 機序(coreDirs hooks コピー :46・authoredExempt:[] :61・plugin dir 不在)/ package.ts harness 自動発見(:68-71)/ 外部 seam 実測(公式 docs+@opencode-ai/plugin 一次ソース: chat.message が UserMessage 直接観測 = HUMAN_TURN 写像可、tool.execute.* payload 確定)
- **区間差分**: base..HEAD 115 コミットでフォーカス面の変化は amadeus-lib.ts のみ(#1109 KNOWN_HARNESS_DIRS 6値化)— harness dist・core hooks・package.ts は不変
- **codekb body 更新**: なし(churn 回避 — 既存節が台帳を保持、現 observed で再検証一致)
- **Per-intent record**: `<record>/inception/reverse-engineering/scan-notes.md`(Architect 合成節込み)
- **特記**: Developer subagent 最終テキストに指示風テキスト混入1件 → M4 で破棄(scan-notes 本体 grep 0)
