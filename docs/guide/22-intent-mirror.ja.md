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
<!-- amadeus-contract:boundaries {"boundaries":["intent-capture-approved","phase-verified","parked","workflow-completed","manual"]} -->
## Boundary

自動化はIntent Capture承認、phase検証、park、completion、明示manual invocationに限定されます。daemon／pollingはありません。

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
<!-- amadeus-contract:cli {"commands":[{"path":["boundary","intent-capture"],"requiredOptions":["--instance"],"optionalOptions":["--repo","--space","--intent","--project-dir"],"positionalArguments":"forbidden"},{"path":["boundary","phase"],"requiredOptions":["--instance","--phase"],"optionalOptions":["--repo","--space","--intent","--project-dir"],"positionalArguments":"forbidden"},{"path":["boundary","park"],"requiredOptions":["--instance","--stage"],"optionalOptions":["--repo","--space","--intent","--project-dir"],"positionalArguments":"forbidden"},{"path":["boundary","completion"],"requiredOptions":["--instance"],"optionalOptions":["--repo","--space","--intent","--project-dir"],"positionalArguments":"forbidden"},{"path":["manual","create"],"requiredOptions":["--instance"],"optionalOptions":["--repo","--space","--intent","--project-dir"],"positionalArguments":"forbidden"},{"path":["manual","sync"],"requiredOptions":["--instance"],"optionalOptions":["--repo","--space","--intent","--project-dir"],"positionalArguments":"forbidden"},{"path":["manual","close"],"requiredOptions":["--instance"],"optionalOptions":["--repo","--space","--intent","--project-dir"],"positionalArguments":"forbidden"},{"path":["repair","status"],"requiredOptions":[],"optionalOptions":["--repo","--space","--intent","--project-dir"],"positionalArguments":"forbidden","mutatesRemote":false},{"path":["repair","relink"],"requiredOptions":["--issue"],"optionalOptions":["--repo","--space","--intent","--project-dir"],"positionalArguments":"forbidden","mutatesRemote":false},{"path":["repair","abandon"],"requiredOptions":["--operation"],"optionalOptions":["--repo","--space","--intent","--project-dir"],"positionalArguments":"forbidden","mutatesRemote":false}],"selectorDefaults":{"space":"active-space","intent":"active-intent"},"positionalArguments":"forbidden"} -->
## CLI

`repair status`、`repair relink --issue <n>`、`repair abandon --operation <id>`を使います。selectorはoptionで渡し、positional argumentは禁止です。

<!-- amadeus-topic:scope -->
<!-- amadeus-contract:scope {"scopeExclusions":["pull-request","release","deploy","daemon","polling"]} -->
## 対象外

Pull Request、release、deploy、daemon、pollingはIntent Mirrorの対象外です。

<!-- amadeus-topic:projects -->
<!-- amadeus-contract:projects {"key":"mirror-projects","shape":"array of { project: \"<owner>/<number>\", status-names?: { <phase>: string } }","phaseKeys":["ideation","inception","construction","operation","done"],"layerResolution":"last-layer-with-a-value-replaces","independentOf":"auto-mirror"} -->
## Project board

`mirror-projects`は、このIntentが同期するGitHub Project boardを列挙します。各要素は`project: "<owner>/<number>"`でboardを1件指定し、任意で`status-names`によりphaseキーからそのboardのcolumn名への上書きを持てます。phaseキーは`ideation`、`inception`、`construction`、`operation`、`done`で、未知のキーは無視せずエラーにします。

```json
{
  "mirror-projects": [
    { "project": "acme/7" },
    { "project": "acme/12", "status-names": { "construction": "In Progress" } }
  ]
}
```

このキーは層ごとに解決され、値を持つ最後の層が前の層のリストへマージせず全置換します。したがってSpaceやIntentの層では、対象boardの完全な集合を書きます。`mirror-projects`は`auto-mirror`とは独立です — モードは操作を実行するかどうかを決め、このキーはその操作がどのboardへ及ぶかを決めます。

<!-- amadeus-topic:auth -->
<!-- amadeus-contract:auth {"scope":"project","credentialStore":"gh","automaticScopeChange":false} -->
## Project boardの認証

boardのStatus fieldの読取もcolumnの設定もGraphQLのProjectV2 API経由で行うため、Issue自体に必要な権限に加えて`project` token scopeが必要です。credentialは`gh`とそのcredential storeに委譲され、Intent Mirrorはtoken値を読まず、scopeを変更せず、代理で再認証もしません。scope付与はこのツールの外で人間が行う操作です(例: `gh auth refresh -s project`)。

<!-- amadeus-topic:diagnostics -->
<!-- amadeus-contract:diagnostics {"command":["repair","status"],"resolutions":["resolved","field-missing","option-missing","permission-denied"],"availableOptionsOn":"option-missing","mutatesRemote":false} -->
## Project同期の診断

`repair status`は、board 1件につきread-onlyの行を1つ報告します。対象は設定が指すboard、ledgerが既に記録しているboard、そしてIssueが現在所属しているboardの全数です。各行は、Issueがboard上にあるか、現在のcolumn、workflowが期待するcolumn、その2つがdriftしているか、および次の4値のいずれかのresolutionを示します。

- `resolved` — 期待するcolumnへ到達可能で、行は観測結果のみを示します。
- `field-missing` — boardのStatus fieldを読み取れず、columnを適用できません。
- `option-missing` — 期待する名前と完全一致(大文字小文字・空白を含む)するStatus optionをboardが宣言していません。boardが実際に持つoption名は`availableOptions`として一覧されるため、boardへoptionを追加するか、`status-names`の上書きで当該phaseを既存optionへ対応付けます。
- `permission-denied` — 使用中のcredentialではそのboardのStatus fieldを読めません。`project` scopeを付与してから`repair status`を再実行します。

各行には、board名・column名・解決手順を述べる要約文が付きます。この文にtokenや生のAPIレスポンスは入りません。`repair status`は観測のみで、ローカルにもリモートにも変更を加えません — driftしたboardは報告されるだけで記録されません。

Project関連の操作は`gh`サブプロセスをargument arrayで起動して実行し、shell文字列を組み立てません。`gh`が不在・未認証・rate limit・その他の失敗のときは、当該mirror操作をloudに失敗させ、AI-DLC workflow自体は停止しません。retryは次のeligible boundaryか、明示のmanual commandで行います。一部のboardだけ同期して他が失敗したboundaryでは、board単位のledger entry(`synced`、retry可能な失敗の`pending`、boardの形状や権限が人手を要する`safety-blocked`)が残るため、部分成功は単一の判定へ潰されずboard単位で見えます。
