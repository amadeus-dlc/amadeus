# Code Summary — execution-evidence

## 実装結果

U3 `execution-evidence` の承認済み責務として、arm-neutralな実行policy、cell/suite runner、closed evidence bundle、runner/store二重ledgerを持つatomic filesystem store、suite/matrix completenessを実装した。E-FVEU3CGP1で16 Stepのplanを承認し、E-FVEU3CGR1で同一責務のproduction上限を1,100 LOCへ再承認した。最終productionは783 LOCで上限内である。

| 区分 | ファイル | 内容 |
| --- | --- | --- |
| 実行 | `scripts/formal-verif/execution-evidence.ts` | typed ports、absolute deadline、serial cell/suite実行、HARNESS_ERRORとstore errorの分離 |
| policy | `scripts/formal-verif/execution-policy.ts` | executable/input identity、repository containment、argv/env allowlist、read-only snapshot |
| bundle | `scripts/formal-verif/evidence-bundle.ts` | closed 5 payload、raw byte hash/length、bundle/envelope domain separation、size cap |
| store | `scripts/formal-verif/fs-evidence-store.ts` | staging、owner付きsingle-writer lock、dual ledger、atomic rename、idempotent retry、durable capacity reservation |
| completeness | `scripts/formal-verif/evidence-completeness.ts` | expected subject完全一致、warmup分離、5 measured agreement、closed incomplete findings |
| export | `scripts/formal-verif/index.ts` | U3 public surfaceの追加 |

U1のstrict `CellResult` parser、canonical identity、repository path policy、safe receiptを再利用した。TLA/TS arm adapter、fixture registry、eligibility/Pareto、report evaluator/renderer、final CLIは実装・importしていない。`tsconfig.json` の既存dirty差分はU1由来であり、U3では変更していない。`packages/framework/`、`packages/setup/`、`dist/`、lockfileは変更していない。

## Test Coverage

追加したtestはUnit 4ファイル、Integration 2ファイル、E2E 1ファイルとtest support 1ファイルである。policyのpre-spawn拒否、raw bytesとpayload identity、deadline/error分類、atomic publish/ledger drift/retry/capacity、suite/matrix completeness、U1→U3 seam、spawned lifecycleを検証した。

- U3 focused: 78 pass / 0 fail / 146 expects / 7 files
- 全formal-verif regression: 331 pass / 0 fail / 556 expects / 19 files
- tier runner: Unit 226、Integration 75、E2E 30 assertions、すべてPASS
- `bun run typecheck`: PASS
- `bun run lint:check`: PASS（advisory complexity warningのみ）
- `bun run check`: PASS
- `bun run dist:check`: 6 harness PASS
- final sensors: production linter `15221450` / `256bff2d`、production type-check `1d5d9276` / `afa572da`、test linter `8e506fc9` / `489c9ae8`、test type-check `76e9252d` / `5ad1a0cb`、すべてPASS。answer-evidenceはquestions file非該当
- `packages/framework/`、`packages/setup/`、`dist/`の境界差分: 0件、禁止依存scan: 0件

## 実装判断と計画差分

- evidence store failureはverdictへ丸めずtyped errorとして返す。
- `HARNESS_ERROR` cellはevidenceとして保存し、残時間がある限り後続subjectを継続する。
- warmupは保存・検証するが、measured agreementや比較sampleへ含めない。
- filesystem上の未参照bundleを自動採用せず、verified receiptを持つsuite参照だけを検証対象とする。
- E-FVEU3CGR1によりLOC上限を1,100へ更新し、E-FVEU3CGR2によりIteration 2の残存findingだけを是正した。責務、Unit境界、依存方向、test strategyの変更はない。

実装・検証上の未解決blockerはない。Biomeのcomplexity warningが新規productionの4関数に残るが、lintとsensorはPASSしており、承認済み責務の分割を新たに導入しない判断とした。最終判定は独立review Iteration 3で行う。

## Iteration 2 是正

E-FVEU3CGR2のrecorded裁定に従い、Iteration 2の残存Critical 1件、Major 2件、Minor 1件を同一U3境界内で是正した。

