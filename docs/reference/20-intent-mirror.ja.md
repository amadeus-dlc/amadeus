# Intent Mirror Reference

> 言語: [English](20-intent-mirror.md) | **日本語**

runtimeとdistributionの正確なcontractを定義します。

<!-- amadeus-topic:modes -->
<!-- amadeus-contract:modes {"modes":["off","prompt","auto"],"defaultMode":"prompt","booleanCompatibility":"rejected"} -->
## Mode schema

closed unionは`off | prompt | auto`、defaultは`prompt`です。

<!-- amadeus-topic:precedence -->
<!-- amadeus-contract:precedence {"precedence":["global","space","intent"]} -->
## Resolution

Global、Space、Intentの順に解決し、最後に存在する値が優先されます。

<!-- amadeus-topic:boundaries -->
<!-- amadeus-contract:boundaries {"boundaries":["intent-initialized","intent-capture-approved","phase-verified","parked","workflow-completed","manual"]} -->
## Event boundary

各receiptは完全なIntent UUID、boundary instance、operationへbindします。

`intent-initialized`はscope非依存の初回create boundaryです。engineは通常の前進`next`において、phase boundaryとcompletion boundaryのいずれも成立していない場合に限り、かつ`auto`のときだけ評価します。未決の条件は、3 phase用の`Mirror Boundary Receipts`とは別軸のフィールド`Mirror Initial Create Receipt`が`completed`でなく、かつ`pending`であるかv1 mirror blockにIssueが記録されていないことです。instanceは固定であるため再試行は常に同一receiptへ収束し、部分失敗後の再試行は記録済みissue numberにより`sync`へ解決されるので2件目のIssueを作りません。phase boundaryは初回createのfallbackではなく、以後のsync機会です。

<!-- amadeus-topic:completion -->
<!-- amadeus-contract:completion {"completionOrder":["create","sync","close"]} -->
## Completion state machine

成功時だけ`create → sync → close`へ進みます。

<!-- amadeus-topic:failure -->
<!-- amadeus-contract:failure {"workflowMayAdvance":true,"retry":"next-eligible-boundary-or-explicit-manual-command"} -->
## Failure semantics

receiptはnot-started、no-effect-confirmed、outcome-unknownを区別します。

<!-- amadeus-topic:safety -->
<!-- amadeus-contract:safety {"closeGuards":["verified-provenance","matching-repository","workflow-landed","final-sync-succeeded"]} -->
## Provenanceとrepair

新規relinkはProvenance V2を書きます。digestはinspection-clock `createdAt`を含み、C3がatomic transition内でplan bindingを再計算します。

<!-- amadeus-topic:cli -->
<!-- amadeus-contract:cli {"commands":[{"path":["boundary","intent-initialized"],"requiredOptions":["--instance"],"optionalOptions":["--repo","--space","--intent","--project-dir"],"positionalArguments":"forbidden"},{"path":["boundary","intent-capture"],"requiredOptions":["--instance"],"optionalOptions":["--repo","--space","--intent","--project-dir"],"positionalArguments":"forbidden"},{"path":["boundary","phase"],"requiredOptions":["--instance","--phase"],"optionalOptions":["--repo","--space","--intent","--project-dir"],"positionalArguments":"forbidden"},{"path":["boundary","park"],"requiredOptions":["--instance","--stage"],"optionalOptions":["--repo","--space","--intent","--project-dir"],"positionalArguments":"forbidden"},{"path":["boundary","completion"],"requiredOptions":["--instance"],"optionalOptions":["--repo","--space","--intent","--project-dir"],"positionalArguments":"forbidden"},{"path":["manual","create"],"requiredOptions":["--instance"],"optionalOptions":["--repo","--space","--intent","--project-dir"],"positionalArguments":"forbidden"},{"path":["manual","sync"],"requiredOptions":["--instance"],"optionalOptions":["--repo","--space","--intent","--project-dir"],"positionalArguments":"forbidden"},{"path":["manual","close"],"requiredOptions":["--instance"],"optionalOptions":["--repo","--space","--intent","--project-dir"],"positionalArguments":"forbidden"},{"path":["repair","status"],"requiredOptions":[],"optionalOptions":["--repo","--space","--intent","--project-dir"],"positionalArguments":"forbidden","mutatesRemote":false},{"path":["repair","relink"],"requiredOptions":["--issue"],"optionalOptions":["--repo","--space","--intent","--project-dir"],"positionalArguments":"forbidden","mutatesRemote":false},{"path":["repair","abandon"],"requiredOptions":["--operation"],"optionalOptions":["--repo","--space","--intent","--project-dir"],"positionalArguments":"forbidden","mutatesRemote":false}],"selectorDefaults":{"space":"active-space","intent":"active-intent"},"positionalArguments":"forbidden"} -->
## Command schema

