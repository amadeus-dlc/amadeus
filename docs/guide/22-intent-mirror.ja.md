# Intent Mirror

> 言語: [English](22-intent-mirror.md) | **日本語**

Intent Mirrorはlifecycle進捗を1件のGitHub Issueへ投影します。正本はIntent recordです。

<!-- amadeus-topic:modes -->
<!-- amadeus-contract:modes {"modes":["off","prompt","auto"],"defaultMode":"prompt","booleanCompatibility":"rejected"} -->
## モード

`off`はboundary操作を抑止し、`prompt`は操作ごとに確認し、`auto`はeligibleなlifecycle boundaryだけで実行します。旧booleanは拒否します。

<!-- amadeus-topic:precedence -->
<!-- amadeus-contract:precedence {"precedence":["global","space","intent"]} -->
## 設定優先順位

IntentがSpaceを、SpaceがGlobalを上書きします。

<!-- amadeus-topic:boundaries -->
<!-- amadeus-contract:boundaries {"boundaries":["intent-initialized","intent-capture-approved","phase-verified","parked","workflow-completed","manual"]} -->
## Boundary

自動化はIntent初期化、Intent Capture承認、phase検証、park、completion、明示manual invocationに限定されます。daemon／pollingはありません。

`auto`では、最初のIssueは`intent-initialized` boundaryで作成されます。発火点はIntent成立後の最初の`next`であり、最初の業務stage開始より前です。このboundaryはscopeに依存しません。Ideationを SKIP するscopeでも、Intent Captureを実行するscopeと同じ時点でIssueが作成されます。

boundaryが決着するのは、receiptが`completed`のとき、または試行が一度も記録されないままIssueが既に存在するときです。この場合、後続のIntent Captureやphase boundaryは2件目を作らずsyncします。**Issueが記録済みでも、receiptが`pending`のままなら決着しません。** 開始したが完了しなかった試行はreceiptが完了するまで再発行され、issue numberが記録済みであるため再試行は`sync`へ解決されます(2件目のcreateにはなりません)。

`auto`専用なのは初回発火だけです。`pending` receiptは`prompt`でも再発行されます — pending phase receiptと同じ扱いであり、開始済みの操作を未決のまま残すかどうかはmodeの選択で決めるべき事項ではないためです。`off`は両方とも抑止します。

<!-- amadeus-topic:completion -->
<!-- amadeus-contract:completion {"completionOrder":["create","sync","close"]} -->
## Completion

completionはcreate、final sync、closeの順です。失敗時はchainを止めますがworkflow進行は止めません。

<!-- amadeus-topic:failure -->
<!-- amadeus-contract:failure {"workflowMayAdvance":true,"retry":"next-eligible-boundary-or-explicit-manual-command"} -->
## 失敗とretry

statusを確認し、次のeligible boundaryまたは明示manual commandでretryします。outcome-unknownは次のmutation前にreconcileします。

<!-- amadeus-topic:safety -->
<!-- amadeus-contract:safety {"closeGuards":["verified-provenance","matching-repository","workflow-landed","final-sync-succeeded"]} -->
## Safety

closeにはverified provenance、同一repository、workflow landed、final sync成功が必要です。repairには一度限りのexact phrase challengeが必要です。

<!-- amadeus-topic:cli -->
<!-- amadeus-contract:cli {"commands":[{"path":["boundary","intent-initialized"],"requiredOptions":["--instance"],"optionalOptions":["--repo","--space","--intent","--project-dir"],"positionalArguments":"forbidden"},{"path":["boundary","intent-capture"],"requiredOptions":["--instance"],"optionalOptions":["--repo","--space","--intent","--project-dir"],"positionalArguments":"forbidden"},{"path":["boundary","phase"],"requiredOptions":["--instance","--phase"],"optionalOptions":["--repo","--space","--intent","--project-dir"],"positionalArguments":"forbidden"},{"path":["boundary","park"],"requiredOptions":["--instance","--stage"],"optionalOptions":["--repo","--space","--intent","--project-dir"],"positionalArguments":"forbidden"},{"path":["boundary","completion"],"requiredOptions":["--instance"],"optionalOptions":["--repo","--space","--intent","--project-dir"],"positionalArguments":"forbidden"},{"path":["manual","create"],"requiredOptions":["--instance"],"optionalOptions":["--repo","--space","--intent","--project-dir"],"positionalArguments":"forbidden"},{"path":["manual","sync"],"requiredOptions":["--instance"],"optionalOptions":["--repo","--space","--intent","--project-dir"],"positionalArguments":"forbidden"},{"path":["manual","close"],"requiredOptions":["--instance"],"optionalOptions":["--repo","--space","--intent","--project-dir"],"positionalArguments":"forbidden"},{"path":["repair","status"],"requiredOptions":[],"optionalOptions":["--repo","--space","--intent","--project-dir"],"positionalArguments":"forbidden","mutatesRemote":false},{"path":["repair","relink"],"requiredOptions":["--issue"],"optionalOptions":["--repo","--space","--intent","--project-dir"],"positionalArguments":"forbidden","mutatesRemote":false},{"path":["repair","abandon"],"requiredOptions":["--operation"],"optionalOptions":["--repo","--space","--intent","--project-dir"],"positionalArguments":"forbidden","mutatesRemote":false}],"selectorDefaults":{"space":"active-space","intent":"active-intent"},"positionalArguments":"forbidden"} -->
## CLI

