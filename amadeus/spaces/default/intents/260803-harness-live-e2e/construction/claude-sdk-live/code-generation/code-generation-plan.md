# Code Generation Plan — claude-sdk-live

対象 Unit: U04 `claude-sdk-live`
Scope: `self-feature`
Test Strategy: Comprehensive

## 前提と変更面

- 承認済みFunctional/NFR Designを正本とし、Claude Agent SDK surfaceだけを既存`tests/harness/live-e2e/` kernelへ接続する。
- SDK client/session/streamは専用child workerだけが所有する。U03のClaude family seamからproject-only settings、fresh scratch、credential sourceを再利用するが、print/TUI transportは共有しない。
- `dist/`、workflow state/audit/runtime mirrorは編集・削除・commitしない。matrixはtyped registryから明示生成する。
- unit-of-work、story map、requirementsは本Bolt worktreeへ複製されていないため、Issue #1717のcaptured intent、FR-1〜FR-11、U04のBR-G/I/R/CとLC-CS-01〜08へtraceする。

## 実装手順

- [x] Step 1: `claude-sdk` capability、strict `AMADEUS_CLAUDE_SDK_LIVE === "1"`、GHA hard deny、SDK 0.3.158 import/version/capability probe、dist/auth preflightを追加する（FR-1〜FR-4、BR-G01〜G04、LC-CS-01）。
- [x] Step 2: 既存`driveAidlc`へproject-only settings authority、parent abort forwarding、全terminalとmessage orderの観測面を後方互換で追加する（FR-4/FR-6、BR-I01/I02、BR-R01/R02/R08）。
- [x] Step 3: SDK-owning child workerとclosed spawn specを実装し、explicit cwd、allow-list env、project-only settingsだけを渡す（FR-3〜FR-6、LC-CS-02/03）。
- [x] Step 4: run/generation-bound credentialをlength-prefixed stdin frameで1回だけ渡し、worker env/argv/filesystemへsecret/source pathを露出せず、reap後にbindingをreleaseする（NFR-2/NFR-4、BR-I03/I04、LC-CS-07）。
- [x] Step 5: literal `echo ok` journeyをtool/state/audit/assistant/terminalのsanitized ordered eventsへnormalizeし、exactly-one terminal、success subtype、positive turns、permission denial 0、nonempty output、duplicate/late rejectionを実装する（FR-6/FR-10、BR-R01/R02/R08、LC-CS-04/06）。
- [x] Step 6: parent timeoutからSDK abort、10秒grace、SIGTERM 5秒、SIGKILL/reap 5秒へ進むworker-group supervisorと、late generationを採用しないcleanup precedenceを実装する（FR-5/FR-6、BR-R03/R04/R06/R07、LC-CS-05）。
- [x] Step 7: single 65,536 bytes、total 1,048,576 bytes、4,096 events、queue 16 events/262,144 bytesのbounded collector、incremental digest、overflow後discard-drainを実装する（NFR-1/NFR-5、LC-CS-08）。
- [x] Step 8: U02 contract kitへCI/opt-in/env/settings、`SDK_CREDENTIAL_PIPE_SINGLE_USE`、`SDK_OUTPUT_BOUNDED_DRAIN`のbaseline/mutant evidenceを追加する（FR-10、BR-C01）。
- [x] Step 9: unit、fake worker integration、explicit opt-in serial live testsを追加し、gate zero-call、credential frame、structured success、duplicate terminal、abort無視、output overflow、old SDK skipを検証する（Comprehensive strategy、BR-C01〜C03）。
- [x] Step 10: runbookとgenerated matrixへSDK trigger、isolation、実行方法、limitsを追加し、focused tests、lint、typecheck、matrix、package/promote drift guardを通す（FR-11）。
- [x] Step 11: `code-summary.md`へ変更、設計判断、tests、逸脱を記録し、U04 pathsだけを英語Conventional Commitでcommitする。

## Test Configuration

既存Bun 1.3.13、TypeScript strict、Biome、`*.serial.test.ts` discoveryを使用する。real live journeyの外側timeoutは120秒、内側journeyは90秒。fake workerの通常deadlineは10秒、abort escalation試験だけ30msとし、CPU負荷下のcold-start誤timeoutと本来のtimeout契約を分離する。通常実行ではopt-in不在またはGHA hard denyによりSDK import probe、scratch、worker、model、ledgerを0回にする。
