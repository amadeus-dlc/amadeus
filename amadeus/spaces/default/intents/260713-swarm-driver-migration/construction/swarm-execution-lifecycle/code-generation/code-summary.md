# Code Generation Summary: swarm-execution-lifecycle

## 実装結果

U-02 `swarm-execution-lifecycle` を実装した。U-01 の closed driver contract と selector を再利用し、selection、behavior probe、native/floor/legacy 実行結果、normalized evidence、request-bound referee finalize、AIDLC metadata/code merge、cleanup、監査、crash resume を一つの versioned lifecycle に束縛した。

公開 CLI は `resolve`、`run`、`resume`、`record-floor`、`record-legacy`、`record-finalize`、`status` を schema version 1 の JSON で提供する。production registry は Claude、Codex、Kiro の3 provider moduleを静的 importし、4 native driverを exhaustive に登録する。U-02ではprovider固有実装を先取りせず、各native slotは明示的な`unavailable`としてfail-closedにした。

referee finalize は immutable request binding、single-writer claim、fencing token、slug順の再検証、operation ID単位のmerge checkpoint、request/result digest一致を要求する。native側の自己申告だけでは成功せず、全Unitのverified evidence、referee convergence、metadata merge、code merge、cleanup、Unit audit、driver checkpoint materializationが揃った場合だけterminal successとなる。

## 作成・変更したファイル

- 正本のdriver lifecycle
  - `packages/framework/core/tools/amadeus-swarm-canonical.ts`
  - `packages/framework/core/tools/amadeus-swarm-driver-lifecycle.ts`
  - `packages/framework/core/tools/amadeus-swarm-driver-store.ts`
  - `packages/framework/core/tools/amadeus-swarm-driver-runtime.ts`
  - `packages/framework/core/tools/amadeus-swarm-driver.ts`
  - `packages/framework/core/tools/amadeus-swarm-driver-adapters/{claude,codex,kiro}.ts`
- 正本のreferee/process境界
  - `packages/framework/core/tools/amadeus-swarm-finalize-contract.ts`
  - `packages/framework/core/tools/amadeus-swarm-operation-claim.ts`
  - `packages/framework/core/tools/amadeus-swarm-operation-journal.ts`
  - `packages/framework/core/tools/amadeus-swarm-referee-finalize.ts`
  - `packages/framework/core/tools/amadeus-armed-process.ts`
  - `packages/framework/core/tools/amadeus-swarm-driver-supervisor.ts`
- 既存primitiveと監査契約
  - `packages/framework/core/tools/amadeus-swarm.ts`
  - `packages/framework/core/tools/amadeus-bolt.ts`
  - `packages/framework/core/tools/amadeus-worktree.ts`
  - `packages/framework/core/tools/amadeus-audit.ts`
  - `packages/framework/core/knowledge/amadeus-shared/audit-format.md`
  - `docs/reference/12-state-machine.md`
- testとcoverage台帳
  - `tests/unit/t227-swarm-driver-lifecycle.test.ts`
  - `tests/unit/t228-swarm-driver-store.test.ts`
  - `tests/unit/t229-swarm-driver-evidence.pbt.test.ts`
  - `tests/integration/t230-swarm-driver-supervisor.test.ts`
  - `tests/integration/t231-swarm-driver-runtime.test.ts`
  - `tests/e2e/t232-swarm-driver-lifecycle.test.ts`
  - `tests/integration/t233-swarm-driver-boundary.test.ts`
  - `tests/unit/t28-audit-event-sync.test.ts`、`tests/unit/t81.test.ts`、`tests/unit/t111.test.ts`、`tests/unit/gen-coverage-registry.test.ts`
  - `tests/.coverage-registry.json`、`tests/.coverage-ratchet.json`
- 正本から生成・同期した配布物
  - `dist/{claude,codex,kiro,kiro-ide}/`の対応するknowledge/tools
  - `.claude/`、`.codex/`の対応するknowledge/tools

## 主な設計判断

