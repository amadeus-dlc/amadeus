# Reliability Requirements — mirror-github-gateway

> 上流入力（consumes 全数）: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`

## Outcome Reliability

| ID | Requirement | Verification |
|---|---|---|
| REL-GW-01 | 全callは`ok | failure`のtyped outcomeを返し、throw／emptyへsilent変換しない | operation matrix |
| REL-GW-02 | failureはclassification、retryable、effect、fixed summaryを必須にする | exhaustive union test |
| REL-GW-03 | spawn／readiness前failureは`not-started` | failure injection |
| REL-GW-04 | mutation process開始後の4xx／exit非0／timeout／reset／5xx／parse不能はすべて`outcome-unknown` | HTTP／post-start fixture |
| REL-GW-05 | mutationで`no-effect-confirmed`を返さない | exhaustive outcome test |
| REL-GW-06 | read-only failureは`no-effect-confirmed` | readiness／find／view test |
| REL-GW-07 | findは全page成功時だけ0／1／複数candidateを返す | pagination test |
| REL-GW-08 | response repository不一致は`invalid-response`でfail closed | cross-repo fixture |

## Fault Tolerance and Recovery

- Gateway内部でsilent retryしない。C6がreceipt、effect、candidate／remote viewを基に再実行可否を決める。
- `outcome-unknown` createはmarker候補1件の検証成功以外で再createしない。
- `outcome-unknown` edit／closeはremote viewで未収束を確認し、CAS claimしたcallerだけが同じIssueへretryする。
- Gateway failureはAI-DLC stage／phase遷移を停止せず、pending／safety-blocked warningへ投影される。
- readiness成功後だけattemptedへ進め、attempted永続化成功後だけremote mutationする。

## Gateway Observation Contract

Gateway outcomeはoperation、repository canonical、Issue number、classification、effect、retryable、numeric exit／HTTP、process phase／timeout／terminationをC6へ渡す。raw stdout／stderrは渡さない。本Unitのintegration testはこのDTOまでを所有する。C6→C3のreceipt／auditとC8 status／warningはLifecycle Unitの統合検証責任であり、Gateway acceptanceへ含めない。

## Process Termination

- runnerは`shell:false`で直接`gh` childを起動する。POSIXでは`detached:true`で専用process groupを生成し、positive PIDをPGIDとして保持する。group生成／PID取得失敗は`not-started`とする。
- deadline時はPOSIXで保持済みPGIDへSIGTERM、1秒後に残存していればSIGKILLを送る。Windowsでは`taskkill /PID <pid> /T /F`をargument arrayで実行する。
- termination完了を待ってからtyped timeout outcomeを返し、60秒以内のpollでchild／descendant残存0件を検証する。
- termination自体の失敗は成功を返さない。readiness／find／viewでは`command + no-effect-confirmed`、create／edit／closeでは`command + outcome-unknown`に固定する。
- leaderが先にreapされgroup存続を安全に同定できないcaseは、再利用PGIDへsignalせず5秒以内に`termination-failed + residualDescendantPossible`へsettleする。このfailure pathを残存0件の通常成功条件へ含めず、自動retryしない。

## Availability and Recovery Targets

- GitHub unavailable時のAI-DLC workflow継続率: failure injection全caseで100%。
- 誤repository mutation、duplicate create、provenance不一致close: test suite全caseで0件。
- Gatewayは永続dataを所有しないためRPO／backupは非適用。recovery sourceはIntent receiptとremote Issue markerである。

## Acceptance

1. failure classification優先順位を全組合せfixtureで固定する。
2. remote outcome不明を通常retryへ変換しない。
3. failure outcomeが必要fieldを全て持ち、raw diagnosticを含まない。
4. 通常deadline fixture後にchild／descendant processが0件である。leader-first-exit fixtureは5秒以内に`termination-failed`となり、reap後のsignalが0件である。
