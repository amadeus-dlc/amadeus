# Business Rules — repository-adoption

## 適用範囲と上流トレーサビリティ

本規則は `unit-of-work.md` の U4、`unit-of-work-story-map.md` の repository adoption acceptance、`requirements.md` の FR-05〜15／NFR-01〜09、`components.md` の C1〜C6／I1 ownership、`component-methods.md` の evidence・candidate・trusted ledger interface、`services.md` の bootstrap／CI／distribution境界に適用する。

U4 は corpus固有の正本値、承認証跡、CI wiring、統合検証、生成投影を所有する。U1 の schema／algorithm／root package script、U2／U3 のruntime実装を所有しない。UI、deployable service、remote dependency、credentialを追加しない。

## Evidence provenance規則

| ID | 規則 | 不変条件 |
|---|---|---|
| BR-RA-01 | raw evidenceはimmutableである | 新規output pathだけへ生成し、既存fileを上書きしない |
| BR-RA-02 | pre／postはfull revisionを持つ | short／symbolic revisionを正本証跡にしない |
| BR-RA-03 | 各段は前段のexact digestを参照する | path名やtimestampだけで同一性を判定しない |
| BR-RA-04 | classificationはraw identityと全単射である | 不足、余剰、重複は承認不能 |
| BR-RA-05 | classification entryはTP／FPと非空根拠を持つ | unknown／pendingをapproved evidenceへ含めない |
| BR-RA-06 | approval receiptはclassification digestとraw digestを結合する | 別censusへのreceipt流用を拒否 |
| BR-RA-07 | approvalはreviewer、時刻、audit event identityを持つ | 自動生成だけで人間承認を代替しない |
| BR-RA-08 | evidence commandはcanonical ledgerを書かない | candidate生成と正本昇格を分離する |

raw evidence、classification ledger、approval receipt、approved evidence、candidate、bootstrap provenanceを一つの可変fileに畳まない。preとpostの承認は独立し、一方のapproval receiptを他方へ再利用しない。

## Classification／precision規則

- 3 shapeのpositive／negative fixtureは100%分類する。
- raw censusの探索時precisionはfinding単位で `FP ÷ (TP + FP) × 100` を計算し、5%以下とする。
- 分母0は完全走査receiptとfixture 100%の双方が成立した場合だけ0.0%とする。
- baseline promotionに使う最終承認済みpre／post evidenceはFP=0とし、1件でもあればapproval receiptを発行せずraw censusから再実行する。
- FPをTP、baseline debt、intentional-dropへ偽装しない。
- `NSD001`／`NSD003` にexemptionを適用しない。
- 一般的なFP suppressionをU4で新設しない。

FPをbaseline／intentional-dropへ移してFP=0を偽装せず、第三のsuppression ledgerを作らない。classifier／catalog／fixtureの修正後は新しいraw／classification digestと新しいapproval receiptを要求する。

## Baseline／exemption規則

| ID | 規則 |
|---|---|
| BR-RA-09 | `B_pre` は修正前approved evidenceのeffective TP identity集合であり、committed baselineではない |
| BR-RA-10 | `B0` は修正後approved evidenceから作る初回committed baseline candidateである |
| BR-RA-11 | `B0` は `B_pre` の真部分集合でなければならない |
| BR-RA-12 | `B_pre - B0` は #1874／#1878 の承認済みidentityと完全一致する |
| BR-RA-13 | `B0 - B_pre` は空でなければならない |
| BR-RA-14 | baselineとexemptionは別schema／別file／別digestを維持する |
| BR-RA-15 | current baseline／exemptionはtrusted previous setのsubsetだけを許す |
| BR-RA-16 | 削除と追加の同数置換を `ratchet-replacement` として拒否する |

canonical ledgerへの昇格はcandidate生成とは別の人間レビュー済みrepository changeで行う。CLI、CI、testは通常check中にledgerを書き換えない。

