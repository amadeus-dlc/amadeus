# Domain Entities — static-gate-engine

## 境界と上流トレーサビリティ

本モデルは `unit-of-work.md` の U1 data boundary、`unit-of-work-story-map.md` の SC-01／02／04／07、`requirements.md` のclosed result／identity／ledger／evidence要件、`components.md` の C1〜C6 ownership、`component-methods.md` のdata shape、`services.md` のprocess-local data ownershipを具体化する。

entityはすべてprocess-local valueまたはversion-controlled JSON／configであり、新しいdatabase、network resource、常駐serviceを作らない。通常 `check` は全永続entityをread-onlyで消費する。

## Entity一覧

| Entity／Value Object | Owner | Lifecycle | 役割 |
|---|---|---|---|
| `GateContract` | C1 | commandごと | command、schema、root、base revisionを検証済み値として保持 |
| `SemanticCatalog` | C1 | version-controlled | ruleごとのsymbol、union、terminal、write／postcondition関係の閉集合 |
| `SourceManifest` | C2 | commandごと | expected authored pathとdigestの決定的集合 |
| `SourceSnapshot` | C2 | commandごと・immutable | path、digest、bytes、languageを保持する解析正本 |
| `MirrorCorpus` | C2 | command中の一時領域 | snapshot bytesだけから作るread-only ast-grep入力 |
| `ScanReceipt` | C3 | commandごと | sentinel pathとsnapshot digestを結ぶ走査証明 |
| `StructuralCandidate` | C3 | commandごと | ast-grepが列挙したrule候補とsource location |
| `SemanticProjection` | C4 | commandごと | snapshot overlay上のsymbol、return union、control-flow graph |
| `PathVerdict` | C4 | candidate／pathごと | terminalがconsumed／dropped／unresolvedのいずれかを示す |
| `ApiCandidateCensus` | C4 | command／evidence | 全status-return／write／success候補のincluded／excluded／unresolved分類とdigest |
| `FindingIdentityCodec` | C4 | pure・versioned | source／policy findingのcanonical tupleとSHA-256 identityを一元生成 |
| `Finding` | C4／C5 | command／evidence | rule／policy違反のstable identityとdiagnostic |
| `ScanSummary` | C2／C6 | result内 | expected／scanned count、manifest digest、missing／extra |
| `Baseline` | C5 | version-controlled JSON | 許容済みunexempted TP identityのshrink-only集合 |
| `ExemptionLedger` | C5 | version-controlled JSON | valid `NSD002` intentional drop identityと理由のshrink-only集合 |
| `TrustedPreviousLedgers` | C5 | commandごと | base revisionから読んだprevious baseline／exemption |
| `RawCensusEvidence` | C5 | immutable output | raw／exempted／effective集合と解析digest |
| `ClassificationLedger` | human input | version-controlled／review artifact | 全identityのTP／FP、理由、reviewer |
| `ApprovalReceipt` | human gate | immutable input | classification／candidate census digestと承認audit identity |
| `ApprovedCensusEvidence` | C5 | immutable output | raw evidence、classification、approvalの検証済み結合 |
| `BaselineCandidate` | C5 | immutable output | 承認済みpre／post差分から得たB0候補とprovenance |
| `BootstrapProvenance` | C5 | version-controlled input | 初回base baseline欠落時だけtrusted previousを証明 |
| `GateResult` | C6 | command return | `Pass | Violations | Error` の閉じた機械契約 |

## Snapshot aggregate

`SourceManifest` がexpected corpusを定義し、各entryに対応する `SourceSnapshot` が解析bytesを所有する。`MirrorCorpus` と `SemanticProjection` はsnapshotから派生し、元filesystemを再読しない。

制約は次のとおりである。

- normalized pathはrepository-relative、unique、sort済みである。
- manifest entryとsnapshotはpath／digestで全単射である。
- mirror entryとsnapshotはpath／digest／bytesで全単射である。
- `ScanReceipt` はexpected pathごとにちょうど1件存在し、snapshot digestと一致する。
- semantic source fileはsnapshot overlayを優先し、target authored sourceをdiskからfallbackしない。
- 走査後manifestが走査前と一致しない場合、aggregate全体を結果生成に使わない。

関係のテキスト表現は次のとおりである。

`SourceManifest` 1 ─ N `SourceSnapshot` ─ 1 `MirrorCorpus`

`SourceSnapshot` 1 ─ N `StructuralCandidate` ─ 1 `SemanticProjection` ─ N `PathVerdict`

`SourceSnapshot` 1 ─ N `SemanticCandidateUniverse` entry ↔ N `StructuralCandidate`（rule別全単射）

## Finding とidentity

`Finding` は次の属性を持つ。identity生成の単一ownerはC4 `FindingIdentityCodec` であり、C5はC4を一方向に利用する。C4はC5へ依存しない。

