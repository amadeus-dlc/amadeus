# Business Logic Model — kiro-acp-live

入力参照: `unit-of-work`、`unit-of-work-story-map`、`requirements`、`components`、`component-methods`、`services`。U07は既存Kiro ACP driverを共通C1〜C4/C7〜C9へ接続するC5/C6 sliceである。

## Execution Workflow

1. C2は`GITHUB_ACTIONS === "true"`を最優先し、次に`AMADEUS_KIRO_ACP_LIVE === "1"`を評価する。deny時はphase evidence読取り、probe、scratch、spawnを0回にする。
2. gate許可後、U07所有の`KiroAcpPhaseGuard`がU04/U05の`PhaseClosureEvidence("phase-1")`をread-only検証する。不成立はC4を呼ばず、`LiveOutcome`に新codeを足さず、`Result.err(contract-invalid/phase-prerequisite-unmet)`とする。C4 public APIとU01所有型は変更しない。
3. C5 preflightは隔離envで`kiro-cli --version`、`kiro-cli acp --help`、`kiro-cli whoami`を順に実行し、`dist/kiro`を検査する。minimum versionはspike実証済み`2.6.1`、2026-08-03の実測は`2.13.0`。helpは`acp`、`--agent`、`--trust-all-tools`、`--agent-engine`を必須とする。
4. preflightと実行のenv keysは`PATH`,`HOME`(scratch),`TMPDIR`(scratch),`LANG`,`LC_ALL`,`NO_COLOR`だけとし、`AWS_*`、source `HOME`、profile/config pathを渡さない。同じenvで`whoami`が成功するnative machine credential substrateだけをsupportedとする。
5. C4がregistrarを作った後、fresh project/homeを作り、`dist/kiro`の`.kiro`、`amadeus`、`AGENTS.md`だけをscratch projectへ配置する。
6. C5は`kiro-cli acp --agent amadeus --trust-all-tools --agent-engine v2`をscratch cwdでspawnし、stdoutをNDJSON JSON-RPCとして読む。stderrはsanitized bounded traceへ分離する。
7. C5は`initialize({protocolVersion:1, clientCapabilities:{fs:{readTextFile:false,writeTextFile:false},terminal:false}})`を30秒、`session/new({cwd:<scratch>,mcpServers:[]})`を60秒で行う。session IDはprocess-localで、ledgerへ出さない。
8. C6は`session/prompt`直前に`amadeus/.amadeus-readonly-latch`不存在を検証し、`.amadeus-turn-counter`の初期値`c0`を読む（不存在は0）。literal `/amadeus --status`を送り240秒以内にreplyを待つ。このcommandはKiro hookがoff-band実行するためtool call 0を期待し、実行後latchのJSONが`flag="status"`、`source="read-only-flag"`、integer `turn=c0+1`を持ち、実行後counterも`c0+1`であることを必須にする。他のanchorsは`stopReason === "end_turn"`、permission request 0、state file不存在、`amadeus/spaces/default/intents`不存在である。assistant proseやtoken順序はassertしない。
9. prompt timeout時は`session/cancel`を1回送り5秒待つ。その後stdin close→SIGTERM 5秒→SIGKILL 5秒→`proc.exited` awaitで必ずreapする。late update/replyは結果へ反映しない。initialize/session-new失敗も同じbounded teardownへ入る。
10. C4はcleanupとleak scanを独立に必ず試行し、durable receiptをC8へatomic appendする。cleanup/leak failureだけを`FAIL:EXECUTION_FAILED`へ分類し、ledger append失敗は`Result.err({kind:"ledger-write-failed",receipt,cause})`としてLiveOutcomeに偽装しない。総journey budgetは330秒、teardownは15秒、外側Bun test timeoutは360秒、retryは0回、liveは直列実行とする。
11. supported pathがgreenならreceiptをmatrixへ反映する。binary/version/help/auth/isolated-env capabilityが不成立なら、実測結果、阻害要因、推奨seam、受入条件、再現command、環境メタデータをsanitized `CapabilityClosureEvidence`にして後続Issueへ接続する。単なるskipや「要調査」は完了にならない。

## Result Mapping

| Observation | Result |
|---|---|
| CI / opt-in deny | canonical skip、external call 0 |
| Phase 1 closure不成立 | `Result.err(contract-invalid/phase-prerequisite-unmet)` |
| binary/version/dist/auth/capability不足 | canonical skip + evidence Issue候補。Issue link確定までU07未完了 |
| JSON-RPC/spawn/non-zero/early exit | `FAIL:EXECUTION_FAILED` |
| prompt deadline | `TIMEOUT:JOURNEY_TIMEOUT`、cancel/kill/reap |
| latch/turn/stopReason/permission/state anchor不成立 | `FAIL:ASSERTION_FAILED` |
| cleanup/leak failure | green禁止、`FAIL:EXECUTION_FAILED` |
| ledger append failure | `Result.err(ledger-write-failed)`、receiptを保持しgreen投影禁止 |
| all anchors + durable receipt | `PASS:SUCCESS` |

## Verification

- fake ACP serverがinitialize/session-new/promptのJSON-RPC順序とclosed request shapeを検証し、hook fixtureがstatus latch/turn-counterを生成する。即時`end_turn`だけ、prompt前にpreseedしたmatching latch/counter、latch欠落、counter非増分、turn不一致、unexpected tool callをそれぞれredにする。
- timeout fakeはcancel receipt、SIGTERM/SIGKILL/reap、late event無視を検証する。
- fake processでgate/env/dist/version/auth/capability/cleanup違反を注入し、U02 contract kitをredにする。
- live status journeyは実CLI・実modelで1 sessionだけ直列実行する。
- registry、ledger、matrix、runbook triggerを`kiro-acp` adapter IDへ接続する。

