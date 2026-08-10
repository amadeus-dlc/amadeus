# Election Record — E-GFR-NDS13

- question: 260810-grilling-frontier-resync nfr-design の §13 学習候補の採否。conductor 提案 = 候補1件(diary c2 由来): 『cid:nfr-design:c1-engine-produces-all-five ファミリ(produces_kinds / upstream-coverage の判定分母)への追補 — nfr-budget センサーの missing-nfr-ids は、nfr-requirements を SKIP するスコープでは構造的 advisory 赤になる: unitIdCount は id 宣言 dir(construction/<unit>/nfr-requirements/)を読み(amadeus-sensor-nfr-budget.ts idDeclarationDir / unitIdCount — dir 不在で 0)、record が id contract cutoff 後生まれなら missing-nfr-ids を必ず report する。センサーはスコープの SKIP 解決を知らない。扱い: 偽陽性として無視せず、(i) diary へ構造的原因(SKIP → 宣言 dir 不在 → denominator 0)を実読 file 根拠付きで記録 (ii) 設計側は requirements.md の FR id を verbatim 引用し独自 id を発明しない (iii) ゲートで開示する。センサー側の skip-aware 化は enhancement 起票の別判断』。検証対象: .claude/tools/amadeus-sensor-nfr-budget.ts の idDeclarationDir / unitIdCount / missing-nfr-ids 分岐の実在、record の .amadeus-sensors/nfr-design/nfr-budget-*.md の reason=missing-nfr-ids、construction/nfr-design/memory.md の 08:12:00Z 行、既存 memory 層(project.md の nfr-design 系 cid)に同内容が未被覆であること。choice 1 = この1件を採用。choice 2 = 0件(既存 cid の射程内)。choice 3 = 修正案あり(留保に記す)

裁定: 候補1件を採用(choice 1: 2票)
内訳: choice1=2票 choice2=0票 choice3=0票
- 留保(subagent-2, GoA2): persist は既存 cid:nfr-design:c1-engine-produces-all-five ファミリへの追補として統合し独立 cid を新設せず、intent 固有の unit 名・ハッシュ・件数を落とした一般形(『判定分母を上流ステージの成果物 dir から読むセンサーは、その上流が SKIP されたスコープで分母 0 となり構造的 advisory 赤になる』)で書くこと。
- 留保(subagent-1, GoA2): 採用に同意するが、persist 文では機序の主語を『スコープが nfr-requirements を SKIP すること』ではなく『id 宣言 dir(construction/<unit>/nfr-requirements/)が不在で unitIdCount が 0 になること』に置くこと — SKIP は不在を保証する十分条件のひとつにすぎず(未実施・kind pruning でも同じ 0 になりうる)、主語を SKIP に固定すると同型の advisory 赤を別経路で取りこぼす。
票タイムライン: 配信 2026-08-10T08:21:42Z → 配信 2026-08-10T08:21:42Z → subagent-2 2026-08-10T08:23:10Z → subagent-1 2026-08-10T08:23:39Z → 開票 2026-08-10T08:28:04Z
GoA[E-GFR-NDS13]: 1x0 2x2 3x0 4x0 5x0 6x0 7x0 8x0
