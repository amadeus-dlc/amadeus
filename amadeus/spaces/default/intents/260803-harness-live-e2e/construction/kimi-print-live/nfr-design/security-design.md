# Security Design — kimi-print-live

## 上流契約と境界

本設計は`business-logic-model.md:7-17`を入力とし、既存Kimi print driverをrun-owned child processとしてC4 lifecycleへ接続する。NFR Requirementsはscope上skipされたため、存在しないsecurity requirementsやtech-stack decisionsは補作せず、機能設計のclosed contractだけを具体化する。

CI hard denyとstrict opt-inを最初に評価し、deny時はphase evidence、probe、credential、scratch、spawnを0回にする（`business-logic-model.md:7`）。許可後もPhase 1 closureとmodel ID検証が成功するまでcredential leaseやfilesystem mutationを開始しない（同:8-9）。model IDは同:9のgrammarでbrand化し、`KimiConfigDocument`からTOML serializerで全体を生成する。raw文字列置換、任意fragment、unknown keyは受理しない（同:12,39）。

## Credential・filesystem controls

- C5は`CredentialSourcePort`へleaseを要求するが、受け取るのは`CredentialLeaseId`だけである。source home、source path、secret bytes、lease locatorの実体はC4の`CredentialLeaseBroker`だけが所有する。brokerはrun nonceに束縛した0700のlease viewへ存在する`credentials`/`oauth`だけをmaterializeし、各entryを0600または0700にする。scratch側symlinkはこのlease viewだけを指し、source homeを指さない。
- brokerはmaterialize時にregular fileを最大128個、各1,048,576 bytes、合計4,194,304 bytesまで読む。JSON/TOMLは受理schemaを`credentials|oauth`配下のclosed key集合（`access_token`,`refresh_token`,`id_token`,`client_secret`,`api_key`,`token`,`secret`、大小文字非依存）へ固定し、その値だけをsecret-bearing fieldとして抽出する。provider、status、type、version、expiry等のmetadata scalarはpatternへ登録しない。未知key、secret-bearing fieldの非文字列値、secret-bearing fieldが0件のstructured fileはcredential preflight不成立としてspawn前に停止する。schemaを持たないUTF-8 fileは改行またはNULで区切るopaque-secret形式として扱い、全非空recordを登録する。各secretはoriginal UTF-8 bytesとJSON-unescaped bytesを重複排除し、8 bytes未満は受理せずpreflight failureにする。空値、非UTF-8、上限超過、構文不正も同様に停止する。matcherはstdout/stderr双方・chunk境界・複数一致を扱う。source homeに加え、brokerが確定したlease viewの正規化絶対pathとscratch symlinkのreadlink targetをpatternへ登録してからsymlinkを公開する。automatonはC4内だけに保持し、cleanup時にzeroizeする。
- C5は`CredentialViewSpec{runNonce, leaseId, names}`を返す。C4はsymlinkを作る前に`ResourceRegistrar`へplanned登録し、作成直後にcreatedへ遷移する。childへ渡すのはscratch `KIMI_CODE_HOME`だけで、lease ID/locator、source path、secretをargv/env/output/result/ledgerへ含めない（`business-logic-model.md:13-14`）。
- configはmode 0600でatomic writeし、managed provider/model以外を含めない。child envは`PATH`,`HOME`,`TMPDIR`,`KIMI_CODE_HOME`,`LANG`,`LC_ALL`,`NO_COLOR`のexact allow-listとし、ambient env spreadを拒否する（同:12-14）。
- cleanupは全経路でsymlink→config→lease view/lease→scratchの順に試行する。各削除失敗後も残りを続け、credential/config残存、source pointer露出、scratch漏れのいずれかを検出したらgreenを禁止する。debug保持は非秘密のproject evidenceだけを対象とし、credential/configは常に破棄する（同:17）。

## Process・output・deadline controls

C4はKimi childをrun-owned supervisorの新規process groupへ直接spawnする。receiptはrun nonce、supervisor PID/start identity、PGID、child PID/start identityを保持する。180秒でabortし、SIGTERM 10秒、SIGKILL 10秒を同じ検証済みgroupへ送り、groupが`ESRCH`になるまで確認してからsupervisorをreapする。supervisorを先にreapせずPID/PGID再利用を防ぐ。retryは0回、外側test timeoutは240秒とする（`business-logic-model.md:16`）。