- lifecycleはaudit-firstにした。attempt開始とtransition intentを先に監査へ記録し、その後にatomic checkpointをmaterializeする。途中失敗は同じmutation IDからreconcileし、成功eventやoperationを二重発行しない。
- checkpointはclosed state、semantic digest、lease、heartbeat、fencing tokenを持つ。stale writerはmutationを拒否され、新attemptはprobe前checkpointから再開する。referee確定済みUnitだけを再利用する。
- native evidenceはsourceとUnit-childの完全な全単射、success event、request相関を検証する。canonical digest、unknown field拒否、secret-like field拒否を共通境界で行い、生値を監査へ残さない。
- process起動はidentity materializationを先、one-time armの消費を後に行う。child stdinを閉じ、timeout時は観測済みidentityに対応する正確なprocess groupだけを終了する。Windowsは未検証成功へ読み替えず明示的に拒否する。
- refereeはdriver lifecycleを直接importしない。conductorが`record-finalize(request) → referee finalize → record-finalize(result)`を媒介し、C-01とC-11のdirect dependencyを0件に保つ。
- irreversibleなmetadata/code mergeはrequest-bound claim、fencing、one-time armを必須にした。各operation IDと結果checkpointを固定し、結果永続化直前のcrash後も同じoperation IDで再調停する。
- 監査taxonomyへ`SWARM_DRIVER_ATTEMPTED`、`SWARM_DRIVER_SELECTED`、`SWARM_DRIVER_TRANSITION`、`SWARM_DRIVER_RECONCILED`、`SWARM_NATIVE_EVIDENCE`を追加し、allowlist、state-machine文書、emitter coverageを同期した。
- U-01の`FloorDriver`と`LegacyExecution`をそのまま使用し、floor/legacy literalやselection policyを再実装していない。production adapterはU-03〜U-05へ残した。

## 境界・hotspot確認

1. `amadeus-swarm.ts`にはbound finalizeのCLI glueだけを残した。既存のprivate convergence判定とtool compositionを公開互換CLIが再利用するためであり、ここをさらに抽出すると薄いcallback adapterまたは循環依存になる。statefulなsingle-writer/fencing/progress/result lifecycleは`amadeus-swarm-referee-finalize.ts`へ隔離済みで、`handleBoundFinalize`はCCN 13のwarn band、complexity gateは新規違反0・悪化0である。
2. floor/legacy語彙はU-01の`FloorDriver` / `LegacyExecution`へ統一した。U-02固有の重複literal、support matrix、selection tableは追加していない。
3. 共有境界は意図的に分割した。`amadeus-swarm-canonical.ts`はC-01/C-11双方が使う副作用なしのcanonical JSON/digest、`amadeus-swarm-finalize-contract.ts`はpureなrequest/result検証、`amadeus-swarm-operation-claim.ts`はfilesystemを持つclaim guardである。process armはneutralな`amadeus-armed-process.ts`へ置き、driver/referee間の直接依存を作らない。
4. architecture testはC-01/C-11 direct import 0、3 providerのstatic import、dynamic discovery/network/runtime dependency 0、両merge primitiveのclaim/fencing/arm必須を検証する。filesystemを読むためtest-size purityに従って`t233`をunitからintegrationへ移した。

## テストと検証

| 検証 | 結果 |
|---|---|
| U-02関連7 test (`t227`〜`t233`) | 72 pass、0 fail、368 expects |
| `bun run typecheck` | PASS |
| `bun run lint` | PASS（終了コード0、非blocking warning 196件） |
| `bun tests/complexity-gate.ts --check` | PASS、新規違反0、悪化0、threshold 15 / baseline 43を維持 |
| coverage registry `--check` | PASS、registry fresh、guard green、ratchet維持 |
| `bun run dist:check` | Claude、Codex、Kiro、Kiro IDEの4 harnessすべてPASS |
| `bun run promote:self:check` | Claude、CodexともPASS |
| `bun tests/run-tests.ts --ci --verbose` | 347 files、4,756 assertions、0 fail、wall-clock drift 0 |
| `git diff --check` | PASS |

全CIではAWS credentialとClaude live substrateを要するtestだけがrunner仕様どおりskipされた。deterministicなmacOS/Linux対象testをskipやplatform N/Aで成功扱いにはしていない。

## 計画との差分

- architecture test `t233`はsource fileを読むため、test-size purity gateに従い`tests/unit/`ではなく`tests/integration/`へ配置した。検証内容とscopeは計画どおりである。
- C-01/C-11のprocess arm共有でdirect dependencyを作らないため、計画したsupervisorからneutral helper `amadeus-armed-process.ts`を分離した。supervisorは同helperを再exportし、public seamとfailure-domainの責務は維持した。
- canonical JSON/digest、finalize request/result、stateful operation claimを混在させないため、`amadeus-swarm-canonical.ts`、`amadeus-swarm-finalize-contract.ts`、`amadeus-swarm-operation-claim.ts`へ分けた。いずれもprovider abstractionやplugin seamではなく、C-01/C-11境界を閉じる最小の共有moduleである。
- provider固有CLI、raw event parser、mode/model/trust probe、wave policy、live proof、harness利用者向け切替文書は追加していない。
- 学習候補は0件で、memory/rule/sensorへの追記は行っていない。

## 後続Unitへの引き継ぎ

- U-03〜U-05は各provider slotだけを実adapterへ置き換え、U-02のcheckpoint、evidence、referee、audit、resume契約を変更しない。
- U-06は全providerのlive proof後にharness導線と共有文書を同期する。U-02のplaceholderを成功扱いしない。