`repair status`はread-onlyです。relinkは`--issue`、abandonは`--operation`が必須です。challenge TTLは10分で、confirmationは完全一致です。

<!-- amadeus-topic:scope -->
<!-- amadeus-contract:scope {"scopeExclusions":["pull-request","release","deploy","daemon","polling"]} -->
## 対象外

Pull Request、release、deploy、background daemon、pollingのauthorityを与えません。

<!-- amadeus-topic:projects -->
<!-- amadeus-contract:projects {"key":"mirror-projects","shape":"array of { project: \"<owner>/<number>\", phase-field?: string, status-names?: { <phase>: string } }","phaseKeys":["ideation","inception","construction","operation","done"],"layerResolution":"last-layer-with-a-value-replaces","independentOf":"auto-mirror","phaseField":{"key":"phase-field","default":"Intent Phase"},"authoritativeField":"phase-field","auxiliaryStatus":{"field":"Status","active":"In progress","complete":"Done","parked":"keep","archived":"keep","failureMode":"non-blocking"}} -->
## Project設定schema

`mirror-projects`は`{ project, phase-field?, status-names? }`の配列です。`project`は`"<owner>/<number>"`に一致し、numberは正の整数です。ゼロ埋め・小数・その他の不正値はcoerceせず拒否します。`phase-field`は空でないfield名で、既定値は`Intent Phase`です。`status-names`のキーはclosedなphase語彙`ideation | inception | construction | operation | done`で、値は空でない文字列です。未知の要素キー、未知のphaseキー、あるいは1要素の不正は、部分的なリストを作らずその層全体を拒否します。`auto-mirror`と`mirror-projects`は独立に解決され、キーごとに有効な値を持つ最後の層が勝ち、勝った`mirror-projects`は前の層の対象リストを全置換します。

`phase-field`が指すfieldをlifecycle reconcileとcompletion gateの正本とします。`Status`は補助同期であり、進行中は`In progress`、完了時は`Done`、parkedまたはarchived中は現在値を維持し、補助同期の失敗はreconcileやcloseを阻害しません。

<!-- amadeus-topic:auth -->
<!-- amadeus-contract:auth {"scope":"project","credentialStore":"gh","automaticScopeChange":false} -->
## Projectのauthorization

ProjectV2のitem・field読取、item追加、field更新はいずれも`project` token scopeを必要とします。credentialは`gh`へ委譲し、token値の読取・保存・ログ出力・描画テキストへの混入は行わず、scopeの自動変更・自動再認証もしません。scopeを欠くcredentialは、board名と必要scopeのみを述べる`permission-denied`診断として現れます。

<!-- amadeus-topic:diagnostics -->
<!-- amadeus-contract:diagnostics {"command":["repair","status"],"resolutions":["resolved","field-missing","option-missing","permission-denied"],"availableOptionsOn":"option-missing","mutatesRemote":false} -->
## Project診断

`repair status`は、設定対象・ledger entry・Issueの現在の所属の和集合について、canonicalな`owner/number`順にboard 1件ごとの診断を報告します。各行は`membership`、`currentStatus`、`expectedStatus`、`drift`、`resolution`、および`summary`文を持ちます。`expectedStatus`がnull(当該boundaryでcolumnを期待しない)の場合、`drift`は構成上falseです。`expectedStatus`はsyncが適用するのと同じ定義から得るため、診断がsyncの挙動と食い違うことはありません。`availableOptions`は`option-missing`のときだけ存在し、boardが宣言するoption名をそのまま列挙します。この経路はread-onlyで、gatewayの読取メソッドだけが到達可能であり、ledgerは入力であって出力ではありません。

board単位のledgerは`synced`、`pending`、`safety-blocked`と最後に適用したcolumnを記録するため、部分適用されたboundaryを表現できます。gatewayの処理は`gh`サブプロセスをargument arrayで起動して実行し、`gh`の不在・未認証・rate limit・失敗時は当該mirror操作をloudに失敗させますが、workflowは進行しうる状態を維持します。
