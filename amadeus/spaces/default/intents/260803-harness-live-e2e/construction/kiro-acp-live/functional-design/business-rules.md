# Business Rules — kiro-acp-live

入力参照: `unit-of-work`、`unit-of-work-story-map`、`requirements`、`components`、`component-methods`、`services`。

## Gate and Preconditions

- BR-G01: `GITHUB_ACTIONS=true`を最優先し、次に`AMADEUS_KIRO_ACP_LIVE === "1"`を判定する。
- BR-G02: gate deny時はphase evidence、probe、scratch、ACP processを0回にする。
- BR-G03: gate許可後、U07所有の`KiroAcpPhaseGuard`がPhase 1 closureを検証する。不成立はC4を呼ばず`contract-invalid`でfail-closedにし、C4 public APIを変更しない。
- BR-G04: minimum versionは`2.6.1`、実測versionは`2.13.0`。required help capabilityをversionとは独立に検証する。

## Isolation and ACP

- BR-I01: preflightとexecutionは同一allow-list envを使い、ambient envをspreadしない。
- BR-I02: allow-listは`PATH`,`HOME`,`TMPDIR`,`LANG`,`LC_ALL`,`NO_COLOR`だけ。HOME/TMPDIRはscratchで、`AWS_*`、source profile/config/home pathを渡さない。
- BR-I03: isolated `whoami`成功だけをauth supportedとし、credential値やsource pointerを結果へ記録しない。
- BR-A01: commandは`kiro-cli acp --agent amadeus --trust-all-tools --agent-engine v2`に固定する。
- BR-A02: initialize protocolはversion 1、client filesystem/terminal capabilityはfalse、session/newのMCP serverは空とする。
- BR-A03: literal promptは`/amadeus --status`、assistant proseは非決定的診断でありanchorにしない。
- BR-A04: prompt前latch不存在と初期counter `c0`を必須とし、success anchorsは実行後latchの`flag/status`・`source/read-only-flag`・`turn=c0+1`、実行後counter `c0+1`、tool call 0、`end_turn`、permission request 0、state/intents不存在である。

## Timeout and Cleanup

- BR-T01: initialize 30秒、session/new 60秒、prompt 240秒、総budget 330秒、outer timeout 360秒、retry 0とする。
- BR-T02: prompt timeoutはcancel→5秒→stdin close/SIGTERM→5秒→SIGKILL→5秒→reapの順とする。
- BR-T03: teardown開始後のlate update/replyを結果へ反映しない。
- BR-T04: cleanup/leak failureは`FAIL:EXECUTION_FAILED`としてsuccess、timeout、assertion failureを上書きする。ledger append failureは`Result.err(ledger-write-failed)`としてreceiptを保持し、LiveOutcomeへ縮退させない。
- BR-T05: debug traceはevent kind、sanitized title、byte count、digestだけを残し、prompt、raw output、credential/profile/source pathを残さない。

## Completion Evidence

- BR-E01: green receiptまたは要件を満たす後続Issue linkのどちらかをregistry/ledger/matrixへ一貫して確定する。
- BR-E02: `CAPABILITY_UNSUPPORTED`や「要調査」だけではalternative closureにならない。
- BR-E03: follow-up Issueは実測結果、阻害要因、推奨seam、受入条件、再現手順、親Issue linkを必須とする。
- BR-E04: U02 stable assertions `TIMEOUT_CANCEL_REQUIRED`,`PROCESS_REAP_REQUIRED`,`ENV_ALLOWLIST_EXACT`,`PHASE_PREREQUISITE_REQUIRED`,`OFFBAND_STATUS_EVIDENCE_REQUIRED`,`OFFBAND_STATUS_FRESHNESS_REQUIRED`のbaseline green/mutant redを要する。
