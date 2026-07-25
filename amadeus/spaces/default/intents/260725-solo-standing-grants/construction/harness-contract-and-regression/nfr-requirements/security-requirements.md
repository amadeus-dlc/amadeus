# Security Requirements: harness-contract-and-regression

## Inputs and Threat Boundary

`business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`を入力とする。canonical source、generator、generated skills/hooks、host session identity、directive/report wire、general audit CLIをtrust boundaryとする。

## Controls

| ID | Threat | Required control | Pass condition |
|---|---|---|---|
| U3-SEC-01 | generated copy tampering | canonical generation + drift 0 | manual mutation fixture fails check |
| U3-SEC-02 | harness固有のfail-open | shared exact schema/result golden | malformed matrixで全harness mutation 0 |
| U3-SEC-03 | protected receipt/presence forgery | general audit CLI mint guardを全distributionで維持 | public append attempt nonzero |
| U3-SEC-04 | session spoof/cross-session turn | host adapter由来session ID + session-keyed reservation | 別session/machine injectionのowner `HUMAN_TURN` 0 |
| U3-SEC-05 | intent target path injection | opaque UUIDv7 + current-space registry exact resolution | path/alias/別space/complete targetのmutation 0 |
| U3-SEC-06 | team privilege regression | solo carrier/target/reservationをteam leader/delegationへ流さない | team golden差分0 |
| U3-SEC-07 | reservation replay/tamper | versioned exact schema、session digest、Reservation Id audit correlation、atomic transitions | replay mint 0、tamper approval 0 |

## Data Protection

Grant Id、Route Id、opaque intent UUID、Presence Reservation Id、host session IDはworkflow metadataである。prompt body、credential、PIIをsession reservationやauditへ保存しない。session runtimeは既存gitignored `.amadeus-sessions/`のpath normalization、local permissions、retentionに従い、generated harnessは追加telemetryを送信しない。

## Supply-chain Verification

canonical core、generator input、generated projectionの対応をdrift checkで検証する。frozen [PR #1468](https://github.com/amadeus-dlc/amadeus/pull/1468) のbranch、artifact、commitをbuild inputに含めない。新しいdependencyの追加はlockfile diffとdependency inventoryでblocking review対象にする。

## Identity and Trust Contract

intent UUIDは既存`intents.json`がintent birth時に発行するUUIDv7であり、新しい永続modelではない。current spaceでexactly one、status `in-flight`へregistry解決し、record pathはregistry rowから内部解決する。UUID再利用、別space fallback、symlink/path inputを拒否する。

session identity sourceはClaude `session_id`、Codex normalized `session_id`、Cursor `session_id`、Kiro CLI `session_id`である。Cursor mint adapterは既存envelope fieldをcore hookへ追加forwardする。Kiro IDEとOpenCodeはstable native identity adapterの追加をblocking prerequisiteとし、欠落時はtargeted HUMAN_TURN/approvalを0にする。session file名はraw IDではなくnormalized digestを使用する。

registered UserPromptSubmit adapterをtrusted writerとする現行`HUMAN_TURN`脅威境界を維持し、reservation mint APIをgeneral CLIへ公開しない。general audit CLI mint refusalとmachine-injection classifierを回帰検証する。modelがlocal trusted hook executable自体を直接起動できるという既存threat modelのhardeningは本Issueのscopeを広げるため別intentとし、本変更で新しいpublic mint入口を追加しない。

## Traceability and Ownership

| Target | Upstream | Harness rules | Blocking suite |
|---|---|---|---|
| U3-SEC-01–03 | NFR-01, NFR-03, NFR-08 | HR-01–04b, HR-19 | generation/protected-event suite |
| U3-SEC-04–05 | FR-15–18, NFR-03–04 | HR-02–04, HR-08, HR-21 | hook/target cross-harness integration |
| U3-SEC-06 | FR-19, NFR-05 | HR-05–09 | team regression golden |
| U3-SEC-07 | FR-18, NFR-01–04 | HR-04c–e, HR-08a, HR-24 | reservation state-machine integration |
