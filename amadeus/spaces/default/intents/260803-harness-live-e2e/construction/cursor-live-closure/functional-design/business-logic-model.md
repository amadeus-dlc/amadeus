# Business Logic Model — cursor-live-closure

入力参照: `unit-of-work`、`unit-of-work-story-map`、`requirements`、`components`、`component-methods`、`services`。U10はCursor Agent非対話surfaceを実測し、成立時だけC5/C6 adapterをmaterializeし、不成立時は再実行可能なprobe packageとIssueで閉じる。

## Execution Workflow

1. C2は`GITHUB_ACTIONS === "true"`を最優先し、次に上流契約どおり`AMADEUS_CURSOR_LIVE === "1"`を評価する。deny時はPhase guard、binary/auth probe、model callを0回にする。
2. gate許可後、U10所有の`CursorPhaseGuard`がU06〜U09のPhase 2 closureを検証する。Kimiはgreen receipt、Kiro 3面はgreenまたは要件を満たすIssue、C7/C8/C9投影が一致しなければC4を呼ばず`contract-invalid/phase-prerequisite-unmet`とする。
3. C5 preflightは`cursor --version`、`cursor agent --version`、`cursor agent --help`、`dist/cursor`、authをread-only検査する。2026-08-04実測はIDE `3.13.25`、agent `2026.07.23-e383d2b`。required flagsは`--print`、`--output-format`の`text|json|stream-json`、`--mode ask|plan`、`--sandbox enabled|disabled`、`--workspace`、`--trust`、`--api-key`である。
4. authは同じisolated envのnative `cursor agent status`成功または`CredentialSourcePort`からleaseした`CURSOR_API_KEY`だけを許可する。source HOME、`.cursor` user config、account情報、API keyをargv/result/log/ledgerへ出さない。API keyはchild envへだけ注入し、registrarが必ず破棄する。
5. C4がregistrarを作った後、fresh git workspace/HOME/TMPDIR/XDG config/cacheを作り、`dist/cursor`の`.cursor`、`amadeus`、`AGENTS.md`だけを配置する。`.cursor/hooks.json.example`はproject-local `.cursor/hooks.json`へcopyし、user extensions/plugins/settingsは読まない。
6. C5はtest-only `.cursor/hooks/amadeus-live-probe-receipt.ts`をscratchへ生成し、既存hook wiringを保持したまま`afterShellExecution`へ追加する。scriptはstdinのdocumented `command`がexact `bun .cursor/tools/amadeus-utility.ts status`の場合だけ、O_EXCL/atomicで`.cursor/.amadeus-live-probe-receipt.json`へ`{schemaVersion:1,nonce,event:"afterShellExecution",commandId:"cursor-status-utility",commandSha256:<fixed>}`を書く。prompt/output/account/pathは書かない。
7. C5はchild envを`PATH`,`HOME`,`TMPDIR`,`XDG_CONFIG_HOME`,`XDG_CACHE_HOME`,`LANG`,`LC_ALL`,`NO_COLOR`,`AMADEUS_CURSOR_PROBE_NONCE`とoptional `CURSOR_API_KEY`だけから構成する。nonceは128-bit random hexでreceipt以外へ永続化しない。
8. receipt file不存在を確認後、safety capability probeはscratch cwdで`cursor agent --print --output-format text --mode ask --sandbox enabled --workspace <scratch> --trust "/amadeus --status"`をspawnする。`--force`/`--yolo`/`--auto-review`/`--approve-mcps`/`--add-dir`/`--plugin-dir`/`--worktree`を禁止する。
9. C6 anchorsはexit 0、receiptのnonce/event/command ID/hash完全一致、combined outputの補助substring `No active AI-DLC workflow`、`amadeus/spaces/default/intents`不存在、source path/secret leakなしである。hook receiptがstatus utility実行の正本であり、stdout proseは補助診断に限定する。
10. childはisolated process groupで起動する。120秒deadline後はowner-bound PID/start identity/PGIDを再検証し、TERM 10秒→KILL 5秒→group `ESRCH`を確認する。owner不明ならgroup signalを拒否し、identity一致leaderだけを停止してcleanup failureとする。
11. 総budget 120秒、teardown 15秒、outer timeout 150秒、retry 0、live直列とする。model call開始後のsuccess/timeout/failure/cleanup結果はC8 receiptへ追記し、ledger failureだけhard errorとする。
12. 全anchors成立時だけ`cursor-agent-print` C5/C6をregistryへsupportedとしてmaterializeする。unsupported遷移はversion/helpを取得済みで、再現可能なprobeが特定の必須capability欠如を証明し、Issue必須fieldsが全て揃う場合だけ許可する。環境不足・一時failureはU10未完了のhard errorとし、Issueで代替しない。

## Capability Decision Table

