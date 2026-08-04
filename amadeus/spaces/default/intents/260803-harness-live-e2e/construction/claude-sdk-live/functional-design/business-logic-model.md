# Business Logic Model — claude-sdk-live

入力参照: `unit-of-work`、`unit-of-work-story-map`、`requirements`、`components`、`component-methods`、`services`。U04は既存Claude Agent SDK driverをC3 adapterへ包み、Claude family seamと共通lifecycleへ接続する。

## Capability and Completion Workflow

1. C2が`AMADEUS_CLAUDE_SDK_LIVE === "1"`とGHA hard denyを評価する。
2. C5 preflightがSDK dependency/version、`dist/claude`、project-only setting source、auth lease、structured event/result、abort capabilityを実測する。
3. 必須capability成立時は`SupportedSdkCapability`を返し、C4 scratchとClaude family settingsを準備する。
4. C5はSDK driverをadapter-owned child workerで実行し、既存`driveAidlc`相当のdriverへexplicit cwd、project settings、allow-listed env、AbortSignalを渡す。childだけがSDK client/sessionとstreamを所有する。
5. C6のliteral promptは`echo ok`。terminal eventはexactly one、`type=result`、`subtype=success`、`is_error=false`、`num_turns>=1`、permission denial 0を要し、terminalより後のeventとduplicate terminalを拒否する。加えてtool resultまたはassistant textの非空byte evidenceを1件以上要するが、prose内容はassertしない。
6. parent deadline 90秒でchildへabort、10秒grace後も未終端ならSIGTERM、5秒後SIGKILL、さらに5秒以内にreapする。abort generationを閉じた後のIPC/eventは破棄し、child死後にcleanup/leak scanへ進む。
7. durable live greenならledger/matrixへ記録する。capability不成立なら実測結果、阻害要因、推奨seam、独立ACを含む`UnsupportedEvidencePackage`を作り、registry/matrixへIssue linkを記録する。

## Supported Branch

- SDK固有event streamとpartial resultはadapter内で`AdapterExecution`へnormalizeする。
- model sessionは1〜数prompt、serial、retry既定0。
- user/local settingsとhooksは読み込まず、source auth/config pathをSDK optionsへ渡さない。
- cleanup/leak/ledger failureはSDK successを上書きする。
- deadlineより先に唯一のterminal successが確定した場合だけsuccess。deadline/abortが先なら遅延successを無視してtimeout、cleanup/leak failureがあればexecution failureへ昇格する。

## Unsupported Branch

`CAPABILITY_UNSUPPORTED`だけでは完了しない。probe command/version、観測値、再現手順、阻害したSDK seam、推奨する最小interface、検証可能なAC、作成済みIssue linkが揃った場合だけclosureとなる。dormant adapterやTBDは禁止する。

## Result Mapping

| SDK observation | Common result |
|---|---|
| gate/preflight不足 | canonical skip |
| structured final success + anchors | success |
| SDK error/result error | execution failure |
| deadline + abort完了 | timeout |
| partial resultだけでterminalなし | execution failure |
| anchor mismatch | assertion failure |
| capability seam不成立 | unsupported evidence branch |

## Verification

U02 kitでstrict opt-in、GHA、env/settings、abort/partial result、cleanupをfake SDK streamへ注入する。supported branchはminimal live receipt、unsupported branchはevidence package+Issue+matrixのnon-empty closureを検証する。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T14:39:25Z
- **Iteration:** 1
- **Scope decision:** none

参照IDと依存関係は整合しているが、AbortSignal無視時の有界終端契約と、C6の具体的な決定的アンカーが未定義であり、安全な実装を一意に導けない。

### Findings

- BLOCKER | SDK driverがAbortSignalを無視する場合の有界終端契約がない。fake SDK streamをabort後も未解決にすれば、partial result採取・driver終端・cleanupへ進めず、FR-5のcleanup保証とFR-6の明示timeoutを再現可能に違反する。abort猶予、execute promiseの打切り方法、資源所有権、遅延eventの破棄、最終結果の優先順位を定義する必要がある。
- BLOCKER | ClaudeSdkJourneyはtool/state/audit/final-resultを抽象的に列挙するだけで、実行する最小prompt、期待event schema、anchor値、順序条件、欠落・重複時の判定を定義していない。任意の構造化eventを成功扱いでき、U04の構造化anchor/assertionとFR-6の決定的アンカーを実装・試験できない。具体的なjourneyと各assertionをclosed contractとして定義する必要がある。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T14:43:54Z
- **Iteration:** 2
- **Scope decision:** none

Iteration 1の2件は解消された。SDK所有権をchild workerへ隔離し、abort・TERM・KILL・reapの有界終端と遅延event破棄が定義された。C6もliteral prompt、terminal schema、順序・重複・permission denial・非空evidence条件まで具体化され、実装・試験可能である。

### Findings

- None
