# Business Logic Model — static-gate-engine

## 目的と上流トレーサビリティ

本設計は U1 `static-gate-engine` の短命 Bun CLI が、silent dropを完全走査し、構文candidateをTypeScript semantic情報で分類し、exemption／baselineをshrink-onlyに評価して、閉じたJSONとexit codeを返す処理を定義する。

入力は `unit-of-work.md` の U1 境界、`unit-of-work-story-map.md` の SC-01／02／04／07 と Unit 内 acceptance dependency、`requirements.md` の FR-01〜09／15・NFR-01／02／04〜08、`components.md` の C1〜C6、`component-methods.md` の各pure function／adapter契約、`services.md` の単一同期orchestrationである。外部service、network、database、watch mode、canonical ledgerの自動更新は追加しない。

## 実行モデル

`check --base-revision <full SHA>` は1 Bun processと1 pinned ast-grep child processで次の順序を実行する。各段は成功時だけ次段へimmutable contextを渡し、Error時は後続を実行しない。

1. command、schema version、literal path、full base revisionを検証する。
2. GitReadPortでbase revisionのtrusted baseline／exemption bytesを取得する。
3. trusted previous setとcurrent committed ledgersを比較し、追加・同数置換を拒否する。
4. configured authored rootsからexpected source manifestを決定的順序で構築する。
5. 各regular fileを一度だけ読み、`SourceSnapshot(path,digest,bytes,language)` を作る。
6. snapshot bytesからisolated read-only mirrorを作り、mirror digestを照合する。
7. pinned ast-grepをliteral argvで1回実行し、candidate rulesとcoverage sentinelを同時に得る。
8. expected pathとsentinel receiptの欠落・余剰・重複、mirror digest、元sourceの走査後digestを検証する。
9. 同じsnapshot bytesをoverlayしたTypeScript Programでcandidateのsymbol、return union、control-flow pathを分類する。
10. findingをidentity順に正規化し、raw censusを確定する。
11. exemption grammarとledgerを評価し、effective finding setを作る。
12. current baselineとeffective finding setを比較する。
13. `Pass | Violations | Error` を1件だけ構築し、entrypointがstdout、stderr、exit codeへ各1回投影する。

通常 `check` は全入力をread-onlyとして扱い、evidenceやledgerを生成・上書きしない。

## Snapshot authority と完全走査

解析bytesの唯一の正本は `SourceSnapshot` 集合である。ast-grepはsnapshotから作ったread-only mirrorだけを読み、TypeScriptはsnapshot overlayを優先する。両者が元filesystemを独立に再読することを禁止する。

完全走査は次の集合等式で証明する。

- expected set: configured root配下の全regular authored sourceを正規化したpath集合。
- scanned set: coverage sentinelが返したpathをsnapshot digestと結合したreceipt集合。
- pass条件: expectedとscannedが全単射で、重複0件、mirror digest一致、走査前後の元source manifest一致。

root欠落、対象0件、symlink、読取不能、receipt欠落／余剰／重複、sourceまたはmirrorの途中変更は違反0件へ変換せず、対応するtyped infrastructure Errorにする。

## Candidate生成とsemantic判定

ast-grepは構造的candidateを広めに列挙し、TypeScript classifierが正準catalogと全control-flow pathを使って確定する。

| Rule | 閉じた構造candidate | semantic pass条件 | Finding条件 |
|---|---|---|---|
| `NSD001` | authored root内の全catch clause。parameter利用やlog有無で候補除外しない | log／metric／audit emitをterminalと数えず、全pathがrethrow、宣言済み非success variantの直接return、またはfailure-state transition結果を同catch内で検査して非success variantをreturn | 空catch、log-only、success return、未検査transition、1 pathでもsilent continuation |
| `NSD002` | status-return callの全構造候補。初回違反確定catalogは `applyTransition(...): StateResult` のExpressionStatementだけ | 戻り値が判別検査、許可union narrowing、return／throwへ接続 | catalog included callのvalueが破棄される |
| `NSD003` | (1) `persistBlocked`、(2) `setCheckbox`／`setStageSuffix` mutation、(3) #1963 compose resync の3経路 | 経路固有の必須write／postconditionが全pathでsuccessより前 | write不在、failure／not-found／unknown section、postcondition不一致、early success |

method名や変数名だけでは確定しない。symbol、union、pathのいずれかを解決できない場合はcandidateを無視せず `RULE_INVALID` にする。全pathのterminalは正準catalogの閉集合で評価し、未知terminalを暗黙許可しない。