## 完了状態

Step 1〜8はすべて完了した。blockerはない。commit、rebase、push、PR作成は親作業へ残した。

## Review — Iteration 1

**Verdict:** NOT-READY

### Blocking findings

1. **[Critical] native evidence verifierが、native実行を証明しないevent列を`VERIFIED`へ昇格する。** `verifyNativeEvidence`が相関しているのはdriver、execution、attempt、nonce、planだけで、`waveIndex`、`waveDigest`、`nativeRunId`を比較しない。またrequired source名とUnit-child全単射は確認するが、`mode-confirmed`、`coordinator-started`、`native-coordination`、`coordinator-stopped`の存在、coordinator ID一致、exit code 0、driverごとのmarker/modeを要求しない。実測では、state eventだけを別wave・別native runへ変え、modeを`wrong-mode`、start/stop coordinator IDを不一致、stopをexit 99、native markerを欠落させたCodex event列が`{ ok: true, code: "VERIFIED" }`になった。これはBR-13〜BR-16と「native自己申告だけでは成功しない」を直接破り、refereeがcodeだけを検証できてもnative surface使用の証明を偽陽性にする。全eventのrun/wave相関、driver別required-kind cardinality、mode/marker、start-stop同一性、exit 0を1つのclosed policyから検証し、各要素の欠落・不一致をnegative PBTへ追加すること。
2. **[Critical] expired finalize claimのtakeoverが旧wrapper/childの停止または未起動を証明せず、stale primitiveが新ownerと並行してmutationできる。** `acquireFinalizeLocked`はclaimが期限切れかつowner PID非生存なら即座にfencing tokenを増やすが、progressにはoperation IDしかなく、planned run、observed PID/PGID/start token、arm状態を保持しない。`executeArmedProcess`もidentityを読んだ直後に内部でarmし、identityをfenced progressへmaterializeするcallbackがない。primitive側の`validateFinalizeOperationClaim`はprocess開始時の1回だけで、BOLT_COMPLETED、state/audit/runtime merge、Git mutation、cleanupの各直前には再検証されない。親停止後も旧childが生きていれば、claim期限後に新ownerが同じoperationを開始できる。planned/observed identityとarm receiptをprogressへaudit-first保存してからarmする二相interfaceへ変更し、takeoverはexact groupのterminate + waitまたはarm未消費とdeadline終了を確認してからだけ許可し、各不可逆substep直前のclaim CASをprimitive自身で必須化すること。
3. **[Critical] operation IDは実primitiveをidempotentにしておらず、checkpoint write failure後の再開がfalse failureまたは二重mutationになる。** `t232`のretry testはfake `codeOperations` mapが同じoperation IDの結果を返すためgreenだが、productionの`amadeus-worktree merge`はoperation IDをstdoutへ載せるだけでresult markerやpostconditionを永続化せず、成功時にworktreeとbranchを削除する。したがってcode merge成功後・`store.update(completed)`失敗後の再実行は、同じoperation IDでもworktree不在から`CODE_MERGE_FAILED`になる。`amadeus-bolt complete --merge`もoperation ID単位で`BOLT_COMPLETED → STATE_MERGED → AUDIT_MERGED → RUNTIME_GRAPH_MERGED`を再調停せず、途中停止後に完了済みsubstepを再発行し得る。さらにreal portの`validateRequest`は再開時もtarget HEADを初期`targetBeforeCommit`へ固定するため、1 Unit完了済みのcanonical prefixすら拒否する。各primitiveにoperation request/result journal、strategy別Git postcondition、substep markerを実装し、real file/Git portで各audit/write/merge/cleanup直後へfailure injectionし、完了済みprefixを再mergeせず再開できることをtestすること。
4. **[Critical] audit-first checkpoint reconciliationとattempt resumeがproduction経路へ配線されていない。** storeは`reconcileBegin`と`reconcileTransition`を公開するが、runtime/CLIからの呼出しは0件である。`resolve`はcheckpoint不存在時の`SWARM_DRIVER_ATTEMPTED` orphanをauditから探索せず、新IDでbeginする。transition audit成功後にcheckpoint writeが失敗しても、次回呼出しは監査行からtransitionを再構築・dedupeせず、probing等の古いcheckpointに留まる。`resume`も`failed-resumable`だけを条件にfencing tokenを増やし、lease expiry、owner PID/start identity、旧wrapper/child停止を検証しない。さらにfile checkpoint readはschema/state digestを再計算せずJSON castを信用する。audit shardからbegin/transition intentをclosed parseして同じlock内で再調停するproduction recovery path、liveness/process recovery port、checkpointのschema/digest検証を追加し、append成功→write失敗、selected event途中、resume直前の旧process生存をfile-backed failure testで固定すること。
5. **[Critical] versioned public JSONとfinalize request bindingがclosedではなく、別Unitをterminal successへ束縛できる。** CLIの`versionedRecord`は`schemaVersion`とsecret-like keyしか見ず、unknown fieldを拒否しない。`canonicalPreparedUnits([{ unit: "alpha" }, { unit: "beta" }])`はworktreePath/branchName欠落でもsuccessとなり、`run`のconvergenceCommand、protectedSpec、evidenceDirは受け取るだけでcheckpoint/finalizeへ束縛されない。`buildFinalizeRequestBinding`も、空のworktree/check/repo/target/message digest、空commit、未知protectedSpec kind、未知merge strategy、extra fieldをすべて含む入力を実測でsuccess化した。`recordFinalizeRequest`はrequest digest、plan digest、manifest digestだけを比較し、bindingのexpected Unit/git bindingがcheckpointのexpected/prepared Unitと同じかを確認しないため、callerが別の2 Unitをbinding/envelopeへ入れて`succeeded`へ進められる。floorだけは`recordFloor`入力にplan digestすらない。各CLI phaseにunknown-field拒否を含むclosed parser/schemaを置き、PreparedUnitの全fieldを検証し、check/protected spec/repo/base/headをrun/checkpointから導出してfinalize requestへ束縛し、expected Unitをcheckpointからcaller設定不能にすること。floor/legacyは同じplan/result bindingを要求し、stored request/progress/resultもread時にdigestを再検証すること。
6. **[High] C-01/C-11のdirect import testはgreenだが、neutral process seamがC-01 lifecycleへ逆依存している。** `amadeus-swarm.ts`と`amadeus-swarm-referee-finalize.ts`からdriver lifecycle/runtimeへの直接importは0件で、conductorのrequest/result transportも形としては維持される。しかしC-11が利用する`amadeus-armed-process.ts`は`rejectSecretLikeFields`を`amadeus-swarm-driver-lifecycle.ts`からruntime importしており、C-11 → armed-process → C-01 lifecycleという推移依存を作る。`t233`はreferee 2ファイルの直接import文字列だけを検査し、この経路を見ない。canonical digestとsecret-field validatorを副作用なしのleaf contractへ移し、driverとrefereeの両方が一方向に参照する構造へ直し、architecture testをimport graphの推移閉包で検証すること。