- store由来の真正proofでも、期待集合外subjectを`METADATA_DRIFT`としてfail-closedで拒否する。
- lock ownerを一意なstaging directoryへdurable writeし、directory sync後に`.writer-lock`へatomic renameする。ownerlessな既存lockはquarantineして回復し、malformed ownerはfail-closedとする。
- genuine unknown cellとownerless lock crashの2反例を固定回帰testへ追加した。
- Iteration 1のidentity/envelope binding、偽造proof、non-zero/signal、publish reserve、snapshot binding、capacity lifecycleの是正を全回帰で維持した。
- summaryのLOC・test実測値を更新した。Iteration 2是正時点は765 LOC、focused 77件、formal全体330件であり、Iteration 3是正後の最終値は783 LOC、focused 78件、formal全体331件である。

## Review — Iteration 1

**Verdict: NOT-READY**

Critical 3件、Major 5件、Minor 1件。focused testがgreenでも、承認済みU3設計のfail-closed、verified receipt、dual-ledger、deadline、snapshot isolationを満たさない反例が残る。

### Critical

1. **永続化後の再検証がenvelope/result identityをledgerへ結合していない。** `scripts/formal-verif/fs-evidence-store.ts:157`〜`167` はpayload manifestと一部のbundle/linkだけを検査し、`resultIdentity`の再計算、runner entryの`linkIdentity`との一致、envelope hashの再計算、envelope coordinatesと両ledger entryの一致を検査しない。独立probeでは公開済み`index.json`の`resultIdentity`と`envelope.publishedAt`を改変しても`readCell(...).ok === true`となった。改変済みtransactionから`VerifiedExecutionReceipt`を再構築できるため、atomicity/dual-ledgerのfail-closed条件を破る。
2. **completeness proofを手書きreceiptとunknown cellから生成できる。** `scripts/formal-verif/execution-evidence.ts:45`〜`53` は`VerifiedExecutionReceipt`を公開されたstructural interfaceとしており、`scripts/formal-verif/evidence-completeness.ts:35`〜`46` はreceiptの`kind`とbundle ID形式しか確認せず、expected subjects外のcellも拒否しない。独立probeでは偽造receiptを持つ`HEALTHY_BASELINE`と`UNKNOWN` cellを渡して`CompleteSuiteProof`が返った。verified store readだけを入力とし、unknown/handwrittenを不完全にする設計に反する。
3. **non-zero exitまたはsignalを`NOT_DETECTED`として公開できる。** `scripts/formal-verif/execution-evidence.ts:105`〜`108` は`timedOut=false`かつ`completedExploration=true`ならexit code/signalを確認せずnormalizerを信用する。独立probeでは`exitCode=7`をnormalizerが`NOT_DETECTED`へ変換し、そのままpublishされた。tool failureを`HARNESS_ERROR`へ閉じるverdict境界を破り、誤った安全判定を生成し得る。

### Major

