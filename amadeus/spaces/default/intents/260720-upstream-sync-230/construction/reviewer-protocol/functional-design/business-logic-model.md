# Business Logic Model — reviewer-protocol

> 上流入力(consumes 全数): `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`。

## 目的と境界

U08はFR-5 items 16–17をreviewer invocationとreview recordへ適用する。maker-checkerを反証可能にするため、Reviewの日付とidentityを実行時事実から記録し、per-unit reviewの読取集合を現在Unitとengineが渡した契約へ閉じる。

一次根拠はupstream `220f52b00f24ad3a0ce83be35064e026d9839e77`と`7fa54799f936c71e11ef6e297e8021accbf77f5e`。Amadeusではarchitecture/product reviewerの正本、stage protocol、orchestrator skill、reviewing knowledgeを更新し、6 harnessへgenerator投影する。reviewer選定、reviewer iteration数、stage固有validation、U07 hook adapterは本Unitで変更しない。

## Public seamとownership

公開面は`component-methods.md`の正準2関数だけであり、signatureを変更しない。

```ts
function reviewerReadScope(unit: UnitRef, consumes: readonly ArtifactRef[]): ReadScope;
function runtimeReviewIdentity(persona: ReviewerPersona, utcDate: string): ReviewHeader;
```

`reviewerReadScope`はorchestrator所有で、current Unitの`stage_file`、実在`produces`とpresent `consumes`から§12aのauthoritative declared scopeを作る。Q&Aは`directive.consumes`に明示された場合だけ含め、path探索で補わない。`runtimeReviewIdentity`はreviewer実行境界でpersonaと実測UTCを検証し、invalidならReview headerを作らない。pass-list構築、owner解決、`check-read`、Scope decision transcript再検証、date command実行は内部helperで、追加public APIではない。

## Flow A: invocation pass-list

1. orchestratorの`reviewerReadScope(unit, consumes)`はengine directiveから`stage_file`、required成果物、実在するoptional成果物、present `consumes`を列挙する。存在しないoptional候補は渡さず、Q&Aは`directive.consumes`に明示された場合だけ含める。
2. `directive.unit`があるper-unit stageでは、`directive.consumes`の解決済みpathを全て追加する。これはcross-unit境界を固定するupstream artifactであり、reviewerが sibling designを探す代替ではない。
3. `memory.md`、`plan.md`、reasoning file、record rootはpass-listへ含めない。
4. pass-listは重複を除いて決定的に保持し、reviewer promptへpathを明示する。このdeclared pass-listをauthoritative scopeとする。spot-checkで承認されたpathはこのinvocationだけに追加し、次iterationへ暗黙継承しない。
5. validation toolがstage definitionにある場合は、pass-list内成果物へ実行して結果をfindingへ含める。

## Flow B: bounded review

1. reviewerはstage definitionで期待shape、current Unit artifactsで実際の成果、passed consumesでshared contractを確認する。Q&Aが`directive.consumes`に明示されている場合は、そのpathから確定判断を確認する。
2. current Unit外の`construction/<other-unit>/`を対象とするfile open、grep、glob、shell patternのrequestをdeclared transcriptで禁止する。`construction/*/`はowner探索として受理しない。
3. passed system-wide contractに他Unit entryがあっても、current Unit artifactから参照されないことをfindingにしない。current Unitの参照がpassed contract内で実在・整合することだけを検査する。
4. spot-check requestは`check-read`だけがclosed predicateを評価する。(a) current Unit artifactが具体的integration IDを明示、(b) passed contractが単一owner pathを解決、(c) claimed shape確認に必要な非空reasonがある、(d) pathが単一fileでdirectory/glob/grep/shell wildcardやbrowse/search由来でない、の4条件が全て成立する時だけ自動承認する。
5. orchestratorはrequest前のreviewer promptへ`decision=approved | rejected`、path、reason、integration ID、owner evidenceを固定する。approved時だけ単一owner pathを当該invocation限定pass-listへ追加する。current Unitとpassed contract以外をowner解決根拠に使わない。
6. 一条件でも欠ける、owner 0/複数、path不一致、2 file目ならrejectedでaccepted request 0とし、current designまたはshared contractへのfindingに閉じる。`check-read`を通らない、rejected、approved path外、2 file目のrequestを含むresultはReview/READY証拠に使わない。
7. decisionと同じpath/reason/ID/evidenceをsubagent prompt/result間のtransient Scope decision transcriptとして渡す。`complete-review`はrun-stage directive、current artifacts、passed consumesから全entryを再検証し、bypassや改竄を拒否したうえで、同内容のScope decision projectionを最終Reviewへ永続記録する。既存auditはsubagent identity/completionを保持し、新しいaudit event、read ledger、storeは追加しない。同一decisionの再実行はReview projectionを増殖させない。
8. verdictとfindingをprimary artifactの`## Review`へappendする。reviewerはそれ以外のartifactを変更しない。

