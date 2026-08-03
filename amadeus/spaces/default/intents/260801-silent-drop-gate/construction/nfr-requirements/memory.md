<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-08-02T06:38:41Z — CLIのNFRを構造的上限で定義した; mirror-persistence-propagation は常駐serviceを持たないため、架空のavailabilityやRPSではなく、call count、byte不変、audit重複0件、outbox収束を測定軸にした。
- 2026-08-02T06:48:42Z — 静的ゲートの信頼性を実行単位で定義した; static-gate-engine は常駐serviceではないため、availability SLAではなく完全走査、typed exit、byte不変、決定性、初回provenance一回性を測定軸にした。
- 2026-08-02T06:59:46Z — static-gate-engine の第1レビュー指摘を反映した; 走査前後の2回読取、Git child最大2回、policy violationと基盤Errorの分離、L0/L2/L4の定量負荷、`@ast-grep/cli` 0.45.0の出力契約を固定した。
- 2026-08-02T07:07:19Z — text-mutation-loud-failure の信頼性を副作用順序で定義した; availabilityではなく、validation／not-found／invariant時のstate・全永続audit byte不変とwrite／audit／success／retry／resync 0回を中心にした。
- 2026-08-02T07:13:03Z — text mutation第1レビューを反映した; bulk parseを `2T + 2`、target文法をASCII kebab 1〜64文字、atomic writerをrename前／後、既存ownerを `amadeus-lib.ts` と3 callerへ固定した。
- 2026-08-02T07:20:00Z — repository-adoption のNFRをtrusted baseとevidence provenance中心に定義した; base object取得、30秒TERM／5秒KILL、FP=0 promotion、全投影driftを単一blocking chainへ結合した。
- 2026-08-02T07:24:10Z — repository-adoption第1レビューを反映した; ast-grep 0.45.0、gate step限定1分ceiling、R2 20秒／R4 25秒、seed固定replica manifest、`identityOps` 上限を固定した。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-08-02T06:38:41Z — 自動retryより明示的な後続invocationを選んだ; prior outbox maintenanceとcurrent transitionを分離し、FR-10の呼出開始時byte baselineを保持するため、同一invocation内retryを0回に固定した。
- 2026-08-02T06:48:42Z — 初期実装では並列化とincremental cacheを採らない; 15秒上限を単一snapshot・単一Program・単一ast-grep invocationで先に実測し、完全性oracleとbyte決定性を守ることを優先した。
- 2026-08-02T06:59:46Z — ast-grepのversion probeを通常checkから分離した; frozen install後のCI capability probeでversionとCLI surfaceを検査し、通常checkでは候補ruleとcoverage sentinelを1回のscanへ同梱する。
- 2026-08-02T07:07:19Z — bulk mutationの各step後reparseを維持し、計算量上限を `O(T × (D + S))` と明示した; 安全性を緩める最適化より、256 stage／1 MiBの定量capacity境界を先に検証する。
- 2026-08-02T07:13:03Z — writerのdirectory fsync失敗ではbyte不変を要求せず、rename済みcandidate完全bytesと永続audit不変を要求する; commit後障害をcommit前failureへ偽装しないためである。
- 2026-08-02T07:20:00Z — 15秒性能sampleからcheckout／fetch／installを分離した; gate自身の性能合否とbase object materializationの信頼性を別々に測り、どちらの失敗もoverall greenにしない。

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