### Architecture assessment

- U-01のfoundation、selection contract、adapter contract、selectorには未コミット差分がなく、U-02は既存のclosed driver/floor/legacy語彙を再定義していない。production registryはClaude/Codex/Kiroの3 moduleをstatic importし、4 native slotを明示的なunavailableとしてfail-closedにしている。provider固有CLI/parser、plugin discovery、dynamic import、network serviceの先取りもない。
- floor/legacy/nativeはselectionとcheckpointの判別値では分離され、post-dispatch fallbackもない。ただしfinding 5のplan/result binding不足により、floor/legacyのrecord seamはまだ設計どおり閉じていない。
- `amadeus-swarm.ts`の315行増加や`handleBoundFinalize`のCCN 13自体はblocking根拠ではない。既存`verdictFor`、AIDLC merge、worktree mergeをproduction portへ構成する責務にはcaller leverageがある。一方、現在はCLI cast、Git binding、armed spawn、result shapingまで同関数に集まり、要約の「CLI glue」よりinterface上の知識が広い。上記correctness修正時に、公開`finalize` dispatchは薄く保ちつつproduction `BoundFinalizePorts` assemblyを内部moduleへ局所化する余地がある。
- macOS上のreal process/Git E2Eと、`observeProcessIdentity(..., "win32")`の明示拒否はgreenであり、Windows対応を表明していない。Linux code pathは今回のreview環境では実OS実行していないため、Build and Test/CIで実Linux failure injectionを必須にする。platform差より先に、上記OS非依存のstate machine反例を解消する必要がある。

### Validation evidence

- `bun test`のU-02関連`t227`〜`t233`: 52 pass、0 fail、253 expects。
- audit taxonomy / emitter / coverage関連4 test: 143 pass、0 fail、1,299 expects。
- `bun run typecheck`: PASS。対象正本・testのBiome check: PASS。
- `bun tests/complexity-gate.ts --check`: PASS、新規違反0、regression 0。`handleBoundFinalize`はCCN 13のwarn band。
- `bun run dist:check`: Claude / Codex / Kiro / Kiro IDEすべてPASS。`bun run promote:self:check`: Claude / CodexともPASS。
- `git diff --check`: PASS。U-01のfoundation / contract / adapter-contract / selectorの未コミット差分は0件。
- green suiteは上記findingを否定しない。`t229`はinvalid coordinator/wave/run/markerを生成せず、`t228`はreconcile helperを直接呼ぶだけでproduction recoveryを通さず、`t232`はfake operation mapで実primitiveのidempotencyを仮定し、`t233`は必要な識別子の文字列存在だけを検査している。