`repair status`、`repair relink --issue <n>`、`repair abandon --operation <id>`を使います。selectorはoptionで渡し、positional argumentは禁止です。

<!-- amadeus-topic:scope -->
<!-- amadeus-contract:scope {"scopeExclusions":["pull-request","release","deploy","daemon","polling"]} -->
## 対象外

Pull Request、release、deploy、daemon、pollingはIntent Mirrorの対象外です。

<!-- amadeus-topic:projects -->
<!-- amadeus-contract:projects {"key":"mirror-projects","shape":"array of { project: \"<owner>/<number>\", phase-field?: string, status-names?: { <phase>: string } }","phaseKeys":["ideation","inception","construction","operation","done"],"layerResolution":"last-layer-with-a-value-replaces","independentOf":"auto-mirror","phaseField":{"key":"phase-field","default":"Intent Phase"},"authoritativeField":"phase-field","auxiliaryStatus":{"field":"Status","active":"In progress","complete":"Done","parked":"keep","archived":"keep","failureMode":"non-blocking"}} -->
## Project board

`mirror-projects`は、このIntentが同期するGitHub Project boardを列挙します。各要素は`project: "<owner>/<number>"`でboardを1件指定し、任意の`phase-field`でライフサイクル用single-select field名を、`status-names`でphaseキーからoption名への上書きを指定できます。`phase-field`の既定値は`Intent Phase`です。phaseキーは`ideation`、`inception`、`construction`、`operation`、`done`で、未知のキーは無視せずエラーにします。

```json
{
  "mirror-projects": [
    { "project": "acme/7" },
    {
      "project": "acme/12",
      "phase-field": "Lifecycle",
      "status-names": { "construction": "In Progress" }
    }
  ]
}
```

このキーは層ごとに解決され、値を持つ最後の層が前の層のリストへマージせず全置換します。したがってSpaceやIntentの層では、対象boardの完全な集合を書きます。`mirror-projects`は`auto-mirror`とは独立です — モードは操作を実行するかどうかを決め、このキーはその操作がどのboardへ及ぶかを決めます。

Lifecycleの正本値は`phase-field`が指すsingle-select（既定値`Intent Phase`）へ書き込みます。標準の`Status`は補助同期であり、進行中Intentは`In progress`、完了Intentは`Done`へ移し、parkedまたはarchived中は現在値を維持します。補助Statusのfield・option不足や更新失敗は、ライフサイクルfieldのreconcileやIssue closeを阻害しません。

<!-- amadeus-topic:auth -->
<!-- amadeus-contract:auth {"scope":"project","credentialStore":"gh","automaticScopeChange":false} -->
## Project boardの認証

boardの設定済みライフサイクルfieldと補助Status fieldの読取・option設定はGraphQLのProjectV2 API経由で行うため、Issue自体に必要な権限に加えて`project` token scopeが必要です。credentialは`gh`とそのcredential storeに委譲され、Intent Mirrorはtoken値を読まず、scopeを変更せず、代理で再認証もしません。scope付与はこのツールの外で人間が行う操作です(例: `gh auth refresh -s project`)。

<!-- amadeus-topic:diagnostics -->
<!-- amadeus-contract:diagnostics {"command":["repair","status"],"resolutions":["resolved","field-missing","option-missing","permission-denied"],"availableOptionsOn":"option-missing","mutatesRemote":false} -->
## Project同期の診断

`repair status`は、board 1件につきread-onlyの行を1つ報告します。対象は設定が指すboard、ledgerが既に記録しているboard、そしてIssueが現在所属しているboardの全数です。各行は、Issueがboard上にあるか、現在のcolumn、workflowが期待するcolumn、その2つがdriftしているか、および次の4値のいずれかのresolutionを示します。

- `resolved` — 期待するcolumnへ到達可能で、行は観測結果のみを示します。
- `field-missing` — boardの`phase-field`が指すfieldを読み取れず、columnを適用できません。
- `option-missing` — 期待する名前と完全一致(大文字小文字・空白を含む)するoptionを設定済みライフサイクルfieldが宣言していません。boardが実際に持つoption名は`availableOptions`として一覧されるため、boardへoptionを追加するか、`status-names`の上書きで当該phaseを既存optionへ対応付けます。
- `permission-denied` — 使用中のcredentialではそのboardの設定済みライフサイクルfieldを読めません。`project` scopeを付与してから`repair status`を再実行します。

各行には、board名・column名・解決手順を述べる要約文が付きます。この文にtokenや生のAPIレスポンスは入りません。`repair status`は観測のみで、ローカルにもリモートにも変更を加えません — driftしたboardは報告されるだけで記録されません。

Project関連の操作は`gh`サブプロセスをargument arrayで起動して実行し、shell文字列を組み立てません。`gh`が不在・未認証・rate limit・その他の失敗のときは、当該mirror操作をloudに失敗させ、AI-DLC workflow自体は停止しません。retryは次のeligible boundaryか、明示のmanual commandで行います。一部のboardだけ同期して他が失敗したboundaryでは、board単位のledger entry(`synced`、retry可能な失敗の`pending`、boardの形状や権限が人手を要する`safety-blocked`)が残るため、部分成功は単一の判定へ潰されずboard単位で見えます。