## Bootstrap provenance規則

bootstrap provenanceは次を全て持つ。

- pre／post full revision。
- pre／post raw、classification、approval、approved evidenceのdigest。
- candidate `B0` digestと `B_pre` digest。
- 初期exemption identity集合とdigest。
- schema／rule bundle／semantic dependency digest。
- candidate生成command versionと人間review record。

trusted baseにbaselineが存在しない初回だけbootstrap provenanceをprevious-setとして使用できる。baseにbaselineが存在する通常運用では、bootstrap provenanceへfallbackしてledger増加を隠さない。

canonical ledger schemaはU1既存契約を維持する。通常時の `previousDigest` はbaseの同種ledger exact bytes digestである。初回だけledger外のbootstrap provenanceをU1へ別入力として渡し、current ledgerの `previousDigest` とprovenance内のapproved `B_pre`／initial exemption identity-set digestを照合する。U4はschema／検証algorithmを変更せず、provenanceとcanonical値を供給する。base ledgerが存在する場合はbootstrap fallbackを禁止する。

## Trusted base revision規則

| ID | 規則 | Failure |
|---|---|---|
| BR-RA-17 | `pull_request` はevent payloadのbase SHAを使う | missing／invalidはblocking failure |
| BR-RA-18 | pushはevent payloadのbefore SHAを使う | missing／invalidはblocking failure |
| BR-RA-19 | full SHAだけを受理する | short／zero／非hexを拒否 |
| BR-RA-20 | current HEAD／runtime merge-base推測を使わない | fallback禁止 |
| BR-RA-21 | repository objectとして解決できなければ拒否する | typed error＋非0 exit |
| BR-RA-22 | current `previousDigest` 単独を信頼しない | base bytesとの一致が必須 |
| BR-RA-22A | checkoutはfull historyを取得する | shallow object欠落を通常状態にしない |
| BR-RA-22B | object欠落時は形式検証済みliteral full SHAだけをoriginからfetchする | ref名／shell展開を使わない |
| BR-RA-22C | fork PRではbase repositoryのbase SHAだけを取得する | write権限／secret不要 |
| BR-RA-22D | fetch／object再確認失敗はblockingにする | HEAD／merge-base fallback禁止 |

CIはbase revisionを一つの明示argvとしてU1のroot scriptへ渡す。ledger pathはU1 contractが所有するliteral pathを使い、workflow入力から任意pathを組み立てない。

## CI enforcement規則

- 既存lint jobへ独立したblocking stepを一つ追加する。
- 新規CI jobを作らない。
- root scriptを一回だけ呼び、detector algorithmをworkflowへ複製しない。
- GNU `timeout` が外側deadlineを所有し、30秒でTERM、追加5秒でKILLする。job `timeout-minutes: 1` はbackup ceilingとする。
- exit 0だけを成功とし、exit 1／2、timeout 124、KILL 137、signal、fetch／起動失敗をすべてjob failureにする。
- `continue-on-error`、warning-only、`|| true`相当、後続commandによるexit上書きを禁止する。
- stdout JSONとstderr textをCI条件式で再分類しない。
- localとCIで同じroot script、ledger、base revision contractを使う。
- frozen install後のrepository-local binaryだけを使い、実行時network installを行わない。

## 完全走査と決定性規則

U4はU1のscan algorithmを再実装せず、evidenceから次を検証する。

- expected／scanned count、missing、extra、manifest digestが完全走査を示す。
- zero、partial、symlink、unreadable、source-changed、tool／rule／schema異常が非0 exitになる。
- 同一revision／contractの反復raw evidenceとGateResultがbyte-identicalである。
- authored rootsだけを母集団とし、fixture／generated projectionを本番censusへ混入させない。
- evidenceのrevisionと実際にcheckoutしたrevisionが一致する。

## Regression規則

