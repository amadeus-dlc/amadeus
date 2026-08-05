# Election Record — E-PCP-ADDEV

- question: intent 260805-pr-convergence-plugin の application-design で設計逸脱が検出された(§12a architecture-reviewer iteration 1 BLOCKER 2)。承認済み requirements.md FR-4b は「gh 実行は既存 amadeus-github-gateway.ts(runnable/auth readiness 検査・argv 配列・token 非保持)へ相乗りする」と定めるが、conductor 実測により plugin tools から core tools への import は import-closure guard(scripts/plugin-projection.ts:926 checkManifestClosure — closure 全 member が manifest 宣言かつ plugin 所有(bundle prefix 配下)であることを要求、core ファイルは owned になり得ない)で構造的に拒否されることが確定した。FR-4b の字義どおりの実装(実 import)は不可能。投票者は scripts/plugin-projection.ts:912-946 と requirements.md FR-4b / NFR-4、components.md の C6 記載、component-inventory.md の制約列を実測確認して裁定せよ。

裁定: FR-4b を契約準拠へ申告改訂(choice 1: 2票)
内訳: choice1=2票 choice2=0票 choice3=0票
- 留保(subagent-2, GoA2): FR-4b の改訂は「申告付き改訂」として requirements.md 本文へ承認系譜(cid:requirements-analysis:approval-lineage-citation)付きで固定し、ADR-6 には構造不可の実測を file:line 逐語(scripts/import-closure-guard.ts:169-189 checkManifestClosure の declared/owned 二重被覆、scripts/plugin-projection.ts:920 owned = posix.join(pluginHostPrefix(name), rel) により core パスは owned に入り得ない)で残すこと。あわせて「契約準拠」が検証不能な散文へ退化しないよう、gateway と同一契約の4点(readiness 検査・argv 配列実行・token 非保持・非0 exit の loud fail)を functional-design でテスト可能な assertion として固定し、components.md:18 の C6 行(現在は「再利用 / core 所在」)と components.md:41 の境界記述(plugin tools は core を import しない)の内部矛盾を同一改訂で解消すること。
票タイムライン: 配信 2026-08-05T06:57:55Z → 配信 2026-08-05T06:57:55Z → subagent-1 2026-08-05T06:59:29Z(受理 2026-08-05T06:59:56Z) → subagent-2 2026-08-05T07:20:00Z(受理 2026-08-05T07:00:10Z) → 開票 2026-08-05T07:00:20Z
GoA[E-PCP-ADDEV]: 1x1 2x1 3x0 4x0 5x0 6x0 7x0 8x0
