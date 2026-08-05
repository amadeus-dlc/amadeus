<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-08-04T13:14:04Z — 既存CodeKBを履歴型derived cacheとして扱い、今回の最新断面を各成果物の先頭へ追加し、過去断面は本文・当時のfile:lineを変更せず保持した。
- 2026-08-04T13:14:04Z — Issue #2161のauthoring責務と、scanで見つかったplugin import-closure欠陥を分離した。前者は承認済みself-feature、後者はM7/M8を阻む既存基盤の`BLOCKER`候補でありRequirements Analysisの裁定対象とした。
- 2026-08-04T13:19:55Z — rebase後のobservedを`7172aea8dacb2a187d71697cbc8561c1614e25a4`へ再接地した。base `9458bbda85eb7257310a80882b4858dc6ce3d1fc`は新observedのancestor（exit 0）なので維持し、旧observed`be6a8085…`→新observedは非祖先（exit 1）のためtree deltaとしてのみ記録した。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-08-04T13:14:04Z — stage定義のlast-writer-wins説明より、委譲指示と既存運用の「過去断面を破壊しない」を優先し、9成果物を全面置換せず最新節の追加で更新した。
- 2026-08-04T13:19:55Z — 初回scanの98 pass / projection 18 pass / typecheck / lint / graph結果を新observedのfresh結果として流用せず履歴証拠へ降格し、再接地scanで実行された44 pass / 168 expectとcomposed exit 1を現在値にした。

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-08-04T13:14:04Z — import-closure欠陥をその場で修正すればcomposed実行は回復するが、Reverse Engineeringにはscope帰属を決める権限がない。修復せず証拠と選択肢を固定し、承認済みM7/M8と矛盾しない裁定を次段へ送った。
- 2026-08-04T13:14:04Z — architecture図は新規stage/overlayの配置を決めず、責務順序だけを表現した。実装方式の先取りを避ける代わりに、Application Designで境界選択が必要になる。
- 2026-08-04T13:19:55Z — rebaseで旧observedが非祖先になったため、旧→新の6 commitsを線形距離とは扱わず73-file tree deltaとして限定解釈した。base→新observedは祖先関係が成立するため、共有freshnessの主統計は21 commits / 828 filesを正とした。

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-08-04T13:14:04Z — Requirements Analysisで、`tla-model-receipt.ts`と`tla-module-deps.ts`のmanifest/import-closure修復を#2161内へ含めるか、hard dependency付き別Issueへ分離するかを裁定する。
- 2026-08-04T13:14:04Z — authoring ownerの配置、requirement/design identity粒度、trace/reduction/proof receipt schema、model registrationの原子性は未裁定である。
