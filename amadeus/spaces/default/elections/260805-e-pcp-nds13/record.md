# Election Record — E-PCP-NDS13

- question: intent 260805-pr-convergence-plugin の nfr-design ステージ §13 学習選定: diary(amadeus/spaces/default/intents/260805-pr-convergence-plugin/construction/nfr-design/memory.md)の候補2件について persist する集合を選べ。実在根拠は diary と per-unit ND 成果物・sensor detail(.amadeus-sensors/nfr-design/)で実測確認すること。候補 c1 = 「packaging kind unit の upstream-coverage は directive 解決 consumes が空でも stage frontmatter 宣言で判定される — sibling unit FD の設計出典としての実参照で充足(既存 c1-engine-produces-all-five ファミリの sensor 面観測)」。候補 c2 = 「ND 依存図は FD 関数合成との全辺一致(型 import と値注入の区別)を要求される(reviewer 指摘の是正実績 — 既存の整合レビュー観点の適用)」。判定観点: 既存ノルム・機構仕様の機械適用は新規学習でない。

裁定: c1 のみ採用(choice 2 — tie 裁定)
- 留保(subagent-1, GoA2): c1 の機序自体は実測どおり(sensor detail upstream-coverage-10a8c921.md が plugin-packaging-e2e/nfr-design/security-design.md に対し pass:false / unreferenced: business-logic-model を記録し、成果物冒頭で sibling unit convergence-toolchain の business-logic-model を設計出典として実参照して解消)。ただし『upstream-coverage は stage frontmatter の宣言 consumes を要求し、directive 解決の有無で緩まない』は cid:nfr-requirements:upstream-coverage-conditional-consumes(team.md:299、conditional_on 面)と cid:nfr-design:c1-engine-produces-all-five + E-PCP-RES13 追補(project.md:18/317、produces_kinds が適用成果物を絞る面)の機械合成であり、新規知識の増分は『空 consumes 時の充足形 = sibling FD を設計出典として実参照』という運用形にとどまる。この充足形が別 unit kind で再発したら、独立 cid ではなく upstream-coverage-conditional-consumes への追補として再提案することを留保する。
- 留保(subagent-2, GoA2): persist は既存 cid への追補として行い、独立 cid を新設しない。追補本文は intent 固有の固有名(U3 / plugin-packaging-e2e / convergence-toolchain / C8)を落とし、(a) upstream-coverage は stage frontmatter 宣言 consumes で判定され、produces_kinds による解決後の不在は免除にならない (b) 自 unit に実体が無い consumes は sibling unit の同名成果物を設計出典として実参照することで充足する、の2点の一般形に限定する。
票タイムライン: 配信 2026-08-05T09:09:10Z → 配信 2026-08-05T09:09:10Z → subagent-1 2026-08-05T09:20:00Z(受理 2026-08-05T09:11:17Z) → subagent-2 2026-08-05T09:10:58Z(受理 2026-08-05T09:11:27Z) → 開票 2026-08-05T09:11:31Z
GoA[E-PCP-NDS13]: 1x0 2x2 3x0 4x0 5x0 6x0 7x0 8x0

- hold 裁定履歴: tie → choice:2(2026-08-05T09:18:18Z、復帰先 tallied)
