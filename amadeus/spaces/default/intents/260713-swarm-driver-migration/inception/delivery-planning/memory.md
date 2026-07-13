## Interpretations

- 2026-07-13T11:43:08Z — `stories`、`mockups`、`team-formation`はSKIP済みのため、USR-01〜USR-10/REL-01〜REL-02、既存Application Design、6 Unit DAG、`amadeus-developer-agent`をplanning inputとする。
- 2026-07-13T11:53:48Z — Grill me Q1: topology制約に従って基盤を先行し、その後はnative evidenceのリスク順とする。根拠のない数値WSJFは使わない。
- 2026-07-13T11:55:48Z — Grill me Q2: U-01とU-02は別Boltとし、contract固定後にXLのlifecycle／production registryへ進む。最初のnative Walking Skeletonはprovider Boltとする。
- 2026-07-13T11:58:58Z — Grill me Q3: U-04 Codex Ultraを最初のnative Walking Skeletonとし、Ultra受理とnative multi-agent委譲をfloorから区別できるかを最初に反証する。
- 2026-07-13T12:01:51Z — Grill me Q4: U-04完了後、U-03/U-05の実装とfake検証は並列化し、credentialed macOS live proofは直列化する。
- 2026-07-13T12:11:28Z — Grill me Q5: provider entryで非機密のlive schema discoveryをhard gateとし、provider exitでもproduction registry経由の完全live proofを必須にする。
- 2026-07-13T12:13:37Z — 追加決定: 最初のCode Generation直前にAI-DLC成果物だけのcheckpoint PRを作成・承認・mergeし、その`main`を実装失敗時の復帰点にする。実装はmerge後の新しいBolt branchから開始する。
- 2026-07-13T12:14:16Z — Grill me Q6: U-03/U-05の一方が外部依存で停止してもblocked Boltだけをparkし、独立providerは続行する。U-06は全provider完了まで待機する。
- 2026-07-13T12:15:13Z — Grill me Q7: 全Boltはdeveloper lead、architect重点独立review、delivery agent sequencing管理とし、常設mobは置かずblocking failure時だけ招集する。
- 2026-07-13T12:16:15Z — Grill me Q8: Standard深度の質問を終了し、合意サマリーの明示確認へ進む。
- 2026-07-13T12:18:00Z — Grill me Q9: 合意サマリーを正式なDelivery Planning入力として承認し、成果物生成へ進む。
- 2026-07-13T12:25:12Z — 正式なwalking-skeleton markerはbrownfield practiceに従ってoffとし、U-04/B-03はengine markerではなく最初のnative end-to-end proof milestoneとして扱う。
- 2026-07-13T12:25:12Z — Constructionのparallel batchはready Boltの一時的な実行groupであり、製品runtimeのbatchやUnitの永続親とは区別してparallel waveと記述する。
- 2026-07-13T12:27:00Z — 上流正本は`requirements`、`components`、`unit-of-work`、`unit-of-work-dependency`、`unit-of-work-story-map`、`team-practices`であり、SKIP済みの`stories`と`mockups`はUSR／RELとCLI interactionで代替する。

## Deviations

- 2026-07-13T11:43:08Z — なし。Delivery PlanningはUnits Generationのtopologyを変更せず、経済的sequencingだけを決める。

## Tradeoffs

- 2026-07-13T11:43:08Z — provider 3 UnitはDAG上並列可能だが、CLI負荷・native live proof・review capacityを踏まえた実際のBolt並列性は未決である。
- 2026-07-13T11:53:48Z — U-01/U-02の基盤をprovider proofより先行させ、U-06を最終収束点とする。
- 2026-07-13T11:55:48Z — 基盤を1 Boltに束ねる手戻り低減より、U-01/U-02を分けた小さい受入点とreviewabilityを優先する。
- 2026-07-13T11:58:58Z — Codex native proofが成立しない場合は他provider本実装を続けず、intentの主要前提を再審議する。
- 2026-07-13T12:01:51Z — provider source ownershipの独立性による速度を取りつつ、live CLIのhost負荷・user-global state・evidence診断は直列化で隔離する。
- 2026-07-13T12:11:28Z — parser実装前の外部surface確認により、想定schemaへ先行実装する速度より手戻り回避を優先する。認証不足・surface不明・evidence欠落はpassにしない。
- 2026-07-13T12:13:37Z — checkpoint PRには実装差分を混在させず、pre-code設計状態を独立した復帰可能な履歴として固定する。
- 2026-07-13T12:14:16Z — 独立providerの追加証拠獲得を優先しつつ、release closureは一部provider欠落を許容しない。Codex主要前提失敗だけは全体再審議とする。
- 2026-07-13T12:15:13Z — 常時共同作業より実装ownershipと独立reviewを分離し、mobのcontext costはblocker解消時に限定する。
- 2026-07-13T12:25:12Z — U-03/U-05のsource実装とfake検証は並列化するが、同一macOS hostのcredentialed live proofはmutexで直列化し、同時ready時はClaudeを先行する。
- 2026-07-13T12:25:12Z — 最初のCode Generation前にpre-code checkpoint PRを人間承認・mergeし、設計の復帰点を固定するため、着手速度より失敗時の回復可能性を優先する。

## Open questions

- 2026-07-13T11:43:08Z — sequencing heuristic、walking skeleton、Bolt granularity、parallelism、external dependencies、per-Bolt confidence hypothesisを質問で確定する。
- 2026-07-13T12:25:12Z — Codex／Claude／Kiroの実native field pathは各provider entryのschema discoveryで確定する。取得不能は学習候補ではなく当該risk gateのblockerとして扱う。
