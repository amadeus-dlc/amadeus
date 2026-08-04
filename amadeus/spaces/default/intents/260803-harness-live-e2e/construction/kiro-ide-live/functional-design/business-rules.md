# Business Rules — kiro-ide-live

入力参照: `unit-of-work`、`unit-of-work-story-map`、`requirements`、`components`、`component-methods`、`services`。

## Gate and Capability

- BR-G01: `GITHUB_ACTIONS=true`を最優先し、次に`AMADEUS_KIRO_IDE_LIVE === "1"`を判定する。
- BR-G02: deny時はPhase guard、probe、profile生成、app launchを0回にする。
- BR-G03: U09所有guardがgate後にPhase 1 closureを検証し、C4 APIを変更しない。
- BR-G04: macOS、app executable/version、dist、generated profile、loopback CDP、chat、machine authを個別capabilityとして記録する。

## Profile and Isolation

- BR-I01: source profile、settings、DB、credential、cookieをcopy/symlinkしない。
- BR-I02: generated SQLite/settingsのpath、schema、literal values、生成順序、canonical digestは`Generated Profile Contract`とexact一致し、追加row/propertyを禁止する。
- BR-I03: `trustedCommands:["*"]`と任意command patternを禁止する。
- BR-I04: child envは`PATH`,`HOME`,`TMPDIR`,`LANG`,`LC_ALL`,`NO_COLOR`だけ。HOME/TMPDIRはscratch。
- BR-I05: generated profileはdebug指定に関係なく全終端経路で削除する。

## CDP and Journey

- BR-C01: CDPは`127.0.0.1`、port 0、fresh `DevToolsActivePort`から解決し、固定portを使わない。
- BR-C02: readinessは60秒、chat inputは60秒、status evidenceは120秒、総240秒、outer 300秒とする。
- BR-C03: DOM/contextとdisk anchorを使い、pixel、screenshot、proseを成功条件にしない。
- BR-C04: prompt read-back、editor clear、fresh latch/counter増分をすべて必須にする。
- BR-C05: retry 0、live serial、同時Kiro.app 1 processとする。
- BR-C06: Chromium sandboxを有効のまま使い、`--no-sandbox`を禁止する。

## Termination and Evidence

- BR-T01: Electronをisolated process groupで起動し、CDP close→group TERM 10秒→group KILL 5秒→leader exit await→group `ESRCH`確認を全経路で行う。debugでもapp/helperを残さない。
- BR-T02: cleanup/leakは`FAIL:EXECUTION_FAILED`、ledger failureは`ledger-write-failed` hard errorとする。
- BR-E01: green時だけC8 receiptを記録する。unsupported Issue/stateはC7、表示はC9が所有し、C8はreceipt不存在を返す。「要調査」を禁止する。
- BR-E02: U02 stable assertions `PROFILE_SCHEMA_EXACT`,`TRUSTED_COMMANDS_EXACT`,`CDP_EPHEMERAL_LOOPBACK`,`SANDBOX_REQUIRED`,`PROCESS_GROUP_EMPTY`,`CREDENTIAL_PROFILE_DELETE_REQUIRED`,`OFFBAND_STATUS_FRESHNESS_REQUIRED`のbaseline green/mutant redを要する。
