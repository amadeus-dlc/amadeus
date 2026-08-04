# Business Rules — claude-print-live

入力参照: `unit-of-work`、`unit-of-work-story-map`、`requirements`、`components`、`component-methods`、`services`。

## Gate and Preflight

- BR-G01: 専用opt-inは`AMADEUS_CLAUDE_PRINT_LIVE`、許可値は`"1"`だけ。
- BR-G02: `GITHUB_ACTIONS=true`を最優先し、probe、lease、scratch、spawnを0回にする。
- BR-G03: binary、version、dist、auth、project-setting capabilityをprocess起動前に検査する。
- BR-G04: Claude printの実greenは必須であり、unavailableをIssue branchへ変換しない。
- BR-G05: minimum versionは2.1.220。上位versionは`--print`、`--setting-sources`、`--tools`、`--no-session-persistence`、`--output-format`、`--json-schema`、`--max-budget-usd`のhelp probe成功を要する。

## Configuration and Credential Isolation

- BR-I01: commandは`claude -p --setting-sources project`を含み、`--bare`を使わない。
- BR-I02: scratchに生成するのはproject-local非秘密settingsだけで、user/local settingsとhooksを読まない。
- BR-I03: child envはallow-listから構成し、ambient envをspreadしない。
- BR-I04: source auth/config pathをcopy、symlink、argv/env注入しない。
- BR-I05: credential leaseはC5が取得・注入し、C4 registrar経由で必ず破棄する。
- BR-I06: base env allow-listは`PATH`,`HOME`,`TMPDIR`,`LANG`,`LC_ALL`,`NO_COLOR`。auth bindingはnative keychainまたは`ANTHROPIC_API_KEY`だけで、source `HOME`/`CLAUDE_CONFIG_DIR`を渡さない。
- BR-I07: project settings pathは`.claude/settings.json`、内容はempty hooks objectだけである。

## Journey and Lifecycle

- BR-J01: journeyは1〜数prompt、exit/schema/file/stateの決定的anchorを持つ。
- BR-J02: prose完全一致を成功条件にしない。
- BR-J03: retry既定0、実証済みload transientだけ最大1。
- BR-J04: timeoutはabort→reap→cleanupを完了してから返す。
- BR-J05: cleanup/leak/ledger failureはsuccessを上書きする。
- BR-J06: debug保持でもcredential-bearing resourceは削除する。
- BR-J07: literal prompt/schema、90秒deadline、10秒terminate、10秒reap、120秒outer timeoutを変更する場合はlive再測定を要する。

## Family and Evidence

- BR-F01: Claude共通設定/normalization seamは共有するが、print/SDK/TUI transportを統一しない。
- BR-F02: registryにopt-in、CI deny、setting isolation、anchors、minimum/measured versionを記録する。
- BR-F03: durable green receiptだけがmatrixの最終green SHA/timeへ反映される。
- BR-F04: runbookは`dist/claude`、Claude driver/installer変更からこのjourneyへtraceする。
- BR-F05: U02 stable assertions `POLICY_CI_ZERO_CALLS`,`POLICY_STRICT_OPT_IN`,`ENV_ALLOWLIST_EXACT`,`SETTINGS_PROJECT_ONLY`のbaseline green/mutant redを要する。
