# Swarm Execution Lifecycle NFR Design Questions

## 判定

`performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`は、U-02をlocal single-writer lifecycleへ閉じ、audit-first、identity-first/one-time-arm、lease/fencing、exact binding、crash reconciliation、referee-authoritative successを確定している。追加の製品判断は不要である。

## 確定済み回答

### Q1. 永続化と排他を新しいdatabaseやlock serviceへ移すか

[Answer]: 移さない。既存`withAuditLock`、append-only audit、atomic file replaceを再利用し、critical sectionをcheckpoint再読、CAS、audit append、atomic writeだけへ限定する。process、probe、check、mergeのwait中はlockを保持しない。

### Q2. providerとmerge primitiveを直接spawnするか

[Answer]: 直接spawnしない。短命wrapperが専用process group identityをatomic保存し、coordinatorが実identityをdurable checkpoint/progressへ記録した後のone-time armだけで子processを起動する。identity未出現時は未起動を推測せず、arm不在とwrapper終了を実測する。

### Q3. resumeで何を再利用するか

[Answer]: selection inputと、refereeが確定済みと再検証したUnitだけを再利用する。旧provider session、未完了child、probe、selection、plan digest、自己申告は再利用しない。新attemptは新nonce、新lease、fencing token+1でprobe前から始める。

### Q4. finalizeのsingle-writerをどう保証するか

[Answer]: `FinalizeRequestBinding`をattempt-local request recordへcreate-if-absentで保存し、`FinalizeClaim`をCAS取得する。各不可逆substep直前にinvocation/request digest、owner identity、lease、fencing tokenを再検証し、stale processのaudit/state/git mutationを0件にする。

### Q5. retry、circuit breaker、queueを導入するか

[Answer]: 導入しない。remote shared serviceがなく、無条件retryは二重実行を招く。回復はtransition ID、operation ID、digest、marker、postconditionに基づくbounded reconciliationだけとし、unknown stateはfail-closedにする。

### Q6. Unit数やevent数の増加をどう扱うか

[Answer]: canonical indexとsortで`O(n log n)`、native event検証を`O(n+e)`主体、active memoryを`O(n+e+t+p)`へ制限する。driverのwave/concurrencyをcoordinatorが再分割せず、referee mergeはslug順serialのままにする。

### Q7. raw provider dataやcredentialをどこまで保存するか

[Answer]: 保存しない。driver adapterが生streamをclosed `NormalizedDriverEvent`へ逐次変換し、共通checkpoint/audit/referee recordはversioned allowlistだけを受ける。child envもadapter宣言keyだけを投影する。

### Q8. AWS/infrastructure componentを追加するか

[Answer]: 追加しない。U-02は既存Bun process、filesystem、Git、audit primitive上のlocal lifecycleであり、service、database、queue、KMS、IAM、monitoring resourceを新設しない。Infrastructure Designへ渡すprovisioning対象は0件である。

## 曖昧性分析

- 固定30秒leaseと5秒heartbeatはfencing/liveness期限であり、provider処理時間のSLOではない。
- audit-firstはaudit appendだけで成功を意味せず、checkpoint materializationまたはreconciliation完了までCLI successを返さない。
- `FinalizeClaim`はdistributed lockではなく、同一local invocationのsingle-writer/fencing recordである。
- U-02はdriver固有parser、wave、model指定を所有せず、U-03〜U-05のclosed adapter contractを実行する。
- U-02はconvergenceやmerge mechanicsを再実装せず、既存referee、Bolt、worktree primitiveのclosed resultを束縛・記録する。