| 属性 | 制約 |
|---|---|
| code | `NSD001 | NSD002 | NSD003 | BASELINE_NEW_IDENTITY | EXEMPTION_INVALID | RATCHET_REPLACEMENT` |
| ruleId | source findingでは非null、ledger findingではnull可 |
| path | normalized source path。locationなしledger findingだけnull可 |
| line／column | diagnostic用。source findingでは非null |
| identity | C4 codecがsource tupleまたはpolicy tupleから決定的に生成 |
| message | catalogの固定templateから生成 |

source findingのcanonical inputはcodec v1の `source` domain tuple、candidateは別の `candidate` domain tupleとし、そのSHA-256をidentityにする。codecは`NSDID` magic、version byte、domain tag、field count、field tag／UTF-8 byte length／valueをbig-endian length-prefixでencodeする。textはNFC、pathはrepository-relative POSIXでcase-foldしない。

token streamはcomment／whitespace／改行を除き、punctuation／explicit semicolonを保持する。identifierはexact NFC、string／templateはcook済み値＋kind、numeric／bigintはcanonical decimal、regexpはexact pattern＋sorted flagsとする。parent contextは最寄りnamed declaration kind＋symbol identityとcontrol ancestor slot列を持ち、line／columnと通常sibling ordinalを除く。同一fingerprint重複時だけsource順occurrence indexを含める。

locationを持たないpolicy findingは `v1, policy, FindingCode, ledger kind, sorted related identities, previous digest, current digest` のlength-prefix tupleからSHA-256を作る。ruleId／path／line／columnはnullでよく、AST fingerprintを要求しない。

`PathVerdict` は `consumed(terminal)`、`dropped(reason)`、`unresolved(reason)` の閉集合とする。candidateは全pathがconsumedの場合だけ非findingになり、1件以上のdroppedでsource finding、1件以上のunresolvedでtop-level `RULE_INVALID` になる。

## API candidate census entity

`ApiCandidateCensus` はauthored roots内の全discriminated-union return候補とwrite／success対応候補を保持する。

その母集合 `SemanticCandidateUniverse` はTypeScript AST walkerがast-grep ruleと独立に生成し、全CatchClause、CallExpression、union-return declaration、ExpressionStatement、ReturnStatement、catalog write／success symbol参照を保持する。entryはcandidate codec identity、node kind、symbol identity、enclosing declaration、control slot、semantic分類を持つ。semantic expected structural setとast-grep matchの欠落／余剰／重複が0件の場合だけcensusを成立させる。

| 属性 | 制約 |
|---|---|
| candidateIdentity | C4 codecによるstable identity |
| symbolIdentity | TypeScript checkerで一意に解決した宣言identity |
| shape | status-return、write、successの構造情報 |
| classification | `included | excluded | unresolved` |
| reason | 非空。catalog一致、対象外、解決不能の根拠 |
| catalogVersion | 分類に用いた正準catalog version |
| dependencyReceiptDigest | compiler／external declaration receipt |

entryはcandidate identity順でuniqueにsortし、全bytesのdigestを持つ。unresolved entryが1件でもあればcommandは `RULE_INVALID` となり、成功raw evidenceを生成しない。成功evidenceではincluded／excludedの全件とreasonを保持し、初回 `NSD002` included違反確定catalogが `applyTransition(...): StateResult` だけであることを検証する。

## Ledger aggregate

`Baseline` と `ExemptionLedger` は別aggregateであり、同じwriter APIや暗黙同期を持たない。各aggregateはschema version、sorted unique entry、content digestを持つ。

`TrustedPreviousLedgers` はfull base revisionのliteral pathから読み、current ledgerとの比較専用にする。

| 比較 | 許可 | 拒否 |
|---|---|---|
| previous baseline → current baseline | retained／removed | added、removed＋added置換 |
| previous exemption → current exemption | retained／removed | added、removed＋added置換 |
| current baseline → effective finding | retained／removed | new effective identity |

current treeからprevious setを再構成しない。base object／path／schemaを解決できない場合はtyped Errorとする。

初回だけはbase revisionにbaseline pathがない場合、`BootstrapProvenance` を検証してprevious setを得る。provenanceはbootstrap base revision、approved B_pre digest、candidate B0 digest、initial exemption identity set／digest、approval receipt digest、削除identity／追加0件証明を保持する。current baseline=B0、current exemption=initial set、指定base revision=bootstrap base revisionの全条件が一致した場合だけprevious baseline=B_pre／previous exemption=initial setとする。baseにbaselineが存在する二回目以降はprovenanceを無視し、Git由来ledgerだけを使用する。

## Exemption entity

exemption entryはidentity、rule ID=`NSD002`、非空reason、source marker identityを持つ。markerとledger entryは全単射でなければならない。