| Phase | Observation | Classification | Closure |
|---|---|---|---|
| pre-spawn | binary/dist/auth unavailable、version取得不能 | `Result.err(environment-unavailable)` | U10未完了、Issue代替禁止、C8 receipt absent |
| pre-spawn | versions/help取得済みでrequired flagが明示的欠如 | measured capability unsupported | C7 unsupported + complete Issue、C8 receipt absent |
| post-spawn | CLIがstable capability codeでask/sandbox/project hook非対応を返す | measured capability unsupported | C7 Issue + C8 skip receipt |
| post-spawn | 120秒超過 | `TIMEOUT:JOURNEY_TIMEOUT` | U10未完了、C8 timeout receipt |
| post-spawn | non-zero/spawn/protocol error | `FAIL:EXECUTION_FAILED` | U10未完了、C8 failure receipt |
| post-spawn | exit 0だがreceipt/state/leak anchor不成立 | `FAIL:ASSERTION_FAILED` | U10未完了、C8 failure receipt。根因実測なしにunsupported化禁止 |
| post-spawn | all anchors | `PASS:SUCCESS` | C7 supported + C8 green receipt + C5/C6 materialize |

## Verification

- fake cursor binaryでargv/env/cwd、API-key lease、workspace/settings isolation、afterShellExecution receipt、result normalizationを検証する。
- `--force`、ambient env、source HOME、user plugin、GHA bypass、implicit opt-in、secret/output leakをmutant redにする。
- process owner mismatch/PID reuse/timeout/cleanup/ledger failureをU02 contract kitへ接続する。
- probe outputはversion/help digest、exit、receipt anchor booleans、sanitized failure classだけを保持し、raw responseをIssueへ載せない。文字列だけ、stale receipt、nonce/hash不一致をredにする。

U02 suite bindingは`cursor-agent-contract`。stable assertionsは`CURSOR_SAFE_FLAGS_ONLY`,`CURSOR_ENV_ALLOWLIST_EXACT`,`CURSOR_PROJECT_ONLY`,`CURSOR_CREDENTIAL_LEASE`,`CURSOR_STATUS_HOOK_RECEIPT`,`CURSOR_UNSUPPORTED_EVIDENCE_COMPLETE`,`PROCESS_GROUP_OWNER_MATCH`,`NON_GREEN_RECEIPT_REQUIRED`,`PHASE_PREREQUISITE_REQUIRED`とする。

## Alternative Closure Contract

後続Issueは取得済みIDE/agent version、OS/arch、required help digest、auth mode kind、sanitized exact command、specific missing capability、reproducible probe、各anchor boolean、exit/stable capability code、阻害要因、推奨seam、受入条件、親Issue/U10 artifact linkを必須とする。全fieldを取得できないenvironment-unavailable/transient failureはIssue closure不可。account、API key、HOME、raw stdout/stderr、prompt responseを含めない。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T15:23:29Z
- **Iteration:** 1
- **Scope decision:** none

Phase guardとconditional adapter境界は概ね整理されているが、opt-in契約の不一致、未実測状態をunsupported closureにできる分岐、実status実行を証明しない成功anchorが残る。

### Findings

- BLOCKER | Cursor opt-in名が上流契約と不一致 | requirements FR-1はCursor adapter実装時の専用変数をAMADEUS_CURSOR_LIVEと固定しているが、business-logic-modelとbusiness-rulesはAMADEUS_CURSOR_AGENT_LIVEを判定する。利用者が要件どおりAMADEUS_CURSOR_LIVE=1を設定しても常にskipとなる | 上流契約どおりAMADEUS_CURSOR_LIVEへ統一するか、要件側の外部契約を正式に変更して全参照を同時更新する
- BLOCKER | 未実測・一時失敗をunsupported closureにできる | Capability Decision Tableはbinary/version/help/dist/auth不足をC7 unsupported+Issueで閉じ、timeout・execution failure・assertion failureもIssue候補にする。しかしFR-9は実機測定後に必須capabilityが成立しない場合だけunsupported Issueを許す。さらにAlternative ClosureはIDE/agent versionとhelp digestを必須とするため、binaryまたはagent subcommand不足では同じ設計内でもclosureを構成できない | environment-unavailable、transient failure、measured-capability-unsupportedを分離し、前二者はU10未完了のhard failureとする。C7 unsupportedへの遷移は再現可能なprobeで具体的capability欠如を実測し、必須Issue fieldsを全て取得できた場合だけ許可する
- BLOCKER | success anchorが現在のstatus実行を証明しない | exit 0、case-sensitiveなNo active AI-DLC workflow文字列、intents不存在はいずれもstatus utility実行の正の構造化証拠ではない。fake binaryが当該文字列を出力してexit 0にすれば、/amadeus --statusを実行せず全anchorを満たせる。また自然言語substringはFR-6/NFR-2が求める決定的anchorとして不安定である | run nonceに結合したproject-local hook receipt、機械可読status JSON、または同等のoff-band実行証拠を必須にする。単なる文字列出力、stale証拠、nonce不一致をmutant redへ追加する

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T15:26:21Z
- **Iteration:** 2
- **Scope decision:** none

Iteration 1の3 BLOCKERは解消された。opt-inはAMADEUS_CURSOR_LIVEへ統一され、environment/transient failureと実測済みunsupportedが分離された。status成功判定もrun nonceとcommand hashに結合したafterShellExecution receiptを正本とし、stale・文字列のみ・nonce/hash不一致を拒否できる。

### Findings

- None