| ID | 必須証跡 |
|---|---|
| AR-RA-01 | NSD001〜003のpositive／negative fixture 100% |
| AR-RA-02 | #1874 not-found／write-before-success regression green |
| AR-RA-03 | #1878 commit境界／outbox convergence regression green |
| AR-RA-04 | #1963 t407／t411既存regression green。修正は再実装しない |
| AR-RA-05 | zero／partial scan、tool／rule／ledger異常がfail-closed |
| AR-RA-06 | full test、lint、typecheck、既存coverage gate green |
| AR-RA-06A | PR base／fork PR base／push beforeを実Git objectとしてmaterializeし、`git show`が成立する |
| AR-RA-06B | object fetch failureとhang injectionがblocking exitになる |

U4のtestがU2／U3の内部failure mappingを複製してはならない。producer Unitのfocused test結果とrepository-level integrationをdigest／command recordで接続する。

## Performance規則

| ID | 規則 |
|---|---|
| BR-RA-23 | GitHub Actions `ubuntu-latest`、Bun 1.3.13、frozen install完了後に測る |
| BR-RA-24 | 5つのfresh workspaceの初回をcoldとする |
| BR-RA-25 | 各cold直後の同一workspace実行をwarmとする |
| BR-RA-26 | cold／warm各5値を欠損なく保持する |
| BR-RA-27 | 各群の最大値が15秒以下である |
| BR-RA-28 | 非0 exit／timeout／母集団差異を時間sampleにしない |

平均、中央値、外れ値除外で最大値超過を隠さない。超過時にscan completeness、semantic判定、fail-closedを緩めない。

## Distribution規則

- canonical core／harness sourceを唯一の編集元とする。
- `dist/`、generated harness tree、promoted root suffixを直接編集しない。
- canonical変更後にrepository既定のpackagerで全projectionを再生成する。
- `bun scripts/package.ts --check` と `bun run promote:self:check` を必須にする。
- generated差分はcanonical sourceから説明可能でなければならない。
- drift failureを生成物の局所修正で解消しない。
- harness間byte parityと対象外runtime公開挙動をfull regressionで維持する。

## Evidence report規則

最終reportは各検証について full revision、command argv、環境、母集団、開始／終了時刻、exit code、結果digest、合否を持つ。raw outputをreportへcopyせず、不変artifactのpathとdigestを参照する。

reportのoverall statusは全必須項目の論理積である。一件でも未実行、失敗、digest不一致、承認不足があればgreenにしない。secret、credential、個人token、不要なrunner環境値を記録しない。

## Ownership／変更境界規則

- U1はschema、algorithm、GitReadPort、ratchet、root package scriptの最終writerである。
- U4はclassification／approval／canonical ledgerの値、CI workflow、integration evidence、packaging実行を所有する。
- U2／U3はcanonical runtime fixとfocused testsを所有する。
- U4は `package.json`／`bun.lock` を編集せず、U1のroot scriptを呼ぶ。
- `.github/workflows/ci.yml` と生成投影の統合責務はU4に一意化する。
- 同じ内部関数、result union、ledger parserをUnit間で複製しない。

## Acceptance規則

| ID | 合格条件 |
|---|---|
| AR-RA-07 | 全evidence段階のdigest chainと人間approvalが検証可能 |
| AR-RA-08 | `B0 ⊂ B_pre`、削除identity一致、追加0件 |
| AR-RA-09 | baseline／exemption同時追加をtrusted base ratchetが拒否 |
| AR-RA-10 | invalid base SHAがfallbackなしでblocking failure |
| AR-RA-11 | local／CIの結果とexit contractが一致 |
| AR-RA-12 | corpus FP率5%以下、fixture 100% |
| AR-RA-13 | cold／warm各5試行の最大15秒以下 |
| AR-RA-14 | #1874／#1878／#1963、full regressionがgreen |
| AR-RA-15 | package／promotion drift green、直接生成物編集0件 |