Lifecycleは次のとおりである。

1. source markerをgrammar検証する。
2. 直後の単一ExpressionStatementと単一catalog callへ結合する。
3. finding identityをledger entryへ照合する。
4. validならeffective setから対象 `NSD002` を除く。
5. source／ledgerの片側欠落、stale、対象外ruleなら `EXEMPTION_INVALID` を生成する。

通常commandはentryを作成・更新・削除しない。

## Evidence aggregate

`RawCensusEvidence` はrevision、manifest digest、rule bundle digest、semantic dependency digest、`ApiCandidateCensus` とそのdigest、raw／exempted／effective finding集合を保持する。

`ClassificationLedger` はraw censusの全identityに対してTP／FP、非空理由、reviewerを1件ずつ持つ。`ApprovalReceipt` はclassification digest、approval timestamp、human gate audit event IDを持つ。

`ApprovedCensusEvidence` は3入力の全単射、candidate census digest、全解析digestの一致が成立した場合だけ構築できる。後からcandidate classificationやfinding classificationだけを差し替えられないよう、全input digestを結合する。

`BaselineCandidate` はFP=0のpre／post Approved evidenceだけを入力にし、次を保持する。precision上限5%は観測合否であり、FPをbaselineへ許可する仕組みではない。FPが1件でもあればrule／catalog／classifierを修正してraw censusからやり直す。

- `B_pre`: pre effective TP identity集合。
- `B0`: post effective TP identity集合。
- removed identityと対象issueの対応。
- added identity空の証明。
- initial exemption set／digestとbootstrap provenance。
- bootstrap base revisionとapproval receipt digest。

candidateはcanonical baselineではない。昇格は別の人間レビュー済みrepository changeで行う。

## GateResult

| variant | 必須属性 | 禁止／制約 |
|---|---|---|
| `Pass` | schemaVersion=1、code=`NO_SILENT_DROP_OK`、findings空、ScanSummary | Error code、非空finding |
| `Violations` | code=`POLICY_VIOLATIONS`、1件以上のsorted Finding、ScanSummary | 空finding |
| `Error` | `InfraCode`、findings空、ScanSummaryまたはnull | policy finding |

`InfraCode` は `TOOL_MISSING`、`RULE_INVALID`、`BASELINE_MISSING`、`BASELINE_INVALID`、`SCAN_ROOT_MISSING`、`SCAN_ZERO`、`SCAN_PARTIAL`、`SCAN_INVALID_SYMLINK`、`SOURCE_CHANGED_DURING_SCAN`、`SOURCE_UNREADABLE`、`INTERNAL_ERROR` の閉集合とする。

`GateResult` はpure componentからentrypointへ一度だけ渡され、entrypointがstdout、stderr、exit codeへ投影する。render後に別variantへ変換しない。

## Ownership とimmutability

- C1はcontract／catalog schemaを所有し、scannerやpolicyを実行しない。
- C2はmanifest／snapshot／mirror／receipt equalityを所有し、semantic verdictを生成しない。
- C3はpinned ast-grep adapterとstructural candidateを所有し、baselineを読まない。
- C4はsnapshot overlay、all-path semantic verdict、`ApiCandidateCensus`、source／policy `FindingIdentityCodec` を所有し、source／ledgerを書かない。
- C5はC4のidentityを変更せず、exemption、baseline、ratchet、evidence／bootstrap provenance検証をpureに評価する。
- C6は順序、short-circuit、closed result、rendererを所有する。
- evidence commandだけが明示された不存在output pathへ新規fileを書ける。canonical ledger writerは持たない。

## Entity acceptance

- manifest／snapshot／mirror／receiptの全単射が欠落・余剰・重複を拒否する。
- `PathVerdict` の全variantと複数path集約を型検査／fixtureで固定する。
- log-only catch、初回 `NSD002` catalog、`NSD003` exact 3経路のcandidateが欠落しない。
- `ApiCandidateCensus` が全候補をincluded／excludedへ閉じ、unresolvedとdigest mismatchを拒否する。
- source Finding identityが行移動では安定し、意味変更では変化し、policy identityがlocationなしでも決定的になる。
- Baseline／Exemption ledgerの追加・置換・schema不正を拒否する。
- Raw／Classification／Approvalの不足・余剰・digest mismatchでApproved evidenceを作れない。
- FP>0のApproved evidenceからBaselineCandidateを作れない。
- bootstrap base revision、B_pre、B0、initial exemptionの全digest一致時だけ初回fallbackが成立し、base ledger存在時はfallbackできない。
- GateResultの不可能shapeをschema validationとexhaustive switchで拒否する。
- 同一input entity集合からbyte-identicalなJSONが生成される。
-既存output path指定時にevidence commandが失敗し、canonical fileを変更しない。