1. **publish reserveがsubprocess timeoutへ反映されない。** `scripts/formal-verif/execution-evidence.ts:99` はtimeoutを常に`deadlineMs - startedMono`とし、`runArmSuite`のreserve確認（同`:147`〜`150`）を`executeCell`へ渡さない。独立probeではdeadline 100ms、reserve 20msでもprocess timeoutは100msだった。また`fs-evidence-store.ts:140`〜`148`はrename前だけ期限を確認し、parent sync後に期限超過してもsuccessを返し得る。suite全体のabsolute deadlineにpublish時間を確保できない。
2. **認可済み実行がsnapshotへ強制的にbindされていない。** `scripts/formal-verif/execution-policy.ts:35`〜`40` の`AuthorizedProcessRequest`は元の`argv/cwd/inputPaths/environment`を継承し、同`:89`〜`93`もそれらをsnapshot-relative pathへ置換しない。`scripts/formal-verif/execution-evidence.ts:99`はこの値をinjected portへそのまま渡し、productionのprocess adapterやspawn直前seal再検証も存在しない。独立probeでも認可後のargvは`bin/tool`、cwdは`.`、inputは`inputs/in`のままだったため、元repositoryを実行する実装が型上許される。
3. **writer lockとcapacity reservationが承認済みcrash/capacity契約を実装していない。** `scripts/formal-verif/fs-evidence-store.ts:89`〜`92` はowner recordなしの`mkdir` lockで、crash後のowner判定・quarantine・安全な再取得がない。同`:94`〜`109`のreservationは単一JSONの作成/削除だけで、store lock、active reservation合算、physical preallocation、revision lifecycle、publish消費量、publish前のreservation必須化を持たない。ownerless permanent lockと未予約publishを許す。
4. **testsは上記の主要反例を反証していない。** `tests/unit/t-formal-verif-evidence-completeness.test.ts:4`は本物のstore readではなく偽造receiptを正常fixtureとして使い、同`:9`はそれをcompleteとして期待する。`tests/unit/t-formal-verif-execution-runner.test.ts:21`〜`33`にはnon-zero/signal、reserve差引き、publish後deadlineの反例がない。`tests/integration/t-formal-verif-evidence-store.integration.test.ts:15`〜`34`にもenvelope/result link改変、owner crash/stale lock、active reservation競合/physical allocationがない。Comprehensive strategyの反証力を満たさない。
5. **承認plan外のtest configuration差分が未報告である。** `tsconfig.json:19`はtracked baselineの`scripts/*.ts`から`scripts/**/*.ts`へ変更されている一方、`code-generation-plan.md:50`と`:70`は既存設定で対象になり変更しないとしており、本summaryの変更ファイル一覧にもない。必要な変更ならplan deviationとして明示し、U3外変更の承認境界を確認する必要がある。`packages/framework/`、`packages/setup/`、`dist/`、lockfileのtracked差分は0件だった。

### Minor

1. **production LOCの記録が現物と不一致である。** 本summaryは5行目で595 LOCとするが、指定6ファイルの`wc -l`は603 LOCだった。800 LOC上限内ではあるが、証跡値を更新する必要がある。

### 検証結果

- 指定U3 focused suite: **65 pass / 0 fail / 98 assertions / 7 files**
- `bun run typecheck`: **PASS**
- `bun run lint:check`: **PASS**（既存を含むwarningのみ）
- production LOC: **603 / 800**
- 禁止依存negative scan: **0件**
- `packages/framework/`、`packages/setup/`、`dist/`、lockfileのtracked差分: **0件**
- 独立negative probes: **4件すべて反例成立**（改変identity/envelopeをread成功、偽造receipt+unknown cellをComplete判定、non-zeroをNOT_DETECTED化、20ms reserve未控除）

## Review — Iteration 2

**Verdict: REVISE（Critical 1 / Major 2 / Minor 1、GoA: NO-GO）**

Iteration 1のidentity/envelope改変、偽造proof、non-zero/signal、publish reserve、snapshot binding、capacity lifecycleは閉包した。一方、真正store proofを持つ期待集合外cellがcompleteになる反例、ownerless lockが永久停止する反例、その固定test欠落、summary実測値の旧記録が残った。E-FVEU3CGR2のrecorded裁定により、これらを上記「Iteration 2 是正」の範囲で修正した。独立review Iteration 3の判定前であり、この節だけではREADYを主張しない。

## Review — Iteration 3

**Verdict: REVISE（Critical 0 / Major 1 / Minor 0、GoA: NO-GO）**

UTC: `2026-07-21T03:45:40Z`

### Finding

1. **Major — parse可能だがschema不正なlocal lock ownerをstale ownerとして奪取する。** `scripts/formal-verif/fs-evidence-store.ts:138`〜`143` は`owner.json`を`LockOwner`へcastするだけで、host、正のpid、process-start identity、nonce、createdAtのshapeを検証しない。`host=hostname()`、`pid=0`、空の`processStartedAt` / `nonce` / `createdAt`を持つownerを独立probeしたところ、`reserveCapacity`は成功し、既存lockをquarantineした。invalid JSONとremote/live ownerは拒否され、ownerless lockは回復したが、parse可能なmalformed ownerはfail-closedになっていない。corruptなlive ownerをstaleと誤認してsecond writerを許し得るため、承認済みlock safetyを満たさない。`tests/integration/t-formal-verif-evidence-store.integration.test.ts:30`、`:37`、`:38`はlive/stale/ownerlessを固定する一方、このparseable-malformed反例を固定していない。

