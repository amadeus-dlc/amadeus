# Stage Memory — reverse-engineering

## Interpretations

- 2026-08-05T05:30:00Z — 差分リフレッシュ(`cid:reverse-engineering:c1`)。base = `b938898f364160d4b5857e153579b40b5ab18372`(re-scans 記録済み observed のうち HEAD 祖先で距離最小 = 20、`git merge-base --is-ancestor` 実測)、observed = `2f255bc69`(origin/main 系譜 — `cid:reverse-engineering:c2-observed-mainline-commit` 準拠)。区間 19 commits / 464 files。
- 2026-08-05T06:20:00Z — 既存ノルム `cid:reverse-engineering:re-sensors-codekb-filter-mismatch`(「RE の宣言センサー3種は codekb 出力パスが sensor filter に構造不適合で常に matches-rejection になり、RE の成果物検証は実質 conductor 手動確認のみ」)は**失効**している。実測: audit の `"Stage slug":"reverse-engineering"` 行 72 のうち `SENSOR_FIRED` 36 / `SENSOR_PASSED` 36 / `SENSOR_FAILED` 0(内訳 required-sections 18 + upstream-coverage 18 = 9成果物×各2回。`answer-evidence` は 0 発火 = RE が questions を produce しないため非適用。測定 ref = worktree HEAD `bff776fd8`)。機構面の根拠は sensor manifest の `matches` が `**/{amadeus-docs,intents,codekb}/**` へ拡張済み(PR #1758 / `95efbaf3f`、2026-07-31 着地)。選挙 E-SRA-RES13 は tie → ユーザー裁定 choice:1 で**退役を採用**し project.md:157 を実測訂正版へ差し替えた。conductor の当初提案文「27発火/3センサー」は誤りで、両投票者の実測により訂正(`cid:requirements-analysis:numbers-from-command-output-only` 違反の自己捕捉)。
- 2026-08-05T06:20:00Z — Developer scan の引用に系統的 off-by-one が 12 件あり、Architect synthesis が実測訂正した(`resolveAutoDecision` の full ハードゲートは `:700-701` でなく `:702`、`handleSetAutonomy` は `:1050` でなく `:1051`、`handleListAutoDecisions` は `:961`、`selectDecision` 分岐は `:522-524`、`applySemiDecision` は `:546-554`)。後続ステージは Developer scan の申告値でなく codekb の実測値を引くこと。
- 2026-08-05T06:20:00Z — 無人解決の段数は #2253 が主張する「4段」でなく **5段**(confirmed-policy を数え落としている)。requirements 段で走行単位の主張を書くときは 5 段で書く。
- 2026-08-05T06:20:00Z — 同期面は #2253 の見積もりより広い: docs は **22 ファイル = 11 対訳ペア**(Issue の「11」は片側のみの数)。正本知識 `stage-protocol.md` は該当 9 行(`:33` と `:131` が直接反転対象)。on-disk ミラーは 14 本だが source-only 境界により追跡・編集対象は canonical 1 本のみ。

## Deviations

## Tradeoffs

- 2026-08-05T05:30:00Z — Developer scan は explore 型(書込不可)サブエージェントへ委譲し、Architect synthesis のみ書込可能な amadeus-architect-agent へ委譲した(`cid:reverse-engineering:c4` / `cid:functional-design:c4-subagent-structural-guard`)。
- 2026-08-05T06:20:00Z — 陳腐化した file:line の是正は履歴節を書き換えず、現在節に実測値とシフト由来を明記する形をとった(`cid:requirements-analysis:historical-section-cite-check-at-observed` — 履歴節の行番号はその断面で正しい)。

## Open questions

- 2026-08-05T06:20:00Z — requirements 段へ渡す最大の設計論点: `semi` は **grant を持たない mode** である(`set-mode` の値域は `"none" | "semi"` のみ、full grant は `issue-full`/`replace-full` 経由のみ)。「semi を梯子へ載せる」= 「grant なしで梯子を回す」構造変更であり、介入点3箇所の書き換えでは済まない。
- 2026-08-05T06:20:00Z — 「節目」を判別する述語が存在しない。現行の判別軸は `occurrence.phase !== "phase-boundary"` と `applySemiDecision` の `workflow-reversible` 分類のみで、**質問 occurrence には phase 概念がない**。
- 2026-08-05T06:20:00Z — 梯子後段2段(solo-election / agent-recommendation)のみ `reviewState: "unreviewed"`。semi が使えるのは全5段か未レビュー2段を除く3段かは明示的な裁定事項。受け皿の `amadeus-autonomy-review*.ts` は区間内新規で base 時点に存在しなかった。
- 2026-08-05T06:20:00Z — 未確定4件(推測で埋めていない): ① semi の phase 内 auto-approve が `phase_boundary` directive を受け取らない保証は実 run 未検証 ② #2253 の「11ファイル」の内訳(Issue 本文未読) ③ semi 関与13テストの現況グリーン性は未実行 ④ 再定義後の「節目」判別基準は設計候補すら未確定。