`NSD003` の対応表は、`persistBlocked: applyTransition ok → safety-blocked`、`text mutation: target found＋変更後値re-read → mutation success`、`compose resync: section recognized＋write後reparse一致 → resync success` のexact setとする。#1963は既存実装の回帰検出だけを行い、再実装しない。

## API candidate census

違反確定catalogとは別に、authored roots内のstatus-return／write／success対応候補を全件列挙する `ApiCandidateCensus` を作る。

1. TypeScript compiler APIで全snapshot fileを直接walkし、ast-grep ruleとは独立した `SemanticCandidateUniverse` を作る。母集合は全 `CatchClause`、全 `CallExpression`、判別unionを返す全function／method declaration、全 `ExpressionStatement`、全 `ReturnStatement`、catalogが宣言するwrite／success symbol参照である。
2. semantic universeの各nodeをsymbol／return union／enclosing function／control-flow positionへ解決し、status-return／write／success候補を `included | excluded | unresolved` に分類する。
3. ast-grepのstructural candidateを同じcandidate identityへ正規化し、rule別にsemantic expected structural setと全単射比較する。欠落、余剰、重複はcandidate rule coverage failureとして `RULE_INVALID` にする。
4. 各entryへcandidate identity、symbol identity、return／write／success shape、classification、非空reason、catalog version、semantic universe digest、structural match有無を記録する。
5. includedは現行catalogとの一致、excludedは対象外の根拠を必須とする。unresolvedまたはcoverage mismatchが1件でもあれば `RULE_INVALID` とし、raw evidenceを成功生成しない。
6. semantic universeとcandidate censusのdigestをraw evidence、classification ledger、approval receiptへ結合する。

coverage sentinelはfile parsingの完全性、`SemanticCandidateUniverse` はcandidate ruleの完全性を独立に証明する。ast-grep ruleを故意に一件dropするfixtureではsentinelがpassしてもsemantic全単射がfailし、逆にast-grepの余剰matchもfailする。二つのoracleを同じrule queryから生成しない。

初回 `NSD002` included違反確定集合は `applyTransition(...): StateResult` だけである。候補censusに別APIが存在しても暗黙にcatalogへ追加しない。catalog追加は要件変更、positive／negative fixture、更新後candidate census、人間再承認を同一変更で要求する。

## Finding identity と決定性

identity codecの単一ownerはC4 Census & Semantic Classifierとする。C5はC4が確定したsource identityを変更せず消費し、policy finding生成時もC4のpure codecを一方向に呼ぶ。

source finding identityはcodec v1のcanonical tuple `source, ruleId, normalized path, node kind, normalized-token hash, parent-context hash` のSHA-256から作る。candidate identityは別domain tuple `candidate, normalized path, candidate node kind, normalized-token hash, parent-context hash, resolved symbol identity` とする。policy findingはASTを持たないため、`policy, FindingCode, ledger kind, sorted related identities, previous digest, current digest` を使い、ruleId／path／line／columnはnullにする。

codec v1 bytesはASCII magic `NSDID`、version byte `0x01`、domain tag byte、field countのunsigned 32-bit big-endian、各fieldのtag unsigned 16-bit big-endian＋UTF-8 byte length unsigned 32-bit big-endian＋value bytesを連結する。textはUnicode NFC、pathはrepository-relative POSIX separatorで `.`／`..`／absoluteを拒否し、大文字小文字をfoldしない。

normalized token streamはsnapshot parserのtoken順を使い、comment／whitespace／改行とautomatic semicolon triviaを除く。punctuationとexplicit semicolonはtoken kindを保持する。identifierはNFC exact spelling、string／template literalはcook済みUnicode scalar値とliteral kind、numeric literalはTypeScript parserが得るvalueのcanonical decimal（`-0`、separator、base表記を正規化）、bigintは符号付き10進、regexpはpattern exact code points＋flagsをASCII sortしてencodeする。keywordはtoken kindだけ、その他はtoken kind＋NFC token textをencodeし、各tokenもlength-prefixする。

parent contextは最も近いnamed declarationのkind＋checker symbol identity、そこからcandidateまでのcontrol ancestor列（function body、catch、if then／else、switch case、loop body、return／expression slot）を外側から内側へencodeする。line／column、block内の通常sibling ordinal、display messageを含めない。同じnamed declaration・同じcontrol slot・同じtoken hashが複数ある場合だけ、同一fingerprint occurrenceをsource順に0起点で付与して衝突を避ける。

