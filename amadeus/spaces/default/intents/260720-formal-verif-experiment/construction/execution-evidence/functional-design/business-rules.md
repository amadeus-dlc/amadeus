# Business Rules — execution-evidence

## Traceability

以下は`unit-of-work.md` のU3完成条件、`unit-of-work-story-map.md` のS-3/S-4/S-6/S-8/S-9、`requirements.md` のFR-4/FR-5/FR-9・NFR-1〜NFR-4、`components.md` のRunner / Evidence ownership、`component-methods.md` のevidence methods、`services.md` のnon-interactive lifecycleを具体化する。

| Rule | Requirement / scenario |
| --- | --- |
| BR-01〜06 | FR-4、NFR-1、S-3/S-4 |
| BR-07〜12 | FR-5、NFR-2/NFR-3、S-8/S-9 |
| BR-13〜19 | FR-5/FR-9、NFR-1/NFR-2、S-6/S-8 |
| BR-20〜23 | Unit境界、NFR-4 |

## Cell execution規則

- **BR-01 Frozen input:** freeze SHA、baseline SHA、arm、subject、runNo、input set hashがclosed schemaを満たす前にprocessを起動しない。
- **BR-02 Arm-neutral invocation:** runnerはargv arrayと明示cwd/env allowlistをprocess portへ渡し、shell補間やarm固有oracleを持たない。
- **BR-03 Raw preservation:** stdout/stderrはdecodeや改行正規化をせずraw bytesとSHA-256を保存する。表示用decodeは後続責務とする。
- **BR-04 Verdict boundary:** 根拠あるcounterexampleだけを`DETECTED`、正常な完全探索だけを`NOT_DETECTED`とする。timeout、tool/schema failure、探索不完了はevidence付き`HARNESS_ERROR`とする。
- **BR-05 Infrastructure separation:** evidence store / hash / filesystem failureを`HARNESS_ERROR` verdictへ変換しない。typed store errorとしてcommandを失敗させる。
- **BR-06 Runner receipt:** runner-owned suite ledgerとstore append ledgerのhash chainが同じinvocation / cell key / bundle IDをcross-referenceする場合だけ、persist後のverified receiptを再構築する。bundle内の自己申告receiptだけを信用しない。

## Append-only evidence規則

- **BR-07 Complete bundle:** index envelopeとresult、command、stdout、stderr、timingの5 payloadが揃わないbundleを公開しない。identity対象は5 payloadのlogical role / hash / lengthだけとする。
- **BR-08 Content identity:** bundle IDはindex自身、bundle ID、配置path、mtimeを除外したcanonical payload manifestとdomain separationから生成する。
- **BR-09 Atomic publish:** 全fileとrunner/store両ledgerのnext-entryをstagingで再検証する。store単一writer lock保持中にexpected headsを再確認し、共通successor slotへのtransaction directory全体のexclusive atomic renameを完了してから解放する。bundleまたはledger片側だけの部分appendとchain分岐を禁止する。
- **BR-10 No overwrite:** 公開済みbundleの更新・削除・並べ替えを禁止する。同一ID・同一bytesの再送だけを再照合後のidempotent successとし、同一ID・異bytesはcorruptionとする。
- **BR-11 Relative containment:** evidence pathはrecord内の所定rootからの相対pathだけを許し、絶対path、`..`、symlink escape、NULを拒否する。
- **BR-12 Trace safety:** bundle indexはsource artifact referenceとscan receiptを保持するが、sealed fixture本文、secret、個人データ、外部選挙store内容を複製しない。

## Suite / matrix規則

- **BR-13 Canonical subjects:** input列は`HEALTHY_BASELINE`を先頭に、promoted manifestの正準順D-COUNT件を続ける。runner側で再sortしない。
- **BR-14 Serial equality:** 1 suiteは同じarm / freeze / baseline / runner class / sample key / input set hashでsubject列をserial実行する。warmupは`WARMUP/0`、measuredは`MEASURED/1..5`の非衝突keyとする。
- **BR-15 Suite duration:** suite開始から最終cell bundle publish完了までをmonotonic clockで測る。cell duration合計やcommit時刻で代用しない。
- **BR-16 Exact keys:** expected keyごとにrunner/store両ledgerで検証済みのexactly one cellを要求し、missing、duplicate、unknown、handwritten cellをtyped incomplete findingにする。`HARNESS_ERROR` bundleは存在cellとして数える。
- **BR-17 No drift:** cell間のarm SHA、baseline SHA、runNo、input set hash、runner class driftを1件でも許さない。
- **BR-18 Warmup separation:** warmup 1件は保存・検証するが、5 measured suiteのmedianと比較sampleへ含めない。
- **BR-19 Repeat agreement:** measured 5 runsの対応cell verdictが一致しないmatrixをcompleteとしない。奇数5件のduration中央値はsort後index 2とする。matrix validatorはcomplete proofまたはHARNESS_ERROR / timeout / missing / identity corruption / chain drift / store failureをdiscriminatorとcause付きで区別したincomplete resultを返し、後続のfail-closed分類を可能にする。

## Boundary規則

- **BR-20 No oracle:** U3はTLA/TSの検出条件、fixture期待failure、eligibility、Pareto、winnerを実装しない。
- **BR-21 No implicit discovery:** store directoryに存在するだけのbundleをmatrixへ採用せず、suite indexから参照され検証済みのbundleだけを使う。
- **BR-22 Error preservation:** schema / process / store / completeness errorのdiscriminator、identity、causeを保持し、silent fallbackしない。
- **BR-23 No chained command:** cell / suite / matrix検証後にevaluateやreportを自動実行しない。

## Negative scenarios

schema欠損、unknown field、raw stream hash drift、index自己参照、部分bundle、publish途中失敗、同一ID異bytes、absolute / traversal / symlink path、runner/store ledger片側欠損、missing / duplicate / handwritten cell、unknown subject、input hash / runner class / freeze SHA drift、warmup/measured key衝突、HARNESS_ERROR後続停止、suite timeout分類、warmup混入、measured verdict不一致、store failureのverdict誤変換をred fixtureとして固定する。