stdoutは1,048,576 bytes、stderrは262,144 bytes、combinedは1,310,720 bytesをraw byte計測の上限とする。collectorは両streamを常時drainしながらincremental SHA-256とcase-insensitive ASCII matcherで`no active`をchunk境界越しに検出し、raw本文をreceipt/logへ保存しない。最初の超過で`FAIL:EXECUTION_FAILED/output-limit-exceeded`を固定し、group停止中もdigest/countだけを続けるdiscard-drainへ移る。lease-owned `SecretLeakMatcher`は上記の全credential scalar/recordとsource pathをstreaming照合し、一致時は`FAIL:ASSERTION_FAILED/secret-leak`としてgreenを禁止する。receiptへは`leakMatched`だけを出し、pattern、offset、matched bytesは出さない。

## Evidence commit

exit 0、timeoutなし、`no active`検出、`amadeus/spaces/default/intents`不存在、全resource cleanup、leak 0が揃った場合だけC7へPASS候補を返す（`business-logic-model.md:15,43-53`）。U06は既存C8のatomic receipt appendと、その後のC9 registry/ledger由来matrix再生成だけを呼び出し、transaction、generation、crash recoveryを再定義・所有しない。C8 appendまたはC9 projectionの失敗は既存共通contractのtyped failureをそのまま返し、U06 greenには数えない。

## Verification

U02の`kimi-print-contract`で、GHA/implicit opt-in、Phase closure bypass、model injection、ambient env、source pointer、未登録symlink、JSON scalar token・TOML scalar token・opaque recordの単独/分割chunk漏洩、複数secret、credential上限超過、stdout/stderr/combined上限の直前・一致・1 byte超過、TERM無視、cleanup failure、既存C8/C9 failureをmutant redにする（`business-logic-model.md:55-62`）。HTTP retry、cache、database、AWS scalingはこの単発CLI journeyに非適用である。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T16:06:28Z
- **Iteration:** 1
- **Scope decision:** none

credential・process・outputの主要安全境界は具体化されているが、U06所有外のevidence transactionを再定義しており、secret漏洩検出契約もcredential形式に対して閉じていない。

### Findings

- BLOCKER | LC-KP-11がU06の所有境界を越えて共通C7/C8/C9契約を再定義している | business-logic-model.mdはU06を既存C1〜C4/C7〜C9へ接続するC5/C6 sliceとし、終了処理をC8へのatomic receipt append後のC9 projectionとしている。一方security-design.mdとlogical-components.mdはregistry・ledger・matrixを同一generationでstagingしmarkerをcommitする新しいEvidenceGenerationCommitterをC8/C9境界へ追加する。このmulti-artifact transactionのinterface、既存appendとの順序、crash recovery、所有Unitが上流機能設計に存在せず、U06実装だけでは成立しない。
- BLOCKER | SecretLeakMatcherが部分credential漏洩を検出できるclosed contractになっていない | CredentialLeaseBrokerはcredentials/oauth entryをopaqueにmaterializeする一方、SecretLeakMatcherへ渡すpatternの抽出規則、credential schema、最小長、chunk境界、複数secret、encodingを定義していない。実装がcredential file全体だけをpatternにすれば、OAuth token値のみがstdoutへ出る再現ケースでleakMatched=falseとなり、security-design.mdが要求するsecret leak時のgreen禁止を満たせない。

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T16:08:52Z
- **Iteration:** 2
- **Scope decision:** none

Iteration 1の2 BLOCKERは解消されたが、追加したcredential pattern契約がrun-private lease locatorを保護せず、非秘密scalarまで無条件にsecret扱いするため、安全性と必須live greenの両立が閉じていない。

### Findings

- BLOCKER | run-private lease locatorが漏洩検出対象から欠落している | security-design.mdはlease ID/locatorをoutputへ含めないと明示するが、SecretLeakMatcherへ登録するのはcredential scalar/recordとsource home絶対pathだけで、brokerが生成するlease viewの絶対pathやscratch symlink targetを登録していない。childがreadlink結果またはfilesystem errorとしてlease locatorをstdout/stderrへ出す再現ケースではleakMatched=falseとなり、明示された非露出契約に違反する。
- BLOCKER | 全scalar stringを短さに関係なくsecret扱いするためmust-greenが入力依存で達成不能になる | JSON/TOMLの全scalar stringを意味分類せずpattern登録し、短い値も省略しない契約では、provider名、状態、versionなど非秘密metadataと通常outputの偶然一致もsecret leakになる。credential entryにstatus:active等があり、正常status outputに同じ語が含まれるケースを作ると、実際のsecret漏洩なしで必ずassertion failureとなる。U06は実live green必須であり、accepted credential形式に対するsecret-bearing field/opaque recordの分類がない現設計では実装可能性を満たさない。