出力決定性の規則は次のとおりである。

- path separator、repository root、改行、token triviaを正規化する。
- manifest、candidate、finding、ledger差分はidentityのbyte順でsortする。
- diagnostic messageはcatalogの固定templateと正規化値から作る。
- timestamp、temp path、child process PID、filesystem列挙順をstdout JSONへ含めない。
- 同一revision、同一config、同一dependency receiptならstdout bytesを一致させる。

## Exemption評価

raw findingとsource markerをpure evaluatorへ渡し、次の順序で処理する。

1. marker文法が `// intentional-drop: <trim後に非空の理由>` と一致することを検証する。
2. 空行／空白以外のnodeを挟まず、直後の単一ExpressionStatementへ結合する。
3. 対象が正準catalog内の `NSD002` callをちょうど1つ含むことを検証する。
4. marker identityとledger entryを全単射で照合する。
5. valid `NSD002` identityだけをraw setから除き、effective setを作る。
6. 空理由、連続marker、対象不在、複数call、対象外rule、未使用／陳腐化entryは `EXEMPTION_INVALID` にする。

`NSD001` と `NSD003` は免除できない。effective findingsは `raw findings - valid NSD002 exemptions` のみであり、policy findingをsource findingから隠さない。

## Baseline と ledger ratchet

通常判定ではcurrent baselineが保持するunexempted TP identity集合とeffective finding集合を比較する。

- effectiveがbaselineのsubsetなら既存債務の維持／削減として許可する。
- `effective - baseline` は `BASELINE_NEW_IDENTITY` とする。
- base revisionのprevious baseline／exemptionとcurrent ledgerを個別比較し、追加を拒否する。
- removedとaddedが同時に存在する同数置換も `RATCHET_REPLACEMENT` とする。
- 通常運用のprevious setはcurrent treeから推測せず、literal pathの `git show` 結果だけを信頼する。baseにbaselineがまだ存在しない初回導入だけは、後述の厳密なbootstrap fallbackを使う。

baselineとexemptionは別schema／別file／別集合として評価する。同じidentityを両方へ追加してfindingを隠す経路を作らない。

### 初回 trusted-previous fallback

base revisionにbaseline pathが存在しない場合、次の全条件を満たす一度限りのbootstrapだけを許可する。

1. current treeにcanonical baseline、canonical exemption、`bootstrap-provenance.json` が全て存在する。
2. provenanceの `bootstrapBaseRevision` がCLIへ渡されたfull base revisionと一致し、そのbaseにbaselineが存在しない。
3. provenanceが参照するapproved `B_pre` digest、candidate `B0` digest、approval receipt、削除identity、追加0件の証明を再検証できる。
4. current baseline bytes／digestがcandidate `B0` と一致し、current exemption identity set／digestがprovenanceのinitial exemptionと一致する。
5. current ledgerの `previousDigest` がprovenance内のapproved `B_pre`／initial exemption digestと一致する。

成功時はprevious baseline=`B_pre`、previous exemption=provenanceのinitial setとしてratchetを1回評価する。baseにbaselineが存在する場合は常にGit由来ledgerを使い、provenance fallbackを禁止する。base baseline欠落かつbase revision不一致、provenance欠落／再利用、digest不一致は `BASELINE_MISSING` または `BASELINE_INVALID` とする。これにより二回目以降はbase ledgerだけがprevious setになる。

## Evidence workflow

初回bootstrapは通常 `check` と分離したnew-output-only commandで進める。

### `census-evidence`

baselineを読まず、contract、manifest、snapshot、mirror、ast-grep receipt、`ApiCandidateCensus`、semantic classification、exemption applicationまでを実行し、candidate census、raw／exempted／effective集合と全digestを存在しない明示output pathへ書く。unresolved candidateが1件でもあれば `RULE_INVALID` とし、outputを生成しない。canonical ledgerは変更しない。

### `approve-evidence`

raw census、`ApiCandidateCensus`、human classification ledger、approval receiptを読み、全finding identityの全単射、candidate census digest、TP／FP理由の非空、manifest／rule bundle／semantic dependency digest、classification digest、reviewer、承認時刻、human gate audit event IDを検証する。成功時だけimmutable approved evidenceを新規pathへ書く。

