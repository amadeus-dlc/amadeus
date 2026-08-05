# Election Record — E-SRA-CGS13

- question: intent 260805-semi-redefine-autonomy-f / code-generation ステージ完了時の §13 学習選定。candidates 正本 = record の construction/code-generation/memory.md(Interpretations/Deviations/Tradeoffs)。候補は次の 2 件。L1: 『full CI(dist byte 比較・coverage 系検査を含むスイート)実行中の作業ツリーは凍結する — 並行編集+bun run build は t265 級の dist/正本断面差の構造的偽赤を作り、rerun を汚染する(実測: conductor が CI rerun 中に PR #2294 の coverage 是正を編集+build → t265 が 6 fail、solo green で自傷確定)。cid:code-generation:c1-coverage-single-owner(coverage 計測の単独所有)の full CI+dist 比較面への追補』。L2: 『共有 append-only 監査シャードの fork 真分岐(両側追記)は、3-stage blob で base が両側の prefix であること(純追記)を機械検証してから、時系列和集合+seq 連番再構成で解消し、byte 重複 0・seq monotonic を機械確認する(実測: batch 4 回収マージ d461e41c5 で ours +17 / theirs +5 を本手順で解消)。cid:requirements-analysis:append-only-shard-conflict-resolution の非 prefix ケースの具体手順+cid:code-generation:cg-shard-merge-dedupe の seq 面追補』。不採用とした候補: DA:0 是正 3 行(既存 cid の違反実例に過ぎず新規性なし)/ tNNN 改番・E-SRA-CG1 執行(ステージ内で既に diary 固定済み・既存 cid で被覆)。選択肢: 1 = L1+L2 とも採用 / 2 = 一部のみ採用(留保で特定)/ 3 = 0 件(いずれも既存 cid で被覆と判断)。投票前に memory.md 該当行と一次記録(CI ログ・マージコミット)の実在を read-only で確認すること。

裁定: L1+L2 とも採用(choice 1: 2票)
内訳: choice1=2票 choice2=0票 choice3=0票
- 留保(subagent-1, GoA2): L2 の persist 文には『seq 再構成が必要なのは両側の追記 seq レンジが衝突している場合に限る』という発動条件を明記すること — 本件は ours/theirs とも seq:1839 から再開する実衝突を実測したが、衝突がなければ時系列和集合のみで足り、無条件の再採番は監査番号を不要に書き換える。
- 留保(subagent-2, GoA2): L1 の persist 文では『cid:code-generation:c1-coverage-single-owner の追補』という帰属を機序の同一性主張と読ませないこと — 既存 cid の機序は runner 起動時の coverageRoot rmSync による計測出力の相互破壊であるのに対し、L1 の実測機序は dist コピーと正本の断面差(t265 の byte 比較)であり、適用範囲は coverage に限らず full CI 実行中の作業ツリー全般として書くべきである。
票タイムライン: subagent-1 2026-08-05T23:21:33Z(受理 2026-08-05T23:21:58Z) → subagent-2 2026-08-05T23:21:42Z(受理 2026-08-05T23:22:12Z) → 配信 2026-08-05T23:29:14Z → 配信 2026-08-05T23:29:14Z → 開票 2026-08-05T23:29:19Z
GoA[E-SRA-CGS13]: 1x0 2x2 3x0 4x0 5x0 6x0 7x0 8x0
