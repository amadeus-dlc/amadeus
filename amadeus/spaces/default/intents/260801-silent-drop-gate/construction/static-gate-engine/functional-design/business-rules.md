# Business Rules — static-gate-engine

## 適用範囲と上流トレーサビリティ

本規則は `unit-of-work.md` の U1、`unit-of-work-story-map.md` の SC-01／02／04／07、`requirements.md` の FR-01〜09／15 と NFR-01／02／04〜08、`components.md` の C1〜C6、`component-methods.md` のpure／adapter契約、`services.md` の短命同期orchestrationに適用する。

対象はdetector、snapshot／mirror、semantic classifier、exemption／baseline policy、evidence command、closed result rendererである。canonical ledger値、CI workflow、runtime修正、generated projectionは所有しない。

## 完全性とfail-closed規則

| ID | 規則 | 合否条件 |
|---|---|---|
| BR-SG-01 | configured authored rootを完全走査する | expected pathとreceipt pathが全単射、重複0 |
| BR-SG-02 | 解析bytesを単一snapshotへ固定する | ast-grep mirrorとTypeScript overlayのdigestがsnapshotと一致 |
| BR-SG-03 | source途中変更を許可しない | 走査前後manifest不一致は `SOURCE_CHANGED_DURING_SCAN` |
| BR-SG-04 | zero／partial scanをPassにしない | `SCAN_ZERO`／`SCAN_PARTIAL`、exit 2 |
| BR-SG-05 | symlinkを追跡しない | 対象内symlinkは `SCAN_INVALID_SYMLINK` |
| BR-SG-06 | semantic解決不能をfinding 0件にしない | symbol／union／path未解決は `RULE_INVALID` |
| BR-SG-07 | infrastructure Errorとpolicy violationを分離する | Errorはfindings空・exit 2、Violationsはfindings非空・exit 1 |
| BR-SG-08 | 通常checkで入力を更新しない | source、config、baseline、exemptionのbefore／after bytes一致 |

## Rule判定規則

### `NSD001`

- candidateはauthored root内の全catch clauseであり、catch parameter利用やlog呼出を理由に除外しない。
- rethrow、typed failure return、正準terminalへの委譲だけを許可する。
- 空catch、logだけ、値を返さないcontinuation、未知terminalはfindingとする。
- catch parameter名やcallee名だけで許可しない。

### `NSD002`

- 正準catalogでreturn typeとsymbol identityを固定する。
- ExpressionStatementとして破棄、未検査assignment、片側pathだけの検査はfindingとする。
- discriminantのexhaustive検査、許可union narrowing、return／throwへの接続を消費とする。
- `intentional-drop` exemptionを適用できる唯一のruleとする。

### `NSD003`

- candidateは `persistBlocked`、`setCheckbox`／`setStageSuffix`、#1963 compose resyncのexact 3経路とする。
- `persistBlocked` は `applyTransition.kind=ok`、text mutationはtarget found＋変更後値re-read、compose resyncはsection recognized＋write後reparse一致をsuccess前に要求する。
- success outcomeに到達する全pathで、経路固有のwriteとpostconditionが先行しなければならない。
- missing target、置換0件、malformed stateをsuccessへ変換するpathはfindingとする。
- text内容やhelper名ではなく、正準catalogのwrite／postcondition／success関係で判定する。
- exemptionを認めない。

## API candidate census規則

| ID | 規則 |
|---|---|
| BR-CC-01 | authored rootsのstatus-return／write／success構造候補を全件列挙する |
| BR-CC-02 | 各候補を `included | excluded | unresolved` のいずれかへ分類する |
| BR-CC-03 | candidate identity、symbol、shape、classification、非空reason、catalog versionを保持する |
| BR-CC-04 | included／excludedは同一snapshot Programとsemantic dependency receiptで証明する |
| BR-CC-05 | unresolvedが1件でもあれば `RULE_INVALID` とし、raw evidenceを生成しない |
| BR-CC-06 | candidate census digestをraw evidence、classification、approvalへ結合する |
| BR-CC-07 | 初回 `NSD002` 違反確定catalogは `applyTransition(...): StateResult` だけとする |
| BR-CC-08 | catalog追加は要件変更、fixture、再census、人間再承認なしに行わない |
| BR-CC-09 | candidate母集合はTypeScript ASTからast-grep ruleと独立に生成する |
| BR-CC-10 | 全CatchClause／CallExpression／union-return declaration／ExpressionStatement／ReturnStatement／catalog symbol参照をsemantic universeへ含める |
| BR-CC-11 | semantic expected structural setとast-grep candidateはrule別に全単射でなければならない |
| BR-CC-12 | semantic universeとast-grepの欠落／余剰／重複は `RULE_INVALID` とし、sentinel passで上書きしない |

