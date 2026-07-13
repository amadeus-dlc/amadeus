# Swarm Execution Lifecycle NFR Requirements Questions

## 判定

`business-logic-model.md`と`business-rules.md`は、attempt lifecycle、audit-first遷移、identity-first/one-time-arm supervisor、lease/fencing、referee finalize、crash reconciliationを測定可能な規則まで確定している。共通`requirements.md`はfalse success、二重成功event、secret漏えいを0件にし、実行時間とtoken消費の数値SLOを設定しない。brownfield `technology-stack.md`もBun/TypeScript/Gitと既存test runnerの維持を確定している。追加の製品判断は不要である。

## 確定済み回答

### Q1. provider実行時間のlatency SLOを置くか

[Answer]: 置かない。provider、Unit成果物、referee check commandの所要時間は外部要因を含む。U-02の性能は、probe回数、状態遷移・監査・spawn・merge primitiveの上限、Unit/event数に対する計算量、lockをprocess wait中に保持しないこととして測定する。

### Q2. crash recoveryのRTO/RPOをどう表すか

[Answer]: wall-clock RTOは設定しない。再開は次の明示的なresume呼出しで開始し、owner非生存、旧process group停止、binding一致を証明するまで待機する。RPOはmaterialized checkpoint、audit intent、referee request/progress/resultに記録された確定済みsubstepを失わないこと、未確定substepを成功へ推測しないこととする。

### Q3. 同時実行capacityをどう制御するか

[Answer]: batchごとのactive attemptは1件、finalize claim ownerは1件、不可逆primitiveのarmed childは1 operationにつき1件とする。Unit並列度やprovider wave分割は各native driverが所有し、U-02はmanifest/evidenceの全単射とclosed lifecycleだけを処理する。

### Q4. credentialとprovider出力をどこまで保持するか

[Answer]: credential、prompt、生stdout/stderr、生provider response、command全文、生hostnameは保持しない。adapterがallowlist化した`NormalizedDriverEvent`、hash化identity、closed error/count/digestだけをcheckpoint、audit、fixtureへ渡す。child環境はadapterが宣言する必要最小限の既存keyだけを投影する。

### Q5. availability SLA、backup、multi-regionを要求するか

[Answer]: U-02はlocal CLI lifecycleでservice/databaseを持たないためN/Aである。信頼性はfalse success 0、同じtransition/event/operationの不可逆副作用重複0、stale writer mutation 0、全failure injectionのclosed resultで定義する。

### Q6. Unit数とevent数の増加をどう扱うか

[Answer]: 既存swarmの許容範囲を維持する。canonical sortを要するcollectionは`O(n log n)`以下、それ以外のvalidation/reconciliationは`O(n + e)`、追加memoryは`O(n + e)`以下とする。drop、sample、unbounded cache、queue、daemonは導入しない。

### Q7. platformとtest gateは何を必須にするか

[Answer]: 決定的unit/integration/property/failure-injectionをmacOSとGitHub Actions Linuxで通す。Windowsは保証対象外で、liveness成功を推測しない。fake adapterはU-02 lifecycle検証だけに使い、4 production native driverのlive proofの代替にしない。

## 曖昧性分析

- 「高速」「高可用」といった曖昧な目標は採用せず、call count、計算量、false success/重複副作用件数で測定する。
- lease 30秒、heartbeat 5秒は上流のprotocol定数であり、provider runtimeのlatency SLOではない。
- U-02はdriver固有wave/concurrency、provider raw parsing、referee merge mechanicsを所有しないため、それらのcapacity目標を重複定義しない。
- secret保護と監査可能性は、raw payload非保存とredacted correlation digestを併用するため矛盾しない。
