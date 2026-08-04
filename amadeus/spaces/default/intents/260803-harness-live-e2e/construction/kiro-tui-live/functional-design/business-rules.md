# Business Rules — kiro-tui-live

入力参照: `unit-of-work`、`unit-of-work-story-map`、`requirements`、`components`、`component-methods`、`services`。

## Gate and Preflight

- BR-G01: `GITHUB_ACTIONS=true`を最優先し、次に`AMADEUS_KIRO_TUI_LIVE === "1"`を判定する。
- BR-G02: runner flagからopt-inを暗黙設定せず、deny時はPhase guard/probe/tmux 0回とする。
- BR-G03: U08所有guardがgate後にPhase 1 closureを検証し、C4 APIを変更しない。
- BR-G04: minimumはtmux 3.2、Kiro CLI 2.6.1。上位versionもrequired help/auth/readiness probeを要する。

## Isolation and TUI

- BR-I01: 全tmux操作はfresh private `-f /dev/null -L <socket>`を持ち、default serverを参照しない。
- BR-I02: socket/session IDはclosed grammar、run固有、作成前registrar登録とする。
- BR-I03: envは`PATH`,`HOME`,`TMPDIR`,`LANG`,`LC_ALL`,`TERM`,`NO_COLOR`だけ。HOME/TMPDIRはscratch、TERMはfixed。
- BR-I04: childはnon-login/no-rc shellからexact `kiro-cli chat --agent amadeus --trust-tools= --agent-engine v2`をexecする。
- BR-I05: terms/consentを自動承認せず、`--trust-all-tools`を禁止する。
- BR-I06: debug traceはevent、pattern digest、timingだけ。pane/keys/prompt/raw outputを記録しない。
- BR-I07: run nonce、private socket/session/pane、PID start identity、PGIDをowner-bound registrar resourceとして保持し、evidenceへ直列化しない。
- BR-I08: group signal前にprivate pane所属、PID start identity、PGIDを再検証する。PGIDは>1かつrunner/tmux server group以外でなければならない。

## Journey and Cleanup

- BR-J01: readinessは60秒/600ms stable、status paneは240秒/stable 0、総300秒、outer 330秒、retry 0。
- BR-J02: promptはliteral `/amadeus --status`、successはpane substringとfresh latch/counter/state anchorsの積である。
- BR-J03: owner再検証成功時だけpane process group TERM 5秒→KILL 5秒→`ESRCH`を行い、その後session/server kill→socket/server PID不在5秒を確認する。
- BR-J06: PID再利用・pane/PGID不一致・所有不明時はgroup signalを禁止し、owner PIDのidentity一致時だけ個別停止してcleanup failureとする。
- BR-J04: debugでもtmuxとscratch HOMEを残さず、sanitized workspaceだけ保持できる。
- BR-J05: cleanup/leakはexecution failure、ledger appendはhard errorへ分離する。

## Evidence

- BR-E01: gate/preflightのstart前skipだけC8 receiptなし。start後のsuccess/skip/timeout/failureは全てC8 receiptを持ち、C7 Issue/stateとC9表示を整合させる。
- BR-E02: consent/sign-in/unsupported terminal patternだけcapability unsupported、patternなしreadiness期限超過はjourney timeoutとする。
- BR-E03: `TMUX_DEFAULT_SERVER_FORBIDDEN`,`TUI_ENV_ALLOWLIST_EXACT`,`TUI_EXPLICIT_OPT_IN`,`CONSENT_AUTOMATION_FORBIDDEN`,`READINESS_TIMEOUT_UNAMBIGUOUS`,`MODEL_TOOL_TRUST_EMPTY`,`PROCESS_GROUP_OWNER_MATCH`,`PANE_PROCESS_GROUP_EMPTY`,`TMUX_SERVER_REAP_REQUIRED`,`NON_GREEN_RECEIPT_REQUIRED`,`OFFBAND_STATUS_FRESHNESS_REQUIRED`のbaseline green/mutant redを要する。
