# Business Rules — cursor-live-closure

入力参照: `unit-of-work`、`unit-of-work-story-map`、`requirements`、`components`、`component-methods`、`services`。

## Gate and Phase

- BR-G01: `GITHUB_ACTIONS=true`を最優先し、次に`AMADEUS_CURSOR_LIVE === "1"`を判定する。
- BR-G02: deny時はPhase guard/probe/model callを0回にする。
- BR-G03: U10 guardがgate後にPhase 2 closureを検証し、C4 APIを変更しない。
- BR-G04: static helpだけでsupportedにせず、safe commandの実live anchorsで確定する。

## Isolation and Command

- BR-I01: child envは`PATH`,`HOME`,`TMPDIR`,`XDG_CONFIG_HOME`,`XDG_CACHE_HOME`,`LANG`,`LC_ALL`,`NO_COLOR`,`AMADEUS_CURSOR_PROBE_NONCE`とoptional leased `CURSOR_API_KEY`だけ。
- BR-I02: source user settings/profile/extensions/plugins/additional dirsを読まず、project-local distだけを使う。
- BR-I03: commandはprint/text/ask/sandbox enabled/workspace/trustに固定し、force/yolo/auto-review/MCP approval/plugin/add-dir/worktreeを禁止する。
- BR-I04: credentialはnative isolated statusまたはAPI-key leaseだけ。値/source pathを永続化しない。
- BR-I05: scratch afterShellExecution hookはexact status utility commandだけにnonce-bound atomic receiptを書き、raw prompt/outputを記録しない。

## Journey and Lifecycle

- BR-J01: literal promptは`/amadeus --status`、anchorsはexit 0、nonce-bound status hook receipt、intents不存在、leakなし。engine substringは補助に限定する。
- BR-J02: deadline 120秒、teardown 15秒、outer 150秒、retry 0、serial実行。
- BR-J03: process groupはowner-bound identity再検証後だけsignalし、group残存0を確認する。
- BR-J04: model call開始後の全outcomeをC8へ記録し、pre-spawn unsupportedだけreceipt absentとする。

## Closure

- BR-C01: supported時だけC5/C6をmaterializeし、unsupported adapter stubを禁止する。
- BR-C02: unsupported時もprobe/test/C7 entry/Issue/C9 matrixを必須とし、TBD/要調査/silent skipを禁止する。
- BR-C03: environment-unavailableとtransient failureはU10未完了で、Issue closureに変換しない。unsupportedは取得済みversion/helpとspecific reproducible capability evidenceを必須とする。
- BR-C04: `CURSOR_SAFE_FLAGS_ONLY`,`CURSOR_ENV_ALLOWLIST_EXACT`,`CURSOR_PROJECT_ONLY`,`CURSOR_CREDENTIAL_LEASE`,`CURSOR_STATUS_HOOK_RECEIPT`,`CURSOR_UNSUPPORTED_EVIDENCE_COMPLETE`,`PROCESS_GROUP_OWNER_MATCH`,`NON_GREEN_RECEIPT_REQUIRED`,`PHASE_PREREQUISITE_REQUIRED`のbaseline green/mutant redを要する。
