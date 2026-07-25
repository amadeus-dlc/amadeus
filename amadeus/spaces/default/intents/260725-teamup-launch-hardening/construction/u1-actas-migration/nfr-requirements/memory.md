<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-07-25T15:10Z — CLI の NFR に常駐サービスの指標(SLO・スループット・同時接続数・キャッシュ・水平スケール・サーキットブレーカ)を機械的に持ち込まず、決定的なファイル境界と fail-closed 契約へ置き換えた(cid:nfr-design:c1)。各成果物に「非対象」節を置き、なぜ該当しないかを明記した。
- 2026-07-25T15:10Z — 信頼性設計の核心は R-1「検証の失敗が起動を妨げない」。検証は診断であり起動の可否を左右しない。これは ADR-5(検証を mux_attach 後ろへ)の帰結であると同時に、agmsg が repo 外・バージョン管理外である点への縮退設計にもなっている(R-7)。
- 2026-07-25T15:10Z — P-3 で「実測 32.2秒 を安全側に上回る値」とし、実測値そのものを閾値にしない理由を明記した(メンバー数増でコールドスタートが延びる / ディスク・CPU 状態で変動する)。実測への接地と、実測値の直接採用は別である。
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
- 2026-07-25T15:10Z — technology-stack.md は conditional_on: brownfield の consumes だが、本 repo は brownfield のため要求される(cid:nfr-requirements:upstream-coverage-conditional-consumes)。5成果物すべてで実参照し、宣言 consumes 4件 × 全成果物の総当たり grep で 4/4 を機械確認した。
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
- 2026-07-25T15:10Z — R-4(delivery.sh set monitor の維持)と BR-16(WATCHER_RESEND_MAX を変えない)は「変えない」ことを要件として明示した。消し忘れではなく意図的な保存であることを記録に残さないと、後続の変更で削られうるため。
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
- 2026-07-25T15:10Z — WATCHER_READY_TIMEOUT の具体値(32.2秒 + マージン)は nfr-design または code-generation で確定する。本ステージでは「実測を安全側に上回る」「マージンの根拠をコメントに記す」という契約のみを定めた。
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