NFR-02の最大5%はprecision観測上限であり、bootstrap baselineへFPを入れる許可ではない。approved evidenceにFPが1件でもあれば、rule／catalog／semantic classifierまたはfixtureを修正してcensusから再実行し、FP=0になるまで `baseline-candidate` を拒否する。`NSD001`／`NSD003` のFPをexemptionへ逃がさず、`NSD002` も誤検出をintentional dropとして処理しない。

### `baseline-candidate`

FP=0の承認済みpre／post evidenceから `B_pre` と `B0` を計算する。`B0` が `B_pre` の真部分集合、削除集合が対象issue identityと一致、追加集合が空の場合だけcandidateとbootstrap provenanceを新規pathへ書く。provenanceはbootstrap base revision、approved B_pre digest、candidate B0 digest、initial exemption identity set／digest、approval receipt digestを結合する。canonical baselineへの昇格は人間レビュー済みrepository changeの責務であり、このcommandは行わない。

## Result と終了契約

| Result | 条件 | findings | scan | exit |
|---|---|---|---|---|
| `Pass` | effective setとledger policyが全て許可 | 空 | 必須 | 0 |
| `Violations` | source／baseline／exemption／ratchet findingが1件以上 | 非空、identity順 | 必須 | 1 |
| `Error` | tool、rule、baseline schema、scan完全性、I/O、semantic解決の異常 | 空 | manifest確定前はnull、確定後は取得済みsummary | 2 |

`Violations` は非空findingだけから構築し、infrastructure Errorを違反へ畳まない。entrypoint以外はstdout／stderr／`process.exitCode` を変更しない。

## Acceptanceシナリオ

- positive／negative fixtureで全catch（log-onlyを含む）、初回 `NSD002` catalog、`NSD003` の3経路と全path判定を固定する。
- root欠落、zero、partial、symlink、source change、tool missing、rule invalid、baseline invalidをexit 2で証明する。
- 同一snapshot反復でstdout bytesとfinding順序が一致することを証明する。
- valid／invalid／stale exemptionと、baseline／exemptionのgrowth・同数置換を証明する。
- evidence各commandが既存fileを上書きせず、classification／approval不足を拒否することを証明する。
- `ApiCandidateCensus` の全候補がincluded／excludedへ根拠付きで閉じ、unresolvedとdigest mismatchを `RULE_INVALID` にすることを証明する。
- FPが1件以上のapproved evidenceではbaseline candidateを生成せず、FP=0だけを許可することを証明する。
- base baseline欠落の初回だけprovenance fallbackが成立し、base revision／B_pre／B0／initial exemptionの不一致と二回目以降のfallbackを拒否することを証明する。
- source findingとlocationなしpolicy findingのcanonical identityが反復実行で一致することを証明する。
- `check` がcanonical ledgerを変更しないことをbefore／after bytesで証明する。
- cold／warm各5試行の最大15秒を、単一ast-grep invocationとcandidate限定semantic evaluationで満たす。超過時も完全性を緩めない。

## Revision Cycle 2 Resolution

- FP=0は2026-08-02の人間裁定により `requirements.md` NFR-02／Completion Criteriaへ正式反映された。
- `SemanticCandidateUniverse` をast-grepとは独立したTypeScript AST母集合として追加し、candidate rule欠落／余剰／重複を全単射で検出する。
- identity codec v1のbyte framing、token normalization、parent context、candidate専用domain tuple、golden fixtureを固定した。
- Iteration 2の残存3件は上記で解消した。過去Review blockは履歴として改変しない。

本Unitはgate engineとfocused testを所有する。canonical corpus値、CI配線、修正前後evidenceの昇格、package／promotion driftは `repository-adoption` に引き渡す。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-02T04:42:27Z
- **Iteration:** 1
- **Scope decision:** none

snapshot／closed resultの骨格は妥当だが、検出対象、候補census、FP処理、bootstrap、identity契約にgateを正しく起動・運用できない欠落がある。

### Findings

