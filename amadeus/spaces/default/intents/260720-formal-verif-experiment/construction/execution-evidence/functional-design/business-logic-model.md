# Business Logic Model — execution-evidence

## 上流契約と責務

本Unitは、`unit-of-work.md` のexecution-evidence責務、`unit-of-work-story-map.md` のS-3/S-4/S-6/S-8/S-9、`requirements.md` のFR-4/FR-5/FR-9とNFR-1〜NFR-4、`components.md` のCell Runner / Evidence Store、`component-methods.md` の`CellResult` / `ArmSuiteResult` / Runner methods、`services.md` の`run` / `benchmark` lifecycleを実装可能なarm-neutral処理へ落とす。arm固有oracle、fixture生成、eligibility、Pareto、report表現は所有しない。

処理は次の4境界に分ける。

1. frozen arm adapterをarm-neutral subprocess port経由で1 subjectへ実行する。
2. command、raw stdout/stderr、timing、exit、normalized resultを完全なevidence bundleへ組み立てる。
3. bundleをcontent-addressed append-only storeへatomic publishする。
4. canonical input setと実測bundle indexからcell / suite / matrix completenessを検証する。

## Cell実行とverdict保存

`executeCell`はarm、subject、runNo、suite deadline、frozen arm SHA、baseline SHA、input set hashを検証してから、残り時間を上限としてinjected process portを1回だけ呼ぶ。command argvはarrayのまま記録し、shell文字列へ再結合しない。開始・終了はinjected monotonic clockでdurationを測り、Coordinator UTCも併記する。

process portはexit code、signal、stdout bytes、stderr bytes、開始・終了、tool metadataを返す。adapter normalizerがclosed `CellResult`を生成し、schema parserとcanonical identityを通す。根拠ある反例だけを`DETECTED`、正常な全域完走だけを`NOT_DETECTED`とし、timeout、tool failure、schema不成立、探索不完了はarm実行境界で根拠付き`HARNESS_ERROR`として保存する。store障害やidentity corruptionは実行結果ではないためverdictへ丸めずtyped evidence errorを返す。

runnerは外部から完成済み`CellResult`を受け取るappend APIを公開しない。process invocation後に、runner-owned suite ledgerの次entryはinvocation identity / cell key / bundle ID、Evidence Store ledgerの次entryはbundle ID / payload manifest hash / final envelope hashを持つ。index envelopeはcurrent entry hashを参照せず、expected previous headsとnext sequencesだけをledger coordinatesとして持つため、envelope hashとstore entry hashは循環しない。persist後のreadはbundle内の自己申告値ではなく、envelope hash、両ledgerのprevious-head hash chain、coordinates、cross-referenceを検証して`VerifiedExecutionReceipt`を再構築する。orphan JSON、片方だけのentry、chain branchは手書きcellとして拒否する。

## Atomic evidence publish

bundleはindex envelopeと5 payload `{ result.json, command.json, stdout.bin, stderr.bin, timing.json }` のclosed setである。canonical payload manifestは各logical roleとpayloadのSHA-256 / byte lengthだけを持ち、index envelope自身、配置path、mtime、bundle IDを含まない。bundle IDはこのmanifestへdomain separation `amadeus.formal-verif.evidence.v1`を付けてhashする。index envelopeは確定済みbundle ID、manifest、publishedAt、expected previous heads、next sequencesを格納し、domain separation `amadeus.formal-verif.envelope.v1`付きの別hashで保護する。このfinal envelope hashをstore ledger entryへ記録する。配置pathはbundle IDから導出し、bundle identityと`CellResult` identityを別valueとして両方保持する。

publishは次の順で行う。

1. store root外の同一filesystem staging dirへ全fileを新規作成する。
2. 5 payloadを再読し、manifestのlogical role / hash / length、result identity、runner ledger entry、input set hashを検証する。
3. store root直下の単一writer lockをexclusiveに取得する。lock保持中にexpected runner/store headsを再確認し、target transaction identity pathと共通successor slotが不存在なら、bundleと両ledger entryを含むtransaction directory全体をexclusive atomic renameしてからlockを解放する。head不一致時はrenameせず競合を返す。
4. 同一identityが存在する場合は全bytesを再照合し、一致時だけidempotent successとする。不一致ならcorruption errorとする。
5. publish失敗時はtargetを変更せずstagingだけを破棄する。既存bundleの更新、削除、file単位の上書きを行わない。

## Suiteとmatrix completeness

canonical input setは`HEALTHY_BASELINE`を先頭に、promoted manifestの正準順D-COUNT件を続ける。sample keyはwarmupを`{ kind: WARMUP, runNo: 0 }`、measuredを`{ kind: MEASURED, runNo: 1..5 }`とし衝突させない。`runArmSuite`は同じarm SHA、baseline SHA、runner class、sample key、input set hash、suite deadlineを全cellへ固定し、列順にserial実行する。途中の`HARNESS_ERROR`は期待cellを満たす正式な結果bundleとして保存し、deadlineが残る限り後続subjectを継続する。

suite validatorは、期待cell key列とbundle index列を順序込みで比較する。`HARNESS_ERROR` bundleは存在するcellとして数える。suite deadlineが尽きて後続cellを起動できない場合は、実行済みbundle、missing key、`SUITE_TIMEOUT`、elapsedを持つ`IncompleteSuite`をmintする。duplicate、unknown subject、sample key drift、arm/base/freeze SHA drift、input set hash drift、verified receipt欠損、identity mismatchもtyped incomplete findingにする。durationはsuite開始から最終cell evidenceのatomic publishまたはtimeout確定までであり、個別durationの合計で代用しない。

matrix validatorはpromoted registryのD-COUNT、対象arm、warmup 1件、measured run 5件から期待key集合を生成する。warmupはraw evidenceとして保持するが比較sampleから除外する。全measured suiteの各cell verdict一致、cell数、suite identity、input set hashを検証し、filesystem走査で見つけた未参照bundleや手書きJSONを自動採用しない。結果は`CompleteMatrix(proof)`または`IncompleteMatrix(expectedKeys, verifiedBundles, findings)`のclosed unionである。findingsはHARNESS_ERROR cell、missing、suite timeoutに加えてidentity corruption、ledger chain drift、store failureをdiscriminatorとcause付きで区別して後続Evaluatorへ渡す。U3はeligibilityを決めないが、Evaluatorは全不完全性をfail-closedな失格または実験無効根拠として扱える。

## Failure flowとtest境界

schema、identity、append、matrixの各errorはdiscriminatorと対象identityを保持する。retry可能なのは同一bundleのpublish応答喪失だけで、再照合後に同一成功receiptへ収束する。deadline超過後の再実行は同一runNoを上書きせず新revisionとして扱う。

test doubleで、stdout/stderrのbyte preservation、timeout、non-zero exit、schema欠損、atomic publish failure、同一identity再送、同一identity異bytes、runner/store ledger片側欠損・chain drift、missing/duplicate/handwritten cell、warmup/measured key非衝突、canonical order drift、suite input hash drift、HARNESS_ERROR後続継続、suite timeout finding、warmup除外、measured verdict不一致を検証する。U3はarm adapterやreport rendererをimportせず、B1 skeletonではU4/U5との専用integration harnessからだけ呼ばれる。