## Review Revision — Iteration 1

Iteration 1の6件をすべて修正した。threshold、complexity baseline、test-size allowlist、coverage ratchetは緩和していない。

1. **Finding 1 — native evidenceの偽陽性**
   - 修正: normalized eventを`waveIndex`、`waveDigest`、`nativeRunId`へ束縛した。driver別のclosed policyでmode、native marker、event cardinality、coordinator start/stop同一性、exit code 0、Unit-child全単射を要求する。runtimeがwave digestとnative run IDをmintし、全eventへ伝播する。
   - 固定テスト: `t229`で別wave、別native run、誤mode、marker欠落、lifecycle cardinality不一致、coordinator不一致、非0 exitをnegative propertyとして拒否する。結果は6 pass、115 expects。

2. **Finding 2 — unsafe takeoverとsubstep claim不足**
   - 修正: armed process progressを`planned → identity-established → arm-approved → armed → terminal`のdigest-bound stateへ変更した。identityとarm approvalを永続化してからarmし、永続化失敗時はexact PID/PGID/start-token groupを停止してchildを起動しない。期限切れclaimのtakeoverは旧runのexact groupを停止し、exitまたはzombieを確認してからだけfencing tokenを進める。metadata/code primitiveは各不可逆substep直前とjournal write直前にclaim、fencing、operation IDを再検証する。
   - 固定テスト: `t230`でprogress順序とarm approval永続化失敗時のchild未起動を検証する。`t232`で実detached processのstale takeoverを検証する。

3. **Finding 3 — operation IDの見かけ上のidempotency**
   - 修正: digest-bound `amadeus-swarm-operation-journal.ts`を追加した。metadataは`bolt-completed → state-merged → audit-merged → runtime-fragment-merged → result`、codeは`audit-intent → code-landed → worktree-removed → branch-deleted → result`のcanonical prefixとpostcondition digestを記録する。code commitには`Amadeus-Operation` markerを残し、journal write前crashでも既存landed commitを検出して重複mergeせずcleanupから再開する。metadataも監査postconditionから完了prefixを再構築する。
   - 固定テスト: `t232`で実Git commit landed後・journal marker前のcrashを再現し、HEADとcommit数を変えずcleanup/resultまで完了することを検証する。state merge後・journal marker前のmetadata crashもobserved prefixから再開する。

4. **Finding 4 — production recovery未配線**
   - 修正: audit transitionへbatchとdigest検証済みpost imageを保存し、`resolve`の先頭で`reconcilePending(batch)`を実行する。audit-only pre-probe beginはside effect未発生時だけabandonし、audit-only transitionは同じlock内で再適用・dedupeする。file checkpoint readはcastを廃止し、closed schemaとstate digestを再検証する。resumeはlease expiry、owner identity/liveness、post-dispatch orphan recoveryを必須にし、unknown livenessはfail-closedにした。
   - 固定テスト: `t228`でaudit-only begin/transitionの自動再調停とdedupeを検証する。`t231`でactive lease拒否、expired post-dispatch liveness unknown拒否、injected recovery成功後だけのresume、file checkpoint digest tamper拒否を検証する。

5. **Finding 5 — open schemaと不完全なbinding**
   - 修正: CLI、checkpoint、PreparedUnit、run binding、finalize request/envelope、stored request/progress/claim/resultをexact-key parserへ閉じた。run checkpointへUnit別base/head/worktree digest、check command、protected spec、repo identity、target branch/commit、evidence dirを束縛し、finalize requestをcheckpointと照合する。floor/legacyにもplan digestを要求する。operation primitiveが読むclaimもunknown keyを拒否し、`claimDigest`を再計算する。
   - 固定テスト: `t227`でopen bindingと欠落PreparedUnitを拒否し、`t231`でunknown public JSONとforeign Unit finalizeを拒否する。`t232`でprogress、claim、result、operation claimのunknown key/digest tamperを拒否する。

6. **Finding 6 — C-11からC-01への推移依存**
   - 修正: canonical JSON/digestとsecret-like field validatorをneutral leafの`amadeus-swarm-canonical.ts`へ移し、`amadeus-armed-process.ts`からdriver lifecycleへのimportを除去した。
   - 固定テスト: `t233`でdirect importだけでなくC-11のtransitive import closureを走査し、C-01 private moduleへの到達を拒否する。

### Revision検証結果

