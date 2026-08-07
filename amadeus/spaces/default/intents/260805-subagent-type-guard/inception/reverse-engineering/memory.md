<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-08-05T15:35:00Z — 差分リフレッシュの base は `cid:reverse-engineering:rescan-base-ancestry`(HEAD の祖先である observed のうち距離最小)により `b938898f3`(260804-phase-boundary-approval の observed、HEAD まで35 commits)を採用。他候補 7172aea8(148)/ 499d706a(162)は距離で不採用。observed は `cid:reverse-engineering:c2-observed-mainline-commit` により origin/main 系譜の `7060956c5` を記録する(worktree HEAD はこれ + record チェックポイント1コミット)。
- 2026-08-05T15:36:00Z — scan mode は xrev scan mode(`cid:reverse-engineering:c1-xrev-scan-mode` の単発クロスレビュー済み Issue への拡張 = c1-xrev-single-issue)を併用: #2279 のレビュー verdict(検証 SHA `7060956c` = observed と一致)を Developer scan の一次入力とし、C10 の機序不一致は本 scan 段で live probe により裁定する(c1-xrev-mechanism-resolution)。検証 SHA = observed のため行番号再解決の免除条件(E-OBB5-RES13)が成立。
- 2026-08-05T15:37:00Z — R-1 の Claude Code live probe は、repo の settings を触らず scratch の隔離プロジェクト(独自 .claude/settings.json + stdin dump フック)で `claude -p` headless 実行により行う設計とした。`CXR-33` 尊重のため dump はキー一覧と model 関連値のみに限定し、prompt/transcript 内容は保存しない(`cid:feasibility:probe-preprocessing-parity` — 本番経路の前処理との等価性は「フックが受ける stdin の形」に限定して測る)。

<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-08-05T16:05:00Z — scan 中に新規 latent 欠陥 D-1(`SUBAGENT_DISPATCH_TOOL="Task"` vs live `tool_name="Agent"`)を発見したため、`cid:requirements-analysis:issue-first-capture` と §14(finding.github.issue.creation.mode=auto)に従い、ステージ実行中に決定的 creator(`amadeus-finding.ts create-github-issue`)で #2303(bug/P2/S2-CRITICAL)を起票し、#2297 へ相互リンクコメントを投稿した。修正は本 intent では行わない(requirements の裁定候補 Q1〜Q3 として送付)。
- 2026-08-05T16:06:00Z — RE の宣言センサー3種は codekb 出力が sensor filter に構造不適合のため発火せず(`cid:reverse-engineering:re-sensors-codekb-filter-mismatch`)、conductor 手動検証で代替した: 9成果物の H2 数(全て ≥ 2)、本 intent 参照の全数存在(9/9)、旧「現在」マーカーの降格(c3-relabel、残存0)、競合マーカー実検査(真のマーカー0 — :983 の hit は過去記録の説明散文)。

## Sensor 代替検証の記録(2026-08-05T16:06:00Z)
- required-sections 相当: H2 数 43〜97(全て floor ≥ 2 を充足)
- upstream-coverage 相当: RE は consumes: [] のため対象なし
- answer-evidence 相当: RE は質問ファイルを持たないため対象なし(裁定候補は rescan record §7 に列挙し requirements へ送付)

## Tradeoffs
- 2026-08-05T16:07:00Z — R-1 の Claude Code live probe は `--model sonnet` 明示で実行した(既定モデルはレート上限で exit 1 — run2)。省略時に model が載る可能性は「明示時でも載らない」実測から極めて低いが、未実測の HYPOTHESIS として rescan record に明示保存した(推測を事実に昇格させない)。
- 2026-08-05T16:07:00Z — Architect のスポット再実測が Developer scan の座標4件(off-by-one)と判定3件(免除根拠・D-2 既知・件数の測定時点差)を訂正した。2段直列(scan → synthesis の独立再実測)の実効が本 intent でも確認された(`cid:reverse-engineering:c3` の設計どおり)。audit 件数は「測定時刻依存の移動値」であることを成果物に明記(973→974)。

## Open questions への引き継ぎ
- rescan record §7 の Q1〜Q9(D-1 の取り込み範囲 / 修正形 / D-2 の扱い / 実効 model の解決範囲 / ハーネス別供給差 / 記録先 / 組込型正本 / name: 混入機序 / CAP-3 入力)を requirements-analysis の質問空間として送付。
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
