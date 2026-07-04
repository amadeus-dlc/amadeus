# Business Logic Model: U002-subagent-status-audit

## 上流文脈

この business-logic-model は、`unit-of-work`、`unit-of-work-story-map`、`requirements`、`components`、`component-methods`、`services` を入力として作成する。

U002 は `unit-of-work` の `U002-subagent-status-audit` に対応する。

`unit-of-work-story-map` では US004 と US008 を主対象とし、US006、US007、US009 の evidence source を作る。

`requirements` では R004、R007、R008、R009、NFR004、NFR005 を扱う。

`components` では Shared Contracts、Error Audit、Subagent Status を使う。

`component-methods` では Subagent Status Methods と Error Audit Methods を使う。

`services` では Evidence Recording Service を中心に使う。

## 処理モデル

U002 の処理は、subagent hook payload から trustworthy status field を取り出し、success、failure、unknown を分類する。

trustworthy status field は `hook_event_name` が `SubagentStop` である payload の top-level `subagent_status` または top-level `status` だけを対象にする。

`tool_input.status` は tool hook の状態を表す可能性があるため、Subagent outcome の trusted source にはしない。

trustworthy status field が存在し、値が allowlist に含まれる場合だけ success または failure にする。

trustworthy status field が存在しない場合、message text や transcript の文面から推測しない。

分類結果は `SubagentOutcome` として `SUBAGENT_COMPLETED` の additive field に入れる。

既存 row に outcome field がない場合は、old row compatibility として valid unknown に変換する。

U002 は U001 の Shared Contracts と Error Audit adapter contract を使う。

U002 は Verification Traceability を呼ばない。

U003 は U002 の evidence を後で read-only に読む。

audit append failure は `AuditWriteResult.failed` として扱い、Subagent Status component は `.aidlc-hooks-health/*.drops` へ書き込まない。

hook wrapper が既存の hook health surface に失敗を記録する場合でも、それは Subagent Status の domain rule ではなく hook 実行基盤の副作用である。

## 処理順序

| Step | Input | Component | Output |
|---|---|---|---|
| 1 | hook payload | Subagent Status | trusted status source の有無 |
| 2 | trusted status source | Subagent Status | `SubagentOutcome` |
| 3 | outcome、agent type、agent id、message excerpt | Subagent Status | additive audit fields |
| 4 | audit fields | Evidence Recording Service | `SUBAGENT_COMPLETED` audit row |
| 5 | old or new audit row | Subagent Status | normalized outcome |
| 6 | normalized outcome | Doctor Diagnostic Service | `DiagnosticFinding` |

## 判断木

| Condition | Decision | Result |
|---|---|---|
| payload に trustworthy success status がある | `success` に分類する | success evidence を audit に残す |
| payload に trustworthy failure status がある | `failure` に分類する | failure evidence を audit に残す |
| payload に trustworthy status がない | `unknown` に分類する | free text 推測を避ける |
| old audit row に outcome がない | normalized unknown として読む | 既存 row が壊れない |
| audit append が失敗する | `AuditWriteResult.failed` を返す | Subagent Status は `.drops` へ書かず、hook は workflow を crash させない |

## Data Transformation

hook payload は `SubagentHookPayload` に変換する。

`SubagentHookPayload` は `statusSource` と `messageExcerpt` に分ける。

`statusSource` が trustworthy の場合、`SubagentOutcome` は success または failure になる。

`statusSource` が missing または untrusted の場合、`SubagentOutcome` は unknown になる。

success の正規化対象は `success`、`succeeded`、`ok`、`completed` とする。

failure の正規化対象は `failure`、`failed`、`error`、`errored`、`cancelled`、`timeout` とする。

`SubagentOutcome` は `SubagentAuditFields` に変換される。

`SubagentAuditFields` は `SUBAGENT_COMPLETED` の additive field として append-only audit に渡される。

stdout JSON command と同じ process で hook が動く場合でも、Subagent Status は stdout に診断文を出さない。

old row と new row は `NormalizedSubagentOutcome` に変換され、downstream analysis が同じ shape で読める。

## Integration Points

Subagent Status は `SUBAGENT_COMPLETED` の event 名を維持する。

Subagent Status は Shared Contracts の outcome enum と evidence ref を使う。

Evidence Recording Service は audit append を担当する。

Doctor Diagnostic Service は outcome summary を表示できる。

Verification Traceability は U002 の audit evidence を read-only に読む。

## Review

Verdict: READY

Reviewer: aidlc-architecture-reviewer-agent

success、failure、unknown の分類基準は実装者が迷わない粒度で定義されている。

既存 audit row compatibility と event 名維持が明示されている。

Iteration: 2

U002 の stdout JSON 検証条件、audit append failure の責務境界、trustworthy status field allowlist は補正済みである。

Subagent Status は `AuditWriteResult.failed` を返すだけで、Hook Drop Doctor の `.drops` contract を所有しない。

U002 は U001 の Shared Contracts と Error Audit evidence path に依存し、U003 は U002 evidence を read-only に読むため、Unit DAG と矛盾しない。