- `t227`〜`t233`: 72 pass、0 fail、368 expects。
- `bun run typecheck`: PASS。
- `bun tests/complexity-gate.ts --check`: PASS。新規違反0、悪化0、threshold 15 / baseline 43を維持。
- `t-test-size-drift`: 16 pass、0 fail、19 expects。filesystem testをunit allowlistへ追加せずintegrationへ配置。
- coverage registry `--check`: PASS。registry fresh、guard green、ratchet維持。
- `bun run lint:check`: PASS（終了コード0）。
- `bun run dist:check`: 4 harnessすべてPASS。`bun run promote:self:check`: Claude、CodexともPASS。
- `git diff --check`: PASS。
- `bun tests/run-tests.ts --ci --verbose`: 347 files、4,756 assertions、0 fail、wall-clock drift 0。

## Review — Iteration 2

**Verdict:** NOT-READY

### Blocking findings

1. **[Critical] metadata mergeの再開判定がoperation境界を持たず、過去operationの同slug auditを現在operationの完了prefixとして採用する。** `metadataAuditPostcondition()`は`event`と`slug`だけを照合し（`packages/framework/core/tools/amadeus-bolt.ts:196-210`）、`guardedStep()`はそれがtrueならprimitiveを実行せず`{ verified: true }`だけを現在journalへ記録する（同`:465-478`）。`BOLT_COMPLETED`だけはOperation IDをemitするが、`amadeus-state merge`と`amadeus-audit audit-merge`にはoperation IDもfinalize request digestも渡していない（同`:482-537`）。したがって、過去の`STATE_MERGED(alpha)`後に同slugを再forkし、別のfinalize invocationでmetadata mergeを行うと、古い行で`state-merged`が満たされ、main stateの`Bolt Refs`から`alpha`を除去しないままjournal resultまで成功できる。`t232`の「observed state-merge postcondition」testは、current operationへ束縛されていない先行`STATE_MERGED`をそのまま正当化しており、この反例を区別しない。各metadata subtoolへoperation IDとfinalize request digestを渡し、audit/resultをその組に束縛して照合する必要がある。
2. **[Critical] journal済み`code-landed`のpostconditionを現在targetへ再照合せず、別commitを当該operationの結果として採用する。** operation journalはstepのpostcondition本体を保持せずdigestだけを保存し、読出し側へは`operationStepCompleted(): boolean`しか返さない（`packages/framework/core/tools/amadeus-swarm-operation-journal.ts:107-145`）。そのため`amadeus-worktree merge`は`code-landed`済みなら現在HEADを無条件に`commitSha`へ代入する（`packages/framework/core/tools/amadeus-worktree.ts:452-456`）。operation commit Aをjournalへ記録した後、targetが外部commit Bへ進んだ反例では、再開がBを`commit_sha`として返し、cleanup/resultを成功させる。`t232`はjournal marker前のAを再発見する経路だけを検証し、journal marker後のHEAD driftを検証していない。typedなstep evidenceとしてAを復元可能にし、未完了canonical prefixの現在targetがAと一致しなければfail-closedにする必要がある。
3. **[Critical] stale claimantを停止してfencing tokenを進めても、同じoperationを再armできない。** armed wrapperはarmを`${armPath}.consumed`へrenameする（`packages/framework/core/tools/amadeus-armed-process.ts:325-346`）。親がその後に停止すると、takeoverはexact process groupを停止・waitするだけでrun filesを片付けず（`packages/framework/core/tools/amadeus-swarm-referee-finalize.ts:429-459`）、次ownerもoperation IDをそのまま`runId`に使う（`packages/framework/core/tools/amadeus-swarm.ts:667-691`）。新ownerの`armRun()`は新しい`armPath`を書けるが、wrapperの`consumeArm()`は残存`.consumed`を見て`ARM_ALREADY_CONSUMED`となる。`t232`のtakeover testはfencing token 2のacquireと旧process停止で終了し、新ownerによる同operationのprimitive/journal完了まで実行しない。exact termination後に旧run epochを安全にretireするか、stable operation IDとは別にfencing tokenへ束縛した新run epoch/pathをmintする必要がある。
4. **[Critical] audit-only transitionの自動reconciliationがproductionの`resume`/`status`経路にない。** `reconcilePending(batch)`は`resolve`先頭だけで呼ばれる（`packages/framework/core/tools/amadeus-swarm-driver-runtime.ts:463-469`）。`resume`はcheckpointを直接readし（同`:823-831`）、CLIはさらに`coordinator.status()`で`failed-resumable`を確認してから`resume`へ進む（`packages/framework/core/tools/amadeus-swarm-driver.ts:359-378`）。そのため`SWARM_DRIVER_TRANSITION(attempt-failed)`のappend成功後・checkpoint write前に停止すると、auditのpost imageは`failed-resumable`でもfile checkpointは`probing`のままで、production `resume`は`CHECKPOINT_STATE_INVALID`を返す。同じfile/auditへ`reconcilePending()`を直接適用すれば`reapplied`になるため、情報不足ではなくentrypoint配線の欠落である。`t228`はstore helperを直接呼ぶだけでproduction CLIを通らない。少なくとも`status`/`resume`のread-before-decisionを同じlock内のreconciliationへ統合する必要がある。
5. **[High] bound finalize invocation JSONだけがexact schemaになっていない。** `handleBoundFinalize()`はbinding/invocationを`JSON.parse(... as ...)`でcastし（`packages/framework/core/tools/amadeus-swarm.ts:635-650`）、`validatedBinding()`はinvocationのversion、ID、2 digestだけを比較する（`packages/framework/core/tools/amadeus-swarm-referee-finalize.ts:668-678`）。exact-key、non-empty string、secret-like fieldの検証がないため、正しい4 fieldへ`providerToken`等の未知fieldを足したinvocationも通過する。`t231`のunknown-field testはswarm-driver CLIだけを対象とし、`t232`のinvocation drift testもextra fieldを扱わない。neutral leafにclosed `BoundFinalizeInvocation` parserを置き、file読出し直後に検証する必要がある。

