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