- Rule candidateがrequirementsの閉じた検出対象を覆っていない。business-logic-modelはNSD001 candidateを「valueを利用しないcatch body」としているため、catch parameterをログへ渡すlog-only catchを候補から落とし得るが、FR-02はログを除いた後にterminal actionがないcatchを常に違反とする。またNSD003を「text mutation path」に限定しており、FR-04の `persistBlocked` と #1963 compose-resync経路が欠落する。3経路すべてとlog-only catchを構造candidateへ含める閉じたcandidate表とfixtureが必要である。
- FR-03が要求し、component-methodsが `enumerateStructuralStatusCandidates`／`classifyStatusCandidates` として定義する全候補censusが成果物から消えている。`RawCensusEvidence` はraw／exempted／effective findingだけを保持し、discriminated-union return候補およびwrite／success対応候補をincluded／excluded／unresolvedへ分類した集合・根拠・digestを持たない。このままでは初期catalogの網羅性やcatalog追加時の再審査を検証できないため、`ApiCandidateCensus` をevidence、approval、acceptanceへ接続する必要がある。
- baselineと偽陽性の集合契約が成立しない。通常checkはrawからvalid exemptionだけを除いた全effective findingsをbaselineと比較する一方、`BaselineCandidate.B0` はeffective TP identityだけで構築する。NFR-02は最大5%のFPを許容するため、承認済みFPが1件でも残れば初回baseline昇格後のcheckで `BASELINE_NEW_IDENTITY` となる。特にNSD001／NSD003はexemption不可で回避経路もない。bootstrap前にFP=0を必須化するか、承認済みFPを安全に扱う別のshrink-only契約を定義しなければCIをgreenにできない。
- 初回baseline導入時のtrusted-previous fallbackがFunctional Designに実装されていない。services／component-methodsはbase revisionにbaselineが存在しない最初のCIだけbootstrap provenanceをprevious-setとして検証すると定めるが、business-logic-modelは常に `git show` でprevious ledgerを取得し、business-rules／domain-entitiesはbase path解決不能をfail-closed Errorとするだけである。bootstrap provenanceの選択条件、approved B_pre／candidate B0／initial exemption digestの検証、二回目以降にfallbackを禁止する遷移を定義しないと、最初の `check` が `BASELINE_MISSING` から脱出できない。
- Finding identityの所有権と生成規則が閉じていない。上流componentsではC4がAST fingerprint／identityを所有するが、domain-entitiesのownershipではC5がidentity normalizationを所有し、C5はC4のFindingを消費するため実装次第でC4↔C5依存が生じる。さらにdomain-entitiesは全Finding identityをrule／path／AST fingerprintから作るとする一方、locationを持たない `RATCHET_REPLACEMENT` 等のledger findingはruleId／pathがnullでASTも存在せず、決定的identityを構築できない。source identityの正確なcanonical serialization／hash versionとpolicy-finding固有identityを単一ownerで定義する必要がある。

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-02T04:47:37Z
- **Iteration:** 2
- **Scope decision:** none

Iteration 1の5件は概ね反映されたが、FP合否の上流逸脱、candidate censusの完全性証明、永続identity codecに実装者判断が残る。

### Findings

- FP処理は集合矛盾を解消した一方、上流要件を無承認で強化している。NFR-02は実corpusの `FP率≤5%` を合格とするが、Functional Designはpre／postのFPが1件でもあれば `baseline-candidate` を拒否し、実質的にFP=0を新しいblocking criterionとしている。2%のFPはrequirementsでは合格、Functional Designでは完了不能となるため、FP=0へのrequirements変更と人間承認を行うか、承認済みFPをbaselineと分離してshrink-onlyに扱う契約が必要である。
- `ApiCandidateCensus` は「全候補」を要求するが、その完全性oracleが定義されていない。現在はast-grep matchからstatus-return／write／success候補を列挙し、coverage sentinelは各fileがparseされたことしか証明しないため、candidate rule自体が特定のCallExpression、関数宣言、alias経路を取りこぼしてもcensusは成功する。TypeScript ASTから全CallExpression／return declaration等の母集合を作ってast-grep候補と全単射検証するか、構造候補の閉じたnode集合と欠落検出receiptを定義しなければ、FR-03の全候補censusを証明できない。
- source identity tupleの外形は追加されたが、永続baselineを左右するcodecの正準化がまだ一意でない。`normalized-token hash` についてコメント／trivia、文字列quote、numeric literal、semicolon、Unicodeの扱いとhash入力が未定義で、`parent-context hash` も対象parent種別・深さ・含有fieldが「必要な親context」のままである。また `ApiCandidateCensus.candidateIdentity` がsource finding tupleを使うのか候補専用tupleを使うのか定義されていない。実装ごとにidentityが変わるとbaseline、exemption、approval digestが全てdriftするため、codec version 1のcanonical byte algorithmとcandidate identity tupleを固定する必要がある。