U02 suite bindingは`kiro-acp-contract`。baselineは上記契約でgreen、mutantは`ACP_CANCEL_OMITTED→TIMEOUT_CANCEL_REQUIRED`、`PROCESS_NOT_REAPED→PROCESS_REAP_REQUIRED`、`AMBIENT_ENV_SPREAD→ENV_ALLOWLIST_EXACT`、`PHASE1_CLOSURE_BYPASSED→PHASE_PREREQUISITE_REQUIRED`、`STATUS_LATCH_OMITTED→OFFBAND_STATUS_EVIDENCE_REQUIRED`、`STATUS_LATCH_PRESEEDED→OFFBAND_STATUS_FRESHNESS_REQUIRED`をそれぞれredにする。

## Alternative Closure Contract

後続Issue本文はadapter ID、tested version/help digest、probe timestamp、OS/arch、sanitized command、失敗したcapability、再現手順、阻害要因、推奨seam、受入条件、U07 artifact/Issue #1717へのlinkを必須とする。secret、source home、profile名、raw stdout/stderrは含めない。Issue URLをC7へ保存し、ledger/matrixと一致した時だけalternative closureとする。

## Human Adjudication

- **Date:** 2026-08-03T15:01:12Z
- **Decision:** reviewer上限到達後の選択肢1「2件を修正し、人間裁定でREADYとして続行」
- **Resolution:** adapter stateを`declared → gated → phase-verified → preflighted`へ修正する。deny経路は`declared → gated-deny → terminal skip`で終端し、`KiroAcpPhaseGuard`を呼ばない。
- **Resolution:** prompt直前のlatch不存在と初期counter `c0`を捕捉し、実行後latch/counterがともに`c0+1`で一致することをstatus実行の正の証拠とする。preseeded matching pair、非増分、turn不一致をmutant redにする。
- **Review record:** `Review — Iteration 2`は当時の検出結果として変更しない。追加review iterationは実施せず、この人間裁定を2件のBLOCKER解消根拠とする。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T14:58:24Z
- **Iteration:** 1
- **Scope decision:** none

U07のACP隔離・timeout・終了処理は概ね具体的だが、共通C4/C8契約との境界違反と、実処理を伴わない応答を成功扱いできるアンカー欠陥が残る。

### Findings

- BLOCKER | Phase前提検証がU07の所有境界を越える | business-logic-model Step 2はC4にPhaseClosureEvidence検証と新しいcontract-invalid causeを実装させるが、unit-of-workはC4をU01所有、U07をC5/C6所有と定め、component-methodsのC4 public contractにもPhaseClosureEvidence入力は存在しない。このままではU07実装者はU01 APIを変更するか、設計と異なる場所へ検証を置く必要がある | Phase前提検証を既存C4 contractへ渡せるU07所有のpreflight/呼出前guardとして定義するか、U01所有者が追加する明示的public seamと型・エラー形状を上流設計へ追加する
- BLOCKER | ledger失敗の結果分類が共通契約と矛盾する | business-logic-modelのResult MappingとBR-T04はledger failureをFAIL:EXECUTION_FAILEDへ上書きすると定める一方、component-methodsはledger失敗をclosed LiveCodeへ偽装せずLiveRunError.ledger-write-failedとしてhard failureにすると明示する。U07だけが証跡永続化失敗を通常execution failureへ縮退させ得る | cleanup/leakだけをFAIL:EXECUTION_FAILEDへ分類し、ledger append失敗は共通C4/C8契約どおりResult.err({kind:"ledger-write-failed", receipt, cause})で返す
- BLOCKER | success anchorがACPの実処理を証明しない | literal /amadeus --status に対する成功条件はend_turn、permission request 0、state/intents不存在だけで、tool-call countやtool resultの正条件を使わない。fake ACP serverがtoolを一度も実行せず即座にend_turnを返しても全anchorを満たし、U07のminimal live journeyとACP tool-output normalizationが未実行のままgreenになる | expected tool call/resultまたは同等の構造化status実行証拠を最低1件必須にし、ゼロtool・欠落tool result・重複/late resultをfake contractでredにする

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T15:00:28Z
- **Iteration:** 2
- **Scope decision:** none

C4所有境界とledger-write-failed分類は解消された。off-band証拠は追加されたが現在promptへの因果的な結合がなく、またdomain stateのgate順序が実行契約と逆転している。

### Findings

- BLOCKER | gateとPhase guardの状態順序が矛盾する | Execution WorkflowとBR-G02/G03はgate許可後だけPhase evidenceを読むが、domain-entitiesのAdapter stateはdeclared→phase-verified→gatedと規定する。状態機械どおり実装するとCI denyまたは未opt-inでもPhase evidenceを読み、明示されたzero-read契約に違反する | Adapter stateをdeclared→gated→phase-verified→preflightedへ修正し、deny経路ではKiroAcpPhaseGuardが呼ばれない遷移を明示する
- BLOCKER | off-band latchが現在のstatus実行を証明しない | success条件はlatchのturnとturn-counterが一致することだけで、prompt前の不存在、初期counterからの増分、request/session nonceとの一致を要求しない。Step 5でamadeus treeをコピーするため、matching latch/counterを事前配置したfake ACPがstatusを実行せず即end_turnしてもgreenになり得る。追加されたnegative testにもstale matching pairがない | prompt前にlatch不存在を検証し、run固有nonceまたは捕捉した初期counterからの厳密な増分をlatchへ結合する。preseeded matching latch/counterとnonce不一致をmutant redに追加する
