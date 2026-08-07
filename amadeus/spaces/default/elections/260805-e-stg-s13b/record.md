# Election Record — E-STG-S13B

- question: intent 260805-subagent-type-guard / ステージ scope-definition の §13 学習選定。observation diary から surface された候補は6件(c1〜c6)。memory 層へ persist する採用集合を選べ。判断基準: (i) 一般化可能か / intent 固有か (ii) 既存 cid との重複 (iii) 実測接地。候補の要旨: c1=既決事項を再質問せず実質2問に絞った(既存 cid の適用実例) / c2=Must のみに凝集し Should/Could を置かなかった(cid:scope-definition:c2 の先例に整合する適用実例) / c3=ステージ途中でセッションを本線ツリーから worktree へ移設した手順 — 移設前 record チェックポイントコミット → 本線ブランチ復帰 → worktree 作成 → bun install + bun run build(source-only 境界によりセルフインストール面は未追跡で再生成必須)→ active-intent カーソル再設定。audit cloneId は境界で変わる(per-clone 仕様) / c4=別 Issue 2件をステージ実行中に起票(既存 cid issue-first-capture の適用実例) / c5=risk-first 採用の裁定理由(intent 固有) / c6=今すぐ起票採用の裁定理由(intent 固有)。

裁定: c3 のみ採用(choice 1: 2票)
内訳: choice1=2票 choice3=0票
- 留保(subagent-1, GoA2): 独立した新規 cid を立てず cid:code-generation:solo-bolt-worktree-required への追補として persist し、次の2点で射程を絞ること。(1) 主張 (c)(active-intent カーソル再設定)は本文から落とす — 前選挙 E-STG-S13 で persist された cid:intent-capture:c3-intent-birth-base-freshness(project.md:317)が逐語『移設後に再適用して parse と active-intent カーソルで整合を実測する』で既に覆っており、重複記載は同一事実の二重規定になる。(2) 追補の核心は主張 (b)、すなわち『source-only 境界下ではセルフインストール面が未追跡のため新規 worktree では build 前に framework CLI が一切起動しない』という単一事実に置き、intent 固有のブランチ名・SHA・コマンド列の逐語手順書へ肥大させない。移設タイミング(ideation/inception 段でも本線ツリーに居続けない)は既存則の適用面拡張として1行で足りる。
- 留保(subagent-2, GoA2): c3 は独立した新規 cid ではなく既存 worktree 規範(cid:code-generation:solo-bolt-worktree-required)への追補として persist し、内容を未被覆面 — 『source-only 境界下では新規 worktree は未追跡のセルフインストール面と per-user カーソルを欠くため、依存インストールと生成物再生成、カーソル再設定を済ませるまで amadeus CLI が動かない』 — に絞ること。移設前のチェックポイントコミットは既に cid:requirements-analysis:shard-commit-before-branch-switch が覆っているため重複記載しない。branch 名・コミット SHA・cloneId 値などの intent 固有値は落とした一般形で書く。
票タイムライン: 配信 2026-08-05T15:18:18Z → 配信 2026-08-05T15:18:18Z → subagent-1 2026-08-06T00:20:00Z(受理 2026-08-05T15:20:31Z) → subagent-2 2026-08-06T00:00:00Z(受理 2026-08-05T15:20:45Z) → 開票 2026-08-05T15:21:18Z
GoA[E-STG-S13B]: 1x0 2x2 3x0 4x0 5x0 6x0 7x0 8x0