### 旧finding closure

- Iteration 1 C1 identity/envelope改変read: **CLOSED**。`readCell`がresult identity、envelope hash、両ledger coordinates/cross-referenceを再計算し、改変probeを拒否した。
- Iteration 1 C2 forged proof / unknown cell: **CLOSED**。WeakSet authorityを持たないstructural forgeryと、真正store proof付き期待集合外cellの両方を`IncompleteSuiteProof`にした。
- Iteration 1 C3 non-zero/signal正常化: **CLOSED**。いずれもnormalizerを呼ばず`HARNESS_ERROR`にした。
- Iteration 1 M1 publish reserve/deadline: **CLOSED**。process timeoutからreserveを控除し、durable parent sync後もdeadlineを再確認した。
- Iteration 1 M2 snapshot binding: **CLOSED**。authorization identityとsnapshot seal/content hashをspawn前に再検証した。
- Iteration 1 M3 writer lock/capacity: **PARTIAL**。owner staging→atomic rename、ownerless/stale recovery、physical reservation、active合算、publish binding、close/abortは成立したが、上記malformed owner validationが未閉包。
- Iteration 1 M4 tests反証力: **PARTIAL**。旧主要反例とIteration 2のoutside-proof/ownerless反例は固定したが、parseable-malformed owner反例がない。
- Iteration 1 M5 tsconfig境界: **CLOSED**。既存差分はU1由来で、U3変更ではないことをsummaryへ記録した。
- Iteration 1 m1 / Iteration 2 m1 summary値: **CLOSED**。production 765/1100、focused 77、formal 330へ更新済み。
- Iteration 2 C1 genuine expected-set外proof: **CLOSED**。
- Iteration 2 M1 ownerless lock crash window/recovery: **CLOSED**。
- Iteration 2 M2固定test: **CLOSED**（outside proof / ownerless lock）。新規malformed owner gapは上記Major finding。

### 検証結果

- U3 focused: **77 pass / 0 fail / 125 expects / 7 files**
- `bun run typecheck`: **PASS**
- `bun run lint:check`: **PASS**（advisory warningのみ）
- production物理LOC: **765 / 1100**
- 禁止依存scan: **0件**
- `packages/framework/`、`packages/setup/`、`dist/`、lockfileのtracked境界差分: **0件**
- `git diff --check`: **PASS**

## U3 最終閉包

- `E-FVEU3CGR4A`により、Iteration 4のREADY（Critical 0 / Major 0 / Minor 0、GoA: GO）と全finding CLOSEDを受理した。
- `amadeus-learnings.ts surface --slug code-generation`の結果は、`schema_version=1`、`memory_entries_total=0`、`candidates=[]`、`parked_open_questions=[]`だった。
- `E-FVEU3CGS13`により、§13は追加なし・persistなしで成立した。project / team memoryおよびsensor bindingへの書き込みは行っていない。
- production 783 / 1,100 LOC、focused 78 / 78、formal regression 331 / 331、typecheck / lint / check / dist / sensor PASSを最終証跡として、U3 `execution-evidence`をREADY閉包した。
- identity/envelope改変: **拒否**
- forged proof: **拒否**
- genuine store proof付き期待集合外cell: **拒否**
- non-zero / signal: **HARNESS_ERROR**
- publish reserve: **控除済み**
- snapshot: **再検証・再bind成立**
- ownerless lock: **quarantine後に回復**
- invalid JSON lock / remote-live lock: **fail-closed**
- parseable-malformed local lock: **FAIL（奪取して予約成功）**
- capacity lifecycle: **physical allocation、active合算、unreserved publish拒否、close/abort PASS**

## Iteration 3 是正