## Flow C: runtime review identity

1. Reviewを書き始める直前にshellで`date -u +%Y-%m-%dT%H:%M:%SZ`を実行し、stdoutの単一UTC timestampを取得して`runtimeReviewIdentity(persona, utcDate)`へ渡す。
2. Review headerの`Reviewer`には実際に起動されたreviewer persona名を置く。producer personaを転記しない。
3. `Date`には直前commandの実出力を貼り、モデル知識、会話日付、固定fixture値から推定しない。
4. `Verdict`、`Reviewer`、`Date`、`Iteration`を一つのReview recordへ記録し、persona/時刻欠落をREADYとして扱わない。
5. subagent result先頭にもreviewer identityを明示し、hookがmaker/checkerを正しくauditできる形を維持する。

## Projection flow

1. authored coreのreviewer personas、reviewing knowledge、stage protocolを更新する。
2. harnessごとに独立authoringされるorchestrator skillのreviewer bulletを全6面で同じcontractへ更新する。
3. package generatorで配布projectionを生成し、source/projection byte guardを通す。`dist/`を直接編集しない。
4. content testsはdate command、guess禁止、正しいpersona、`directive.consumes`、tool-agnostic sibling ban、spot-check carve-outを正本と6 harness surfaceでpinする。

## Failure decisions

- date commandがnon-zero、空、複数行、不正形式ならReviewを確定せずloud failureにする。推定timestampで補わない。
- pass-list外readを必要と感じても、その場でscopeを広げない。spot-check requestを`check-read`へ通せない場合はshared contract不足のfindingとしてorchestratorへ返す。
- sibling横断pattern、rejected、approved path外、2 file目をdeclared request/resultが含む場合、その結果を独立review完了証拠に使わない。
- `check-read` receiptのbypass、prompt/result間のtranscript改竄、directive/artifacts/consumesから再現不能なentryは`complete-review`が拒否する。
- 全6 harnessの実tool/syscall readを不可視領域まで捕捉することは要件にしない。read proxy/sandboxを追加せず、authoritativeなdeclared pass-listとtranscriptの検証へ境界を閉じる。
- projection driftはgeneratorから修復し、生成物側を正本に昇格させない。

## 検証シナリオ

- date template2種がexact commandとguess禁止を持ち、Reviewer fieldがproduct/architectureのchecker personaを指す。
- per-unit pass-listは`stage_file`、current Unitの実在`produces`、present `consumes`を含み、Q&Aは`directive.consumes`に明示された場合だけ含む。missing optional、memory、plan、sibling artifactを含まない。
- file open、grep、glob、shell wildcardの各sibling requestをnegative fixtureで拒否する。
- positive fixtureは4条件成立、request前decision記録、`check-read`受理、当該invocationだけの単一owner path追加、prompt/result transcriptとReviewの再検証済みprojection一致を全てassertする。
- negative fixtureはIDなし、owner 0/複数、reason空、path不一致、directory/glob/grep/shell wildcard、browse/search由来、2 file目、事後記録、rejected/outside request、`check-read` bypass、transcript改竄を全数拒否し、Review/READY不受理をassertする。
- core正本と6 harness projection、package/promote checksが一致する。

## Design reconciliation — E-USSU08CGD1

E-USSU08CGP2のBlock後、E-USSU08CGD1はchoice1 Aを6–0、GoA 6–0でrecordedした。本節以前の規範記述は上記declared-scope境界で解釈し、後掲の過去Reviewにある「実read発生の完全検知」相当の表現は本裁定で置換する。authoritative scopeは既存wireが渡す`stage_file`、実在`produces`、present `consumes`の§12a declared pass-listで、Q&Aは`directive.consumes`明示時だけ含む。追加requestの唯一受理経路は`check-read`、Review/READY受理前の正本検証は`complete-review`によるScope decision transcript全件再計算である。transcriptはprompt/result間だけtransientで、最終Reviewには再検証済みprojectionを永続記録する。actual invisible readは非要件であり、新audit/event/store/proxy/sandboxを追加しない。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-20T14:54:29Z
- **Iteration:** 1

