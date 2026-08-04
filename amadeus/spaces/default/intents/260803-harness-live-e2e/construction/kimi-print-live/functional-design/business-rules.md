# Business Rules — kimi-print-live

入力参照: `unit-of-work`、`unit-of-work-story-map`、`requirements`、`components`、`component-methods`、`services`。

## Phase, Gate, and Preflight

- BR-P01: C2 gate許可後にU04/U05のPhase 1 closure evidenceを検証し、不成立は`LiveOutcome`ではなく`contract-invalid/phase-prerequisite-unmet`にする。
- BR-G01: 専用opt-inは`AMADEUS_KIMI_PRINT_LIVE`、許可値は`"1"`だけ。
- BR-G02: `GITHUB_ACTIONS=true`を最優先し、probe、lease、scratch、spawnを0回にする。
- BR-G03: binary、version、required flags、dist、authを課金process起動前に検査する。
- BR-G04: minimum versionは`0.29.0`、実測versionは`0.31.1`。上位versionも`-p|--prompt`と`--output-format`のhelp probe成功を要する。
- BR-G05: Kimi printの実greenは必須であり、unavailableやskipをIssue branchへ変換しない。

## Configuration and Credential Isolation

- BR-I01: commandは`kimi -p <prompt> --output-format text`、cwdとhomeはscratchだけを使う。
- BR-I02: scratch configはmanaged provider/modelの非秘密値だけを持ち、source configをcopyしない。
- BR-I03: child env keyは`PATH`,`HOME`,`TMPDIR`,`KIMI_CODE_HOME`,`LANG`,`LC_ALL`,`NO_COLOR`だけで、ambient envをspreadしない。
- BR-I04: C5だけが`credentials`/`oauth` symlink leaseを所有し、registrarへのplanned登録を作成より先に行う。
- BR-I05: source path、credential bytes、lease locatorをargv、env、stdout/stderr、result、receipt、ledgerへ直列化しない。
- BR-I06: childが参照するcredential pointerはscratch `KIMI_CODE_HOME`配下の短命symlinkだけとする。
- BR-I07: success、failure、timeout、prepare途中、debug保持の全経路でcredential symlinkとscratch configを削除する。
- BR-I08: model IDはoptional exact prefix `kimi-code/`を除いた1〜64文字の`^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$`だけを許可する。
- BR-I09: configは検証済み`KimiModelId`からstructured document/serializerで生成し、raw env置換・TOML fragment連結を禁止する。不正overrideは`contract-invalid/invalid-model-id`でspawn前に拒否する。

## Journey and Lifecycle

- BR-J01: literal promptは`/skill:amadeus --status`、anchorsはexit 0、timeout false、`no active` substring、`intents`不存在である。
- BR-J02: prose全文一致を成功条件にしない。
- BR-J03: retryは0回とする。
- BR-J04: deadlineは180秒、SIGTERM graceは10秒、SIGKILL/reapは10秒、outer timeoutは240秒とする。
- BR-J05: cleanup/leak/ledger failureはsuccess、assertion failure、timeoutを上書きする。
- BR-J06: live journeyは直列実行し、1回のKimi model sessionだけを消費する。

## Evidence

- BR-E01: registryはopt-in、CI deny、minimum/measured version、required flags、credential binding、anchorsを保持する。
- BR-E02: durable green receiptだけがmatrixのgreen SHA/timeへ反映される。
- BR-E03: U02 stable assertions `RESOURCE_REGISTER_BEFORE_CREATE`,`SOURCE_POINTER_ABSENT`,`ENV_ALLOWLIST_EXACT`,`PHASE_PREREQUISITE_REQUIRED`,`MODEL_ID_GRAMMAR_REQUIRED`のbaseline green/mutant redを要する。
- BR-E04: Phase 2 closureはKimiのdurable green receiptなしでは成立しない。