## Identity とnormalization規則

1. identity codecの単一ownerはC4とし、C5はsource identityを変更せず、policy identityもC4のpure codecで生成する。
2. source identity inputは `v1, source, ruleId, normalized path, node kind, normalized-token hash, parent-context hash` のlength-prefix UTF-8 tupleとする。
3. policy identity inputは `v1, policy, FindingCode, ledger kind, sorted related identities, previous digest, current digest` とし、AST／source locationを要求しない。
4. tupleのSHA-256をstable identityとし、行／列はdiagnostic属性だけにする。
5. path traversal、absolute path、platform依存separatorをidentityへ残さない。
6. finding、manifest、ledger差分はidentityのbyte順でsortする。
7. 同一revision／config／dependency receiptでJSON bytesが変化してはならない。
8. codec v1はmagic、version、domain、field count、tag、UTF-8 byte lengthをbig-endian length-prefixでencodeする。
9. textはNFC、pathはrepository-relative POSIXでcase-foldせず、trivia／comment／改行をtoken streamから除く。literalはkind別canonical value、explicit semicolon／punctuationは保持する。
10. parent contextはnamed declaration symbolとcontrol ancestor slot列を使い、line／columnと通常sibling ordinalを含めない。同一fingerprint重複時だけoccurrence indexを付ける。
11. candidate identityはsource findingと別の `candidate` domain tupleを使い、resolved symbol identityを含める。
12. whitespace／comment／quote／numeric baseだけの変更はgolden identityを維持し、identifier／literal value／control branch変更はidentityを変える。

## Exemption規則

| ID | 規則 |
|---|---|
| BR-EX-01 | 唯一のmarker文法は `// intentional-drop: <非空理由>` |
| BR-EX-02 | markerと対象の間は空行／空白だけを許可する |
| BR-EX-03 | 直後の単一ExpressionStatement内の単一 `NSD002` callだけを対象にする |
| BR-EX-04 | `NSD001`／`NSD003` は免除不可 |
| BR-EX-05 | 空理由、連続marker、対象不在、複数call、stale entryは `EXEMPTION_INVALID` |
| BR-EX-06 | valid exemption identityとledger entryは全単射 |
| BR-EX-07 | normal checkはmarker／ledgerを生成・修正しない |

effective setはraw setからvalid `NSD002` exemptionだけを除いた集合とする。invalid markerを適用済みとして除外してはならない。

## Baseline／ratchet規則

| ID | 規則 |
|---|---|
| BR-RT-01 | effective finding setはcurrent baselineのsubsetでなければならない |
| BR-RT-02 | current baselineはtrusted previous baselineのsubsetでなければならない |
| BR-RT-03 | current exemptionはtrusted previous exemptionのsubsetでなければならない |
| BR-RT-04 | removedとaddedが共存する同数置換は `RATCHET_REPLACEMENT` |
| BR-RT-05 | 通常previous setはfull base revisionのliteral `git show` だけから読む。base baseline欠落の初回だけ検証済みprovenance fallbackを許可する |
| BR-RT-06 | baselineとexemptionを別file／別schema／別集合として評価する |
| BR-RT-07 | 通常checkはgrowthを承認・追記しない |

base revision不明、短縮SHA、ledger path不正、schema不正はfail-closedにする。base baseline欠落は次の初回fallback条件を全て満たす場合だけ許可する。

1. current canonical baseline／exemptionとbootstrap provenanceが存在する。
2. provenanceのbootstrap base revisionが指定full SHAと一致し、そのbaseにbaselineがない。
3. approved B_pre、candidate B0、approval、削除identity、追加0件を再検証する。
4. current baselineがB0 digest、current exemptionがinitial identity set／digestと一致する。
5. previous baseline=B_pre、previous exemption=initial setとしてratchetを評価する。