### Findings

- **Major — 公開seamの正準signatureと責務境界がFunctional Designで固定されていない。** `unit-of-work.md`と`component-methods.md`は `reviewerReadScope(unit: UnitRef, consumes: readonly ArtifactRef[]): ReadScope` と `runtimeReviewIdentity(persona: ReviewerPersona, utcDate: string): ReviewHeader` をU08/C6の公開面として定義しているが、本成果物群は同名関数・引数・戻り値への明示的な対応を持たず、`ReviewInvocation` / `ReviewPassList` / `RuntimeReviewIdentity` の概念記述だけに留まる。特にstage definition、Q&A、current Unit artifactsを `UnitRef` からどう閉じたscopeへ写像するか、`utcDate` の検証失敗をどのresultへ返すかが実装者依存になる。正準signatureを変更せず、各公開関数の入力、出力、failure result、既存orchestrator/reviewer ownershipへの写像を明記すること。
- **Major — 追加readのspot-check手順が承認済みQ&Aの事前開示契約を満たしていない。** Q&Aはpass-list外readが不可避な場合、読む前にpathと理由を明示し最小範囲へ限定すると確定している。一方、Flow Bと`IntegrationSpotCheck`はowner file 1件と`reason`を保持するだけで、誰がどの記録面へpath/reasonを事前開示し、承認済みclosed pass-listをどう検証可能に拡張するかを定義していない。このままではBR-U08-06のclosed setとBR-U08-10のcarve-outが実装時に矛盾し、理由なし追加readを防ぐfixtureも判定不能になる。read前の明示、単一pathへの一時的scope拡張、違反時のreview無効化まで一つの決定手順として明記すること。

### Summary

必須3成果物とQ&Aは実在し、各成果物は6つのconsumesを参照している。UIなしのため`frontend-components.md`省略も妥当であり、required-sections / upstream-coverage / answer-evidenceの形は満たす。上記2件を正準signatureと承認済みread-scope契約へ閉じれば実装可能性を再評価できる。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-20T15:06:17Z
- **Iteration:** 2
- **Findings:** なし（Critical 0 / Major 0 / Minor 0）。
- **Iteration 1再評価:** Major 1は解消済み。`reviewerReadScope(unit: UnitRef, consumes: readonly ArtifactRef[]): ReadScope`と`runtimeReviewIdentity(persona: ReviewerPersona, utcDate: string): ReviewHeader`が全成果物で正準public seamとして一致し、前者をorchestrator、後者をreviewer実行境界へ割り当て、owner resolver・scope decision builder・date command実行を内部helperへ閉じている。
- **Iteration 1再評価:** Major 2は解消済み。E-USSU08FD1=Bの4条件closed predicateをcurrent Unit成果物とpassed contractだけでread前に評価し、decision/path/reason/integration ID/owner evidenceを固定する。承認時は単一owner pathを当該invocation限定pass-listへ追加し、拒否後・decision前・approved path外・2 file目のreadはreview全体を無効化する。既存Review/subagent/auditで同値追跡し、新eventを追加しない契約まで一致している。
- **Election fidelity:** E-USSU08FD1の3–0裁定および両留保に忠実。owner browse/search、directory/glob/grep/shell wildcardを禁止し、owner 0/複数、path不一致、reason欠落をfail-closedにしている。
- **Fixture coverage:** positive fixtureは4条件成立、read前decision、invocation限定single path、既存記録面での追跡を検証する。negative fixtureはIDなし、owner 0/複数、reason空、path不一致、directory/glob/grep/shell wildcard、browse/search由来、2 file目、事後記録、拒否後readを全数含む。
- **Internal consistency / feasibility:** business logic、rules、entities、Q&Aは同じ2 public signature、ownership、scope lifecycle、failure semantics、6 harness生成投影境界を共有しており、既存orchestrator/reviewer/subagent/audit seamで実装可能である。
- **Sensors:** required-sections PASS / upstream-coverage PASS / answer-evidence PASS。
- **Scope decision:** none（本reviewでは追加spot-check readを使用していない）。