### Architecture assessment

- Iteration 1 finding 1のevidence相関は成立した。全eventをdriver/execution/attempt/nonce/plan/wave/native runへ束縛し、driver別mode/marker、lifecycle cardinality、coordinator同一性、exit 0、Unit-child全単射を要求している。`t229`のnegative propertyも旧反例を閉じている。
- Iteration 1 finding 2はidentity-first/arm-approvedの永続化順序とexact process停止までは改善したが、finding 3の再arm不能によりowner交代後の完遂は成立しない。finding 3のjournal自体はoperation/request digestへ束縛されたが、findings 1・2のとおり外部postconditionとの再結合が閉じていない。finding 4はcheckpoint closed parse、owner identity、liveness fail-closedを追加したが、production resume前のreconciliationが未配線である。finding 5はswarm-driver CLI、PreparedUnit、run/finalize binding、stored checkpoint/progress/claim/resultでは成立したが、bound finalize invocationだけが残る。finding 6のC-11からC-01 private moduleへの推移依存は解消済みである。
- `operationStepCompleted()`がtyped evidenceをbooleanへ潰すinterfaceは、callerが必要とする「どのpostconditionが完了したか」を隠しており、現在の誤採用2件の共通原因である。新しい汎用layerを足すのではなく、既存journal APIをstep種別ごとのclosed evidenceと再検証へ置き換えるのが最小である。
- U-01のfoundation、driver contract、adapter contract、selectorの未コミット差分は0件である。production registryはClaude/Codex/Kiroの3 static moduleと4 unavailable native slotのままで、provider実装、dynamic discovery、network dependencyの先取りはない。U-02 scope外への拡張は確認していない。
- complexity gateは新規違反0・regression 0で、分散や巨大化自体をblockerとはしない。correctness修正は`amadeus-bolt.ts`、`amadeus-worktree.ts`、armed takeover、resume入口、invocation parserの既存seamへ局所化できる。

### Validation evidence

- 既存`t227`〜`t233`: 72 pass、0 fail、368 expects。
- `bun run typecheck`: PASS。
- `bun tests/complexity-gate.ts --check`: PASS。新規違反0、regression 0、threshold 15 / baseline 43を維持。
- `bun run dist:check`: Claude / Codex / Kiro / Kiro IDEの4 harnessすべてPASS。`bun run promote:self:check`: Claude / CodexともPASS。
- green suiteは上記blockerを否定しない。`t232`はmetadataの先行auditをoperation-bound eventと区別せず、`code-landed`後のtarget driftを作らず、takeover後の新owner実行へ進まない。`t228`はreconciliation helperを直接呼び、`t231`のunknown-field testはbound finalize invocationを通らない。

### READYに必要な条件

1. metadataの全substep/resultをoperation IDとfinalize request digestへ束縛し、別operationの同slug auditを拒否するreal-file regression testを追加する。
2. journal済み`code-landed`を保存commitへ再照合し、target driftを拒否するreal-Git regression testを追加する。
3. stale takeover後に同じoperation IDを新run epochで再armし、primitive/journal resultまで完遂するreal-process regression testを追加する。
4. audit-only begin/transitionをproduction `status`/`resume`のdecision前に自動reconcileするfile-backed regression testを追加する。
5. bound finalize invocationをexact-key/secret-free parserへ通し、unknown field、欠落、型違いを拒否するnegative testを追加する。

## Stage Completion Verification Fixes

Iteration 2で指摘された5件をtest-firstで修正した。併せて、operation journalのstep語彙、順序、evidenceをkind別のclosed contractへ変更した。threshold、complexity baseline、test-size allowlist、coverage ratchetは緩和していない。