E-FVEU3CGR3のrecorded裁定に従い、Iteration 3の残存Major 1件を同一U3境界内で是正した。

- `LockOwner`をexact 5 fieldsとして検証し、host非空、pid正safe integer、process-start identity非空、RFC 4122 v4 UUID nonce、有効なISO UTC createdAtを必須化した。
- parse可能でもschema不正なownerはquarantineせず、既存lockを保持したままfail-closedとする。
- parseable-malformed local ownerに対して予約失敗、lock維持、quarantine未作成を固定integration testで検証した。
- focused 78件、formal全体331件、typecheck / lint / check / dist / sensorを再実行し、production 783 / 1,100 LOCを確認した。
- 独立review Iteration 4の判定前であり、この節だけではREADYを主張しない。

## Review — Iteration 4

**Verdict: READY（Critical 0 / Major 0 / Minor 0、GoA: GO）**

UTC: `2026-07-21T03:55:45Z`

### Finding closure

- Iteration 1 C1 identity/envelope改変read: **CLOSED**。result identity、envelope hash、両ledger coordinates/cross-referenceの再計算により改変を拒否する。
- Iteration 1 C2 forged proof / unknown cell: **CLOSED**。structural forgeryと真正store proof付き期待集合外cellをともに`IncompleteSuiteProof`へ閉じる。
- Iteration 1 C3 non-zero/signal正常化: **CLOSED**。normalizerを呼ばず`HARNESS_ERROR`とする。
- Iteration 1 M1 publish reserve/deadline: **CLOSED**。process timeoutからreserveを控除し、durable parent sync後もdeadlineを再確認する。
- Iteration 1 M2 snapshot binding: **CLOSED**。authorization identityとsnapshot seal/content hashをspawn前に再検証する。
- Iteration 1 M3 writer lock/capacity: **CLOSED**。owner stagingのatomic publish、ownerless/stale recovery、malformed/live fail-closed、physical reservation、active合算、publish binding、close/abortを確認した。
- Iteration 1 M4 tests反証力: **CLOSED**。全主要反例、genuine outside proof、ownerless crash、parseable-malformed ownerを固定testで反証する。
- Iteration 1 M5 tsconfig境界: **CLOSED**。既存差分はU1由来でU3未変更と記録済み。
- Iteration 1 m1 / Iteration 2 m1 summary値: **CLOSED**。production 783/1100、focused 78、formal 331へ更新済み。
- Iteration 2 C1 genuine expected-set外proof: **CLOSED**。
- Iteration 2 M1 ownerless lock crash window/recovery: **CLOSED**。
- Iteration 2 M2 fixed tests: **CLOSED**。
- Iteration 3 M1 LockOwner schema: **CLOSED**。exact 5 fields、host非空、正のsafe pid、process-start identity非空、RFC 4122 v4 nonce、実在するISO UTC instantを必須化し、unexpected/missing fieldも拒否する。

未解決findingはない。

### LockOwner重点probe

- exact 5-field valid stale owner: **quarantineして回復**
- host空、pid=0、unsafe pid、processStartedAt空、非UUID nonce、暦不正createdAt、unexpected field、missing field: **全件reserve失敗・lock維持・quarantine 0**
- valid remote/live owner: **reserve失敗・lock維持・quarantine 0**
- ownerless lock: **quarantineして回復**

### 検証結果

- 独立実行 U3 focused: **78 pass / 0 fail / 146 expects / 7 files**
- 独立実行 `bun run typecheck`: **PASS**
- 独立実行 `bun run lint:check`: **PASS**（advisory warningのみ）
- recorded formal regression: **331 pass / 0 fail / 556 expects / 19 files**
- recorded tier assertions: **unit 226 / integration 75 / E2E 30**
- recorded `bun run check` / `bun run dist:check`: **PASS**
- final linter/type-check sensors: **8/8 PASS**
- production物理LOC: **783 / 1100**
- 禁止依存scan: **0件**
- `packages/framework/`、`packages/setup/`、`dist/`、lockfileのtracked境界差分: **0件**
- `git diff --check`: **PASS**
