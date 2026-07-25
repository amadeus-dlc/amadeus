<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-07-25T13:30Z — 2ユニットとも単独 deployable であることを確認した(cid:units-generation:c1)。U1 = 「#1384 の保護が実際に働く」、U2 = 「起動がさらに速くなる」で、どちらも片側だけでは価値が出ない検出/記録のような組ではない。
- 2026-07-25T13:30Z — 依存辺はゼロだが、**US-2(検証を待たずにアタッチ)は U1 内の順序制約**として story-map に明記した。actas 移行(US-1)だけ入れて待機位置を変えないと US-2 が退行するため、intent-backlog の B-3 を U1 の先頭に置く。ユニット間の依存ではなくユニット内の順序である点を区別した。
- 2026-07-25T13:30Z — 規模見積りを数値で記録した(inception.md § Architecture Standards の要求)。U1 = 正本 約48行増/13行減 + テスト 約55行増/22行減、U2 = 正本 約44行増/14行減 + テスト 約90行増。再利用棚卸しの結果、新規導入は関数1つ(member_bootstrap_prompt)と定数1つ(WORKTREE_PARALLELISM)のみで、CI ジョブ・テストランナー・外部ツールの新設はない。
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
- 2026-07-25T13:25Z — story-map の初回生成で heredoc 内の矢印文字を含む行が zsh のパースエラーを起こし、ファイルが 0 バイトで作られた。ls では存在するため見落としかけたが、H2 数の機械確認(grep -c '^## ')で 0 を検知して Python で書き直した(cid:code-generation:produces-ls-check-after-generation の中身面 — 実在確認だけでなく内容の検査が要る実例)。
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
- 2026-07-25T13:30Z — 依存辺ゼロのため理論上は並行実装可能だが、同一ファイルの dist 再生成面が交差するため直列化する(cid:code-generation:c6)。定数ブロックへの両ユニットの追記も textual conflict になりうるため、後着側で union 解消 → 再生成 → 検証再実行の定型手順を dependency へ明記した。
- 2026-07-25T13:30Z — 実行順序は優先度で決めた(U1 が P1/S2-CRITICAL、U2 が P2)。依存制約がないため priority-vs-dependency の2層のうち優先度層だけが効く。
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
- 2026-07-25T13:30Z — compile 実行で bolt_dag が {units: 2件, batches: [[u1, u2]]} として生成されることを確認済み(cid:units-generation:recompile-before-construction-bolt-dag)。ただし batches が1つに束ねられているため、construction で per-unit ループが期待どおり2回回るかは実際に next を叩くまで未確認。
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