1. **Metadata mergeをoperation/requestへ束縛**
   - `BOLT_COMPLETED`、`STATE_MERGED`、`AUDIT_MERGED`、runtime fragment mergeの各substepとresultへoperation IDとfinalize request digestを伝播した。
   - audit postconditionはevent/Unitだけでなく、この2識別子の完全一致を要求する。過去operationの同一Unit auditは現在operationの完了prefixとして採用しない。
   - real-file regressionでは、過去operation/requestの`STATE_MERGED`を事前配置しても現在mergeを省略せず、重複状態を検出してfail-closedとなることを固定した。

2. **Journal済みcode commitを現在HEADへ再照合**
   - `code-landed`のtyped evidenceから保存commit SHAを復元し、cached result返却前とresume前に現在target HEADとの一致を必須化した。
   - operation commit Aのjournal完了後に外部commit Bを追加するreal-Git regressionを追加し、同operationの再実行がBを結果として採用せずfail-closedとなることを固定した。

3. **Takeover後の同一operation再arm**
   - stable operation IDとarmed-process run epochを分離し、run IDをoperation IDとfencing tokenの組へ束縛した。旧epochの`.consumed`は新ownerの再armを妨げない。
   - real-process/CLI regressionでは、旧stable operation dirに`.consumed`を残し、expired token 1のclaim/progressを事前配置した。token 2でtakeover後、同一operationの新epochをarmし、2 Unitのmetadata/code merge、journal result、terminal claimまで完遂することを確認した。

4. **Production status/resume前のaudit reconciliation**
   - storeへlock内でreconciliationとcheckpoint readを一体化する`readReconciled`を追加し、coordinatorのresolve/status/resumeから利用するようにした。
   - audit append成功後・checkpoint write失敗のfile-backed regressionを追加した。statusはaudit-only `probing → failed-resumable`を同一readで復元し、resumeはeligibility判定前に復元して新fencing tokenの`probing`へ進む。

5. **Bound finalize invocationをclosed parse**
   - neutral finalize contractへexact-key、schema version、non-empty string、secret-like field拒否を行うparserを追加し、CLIのfile読出し直後とclaim取得前の両方で検証する。
   - unknown field、secret-like field、欠落、型違いを拒否し、invalid invocationが`REFEREE_CLAIM_ACTIVE`へ到達しないnegative testを追加した。

6. **Operation journalのkind別closed evidence**
   - metadataのstep語彙を`bolt-completed → state-merged → audit-merged → runtime-fragment-merged`、codeのstep語彙を`audit-intent → code-landed → worktree-removed → branch-deleted`へ閉じ、canonical prefix以外の順序を拒否する。
   - boolean-only APIを廃止し、stepごとのexact-key evidenceとevidence digestを保存・再検証する。metadataはoperation/request相関、codeはaudit timestamp、commit SHA、absence postconditionをtyped evidenceとして扱う。
   - unknown step、順序違反、evidence shape/digest改ざん、kind不一致を拒否するdirect regressionを追加した。

### REDからGREENへの確認

- invocationのextra/secret-bearing入力がclaim取得まで進むREDを再現し、closed parser導入後はbinding validationで拒否した。
- journalの未知step、非canonical順序、不正evidenceが受理されるREDを再現し、kind別contract導入後はすべて拒否した。
- 過去operationのmetadata auditを現在operationが誤採用するREDをreal fileで再現し、operation/request相関導入後は拒否した。
- journal済みcommit Aの後にHEADをBへ進めるREDをreal Gitで再現し、HEAD再照合導入後は拒否した。
- stale takeover後に残存`.consumed`で再armできないREDをreal CLIで再現し、fencing-token epoch導入後はjournal resultまで完遂した。
- audit-only failureがstatus/resumeから見えないREDをfile-backed portで再現し、decision前reconciliation導入後は復元・resumeした。

### 最終検証結果

- `t227`〜`t233`: 78 pass、0 fail、391 expects。
- `bun run typecheck`: PASS。
- `bun run lint:check`: PASS（終了コード0）。
- `bun tests/complexity-gate.ts --check`: PASS。新規違反0、regression 0、threshold 15 / baseline 43を維持。
- `bun test tests/unit/t-test-size-drift.test.ts`: 16 pass、0 fail、19 expects。
- coverage registry / project gate: PASS。registry fresh、guard green、current 62.3331% / baseline 40.9395%、ratchet維持。
- `bun run dist`、`bun run promote:self`、`bun run dist:check`、`bun run promote:self:check`: PASS。
- `bun tests/run-tests.ts --ci --verbose`: 347 files、4,759 assertions、0 fail、wall-clock drift 0。