baseにbaselineが存在する場合はGit ledgerだけを使い、fallbackを禁止する。baseがない／異なる、provenance再利用、digest不一致は `BASELINE_MISSING`／`BASELINE_INVALID` とする。provenanceの供給とcanonical昇格は `repository-adoption`、検証algorithmは本Unitが所有する。

## Evidence規則

1. `census-evidence` はbaselineなしでraw／exempted／effective censusを新規pathにだけ出力する。
2. raw evidenceはrevision、manifest digest、rule bundle digest、semantic dependency digest、全identityを保持する。
3. `approve-evidence` はcensusとclassificationを全単射で照合する。
4. raw evidenceは `ApiCandidateCensus` とそのdigestを保持し、approvalまで同じdigestを結合する。
5. classificationは各identityのTP／FP、非空理由、reviewerを必須とする。
6. approval receiptはclassification digest、candidate census digest、承認時刻、human gate audit event IDを結合する。
7. digest mismatch、重複、不足、余剰、空理由、未承認はapproved evidenceを生成しない。
8. precisionはFP率5%以下を測定するが、`baseline-candidate` はpre／post両方のFP=0を必須とする。FPがあればrule／catalogを修正して再censusする。
9. `baseline-candidate` は承認済みpre／post evidenceだけを入力にする。
10. candidateは `B0 ⊂ B_pre`、削除集合の対象identity一致、追加集合空を全て満たす場合だけ生成する。
11. evidence commandは既存pathを上書きせず、canonical baseline／exemptionを更新しない。

## Result／renderer規則

- `Pass` はfindings空、ScanSummary必須、exit 0。
- `Violations` は1件以上のFinding、ScanSummary必須、exit 1。
- `Error` はfindings空、manifest確定前のscanはnull、確定後は取得済みScanSummary、exit 2。
- source findingのruleId／path／line／columnは非null。locationを持たないledger findingだけnullを許可する。
- entrypointだけがstdout、stderr、exit codeを設定し、それぞれ1回に限定する。
- stdoutはschema version 1の単一JSON object、stderrは人間向け要約とする。
- stderr文字列をmachine verdictへ使用しない。

## Performance／supply-chain規則

- repository-local exact ast-grep binaryをmanifest／lockfileで固定し、shellを介さずliteral argvで起動する。
- candidate rulesとcoverage sentinelは同じchild process invocationで実行する。
- TypeScript semantic evaluationはast-grep candidateに限定するが、candidateの全path判定は省略しない。
- timeout、signal、spawn I/O、nonzero exit、stdout schema不正をtyped Errorへ写像し、retryしない。
- network、credential、remote serviceを実行時依存へ追加しない。
- cold／warm各5試行の最大15秒を満たせなくても完全性、precision、fail-closedを緩めない。

## Acceptance規則

| ID | 証跡 |
|---|---|
| AR-SG-01 | `NSD001`〜`NSD003` のpositive／negative fixtureが100%分類される |
| AR-SG-02 | 全pathの一部だけがdropするfixtureをfindingにする |
| AR-SG-02A | log-only catchと `NSD003` exact 3経路のpositive／negative fixtureを固定する |
| AR-SG-03 | zero／partial／symlink／source change／tool／rule／schema failureがexit 2になる |
| AR-SG-04 | 同一snapshotの反復stdoutがbyte-identicalになる |
| AR-SG-05 | exemption grammar全境界とstale markerを検出する |
| AR-SG-06 | baseline／exemptionのgrowthと同数置換を拒否する |
| AR-SG-07 | classification／approval不備とdigest mismatchでevidence生成を拒否する |
| AR-SG-07A | candidate censusのincluded／excluded全件とunresolved failure、digest結合を検証する |
| AR-SG-07B | FP>0でbaseline candidateを拒否し、FP=0でのみ生成する |
| AR-SG-07C | 初回provenance fallbackだけを許可し、base revision／digest不一致と二回目以降を拒否する |
| AR-SG-07D | source／policy finding identity codecがcanonical tupleから決定的hashを返す |
| AR-SG-08 | normal checkと全evidence commandが既存canonical fileを変更しない |
| AR-SG-09 | CLI round-tripがPass=0、Violations=1、Error=2を返す |
| AR-SG-10 | focused test、lint、typecheck、既存coverage gateがgreenになる |

全証跡はrevision、command、fixture／artifact pathを記録し、後続の `repository-adoption` がcorpus、CI、distribution証跡と統合できる形にする。
