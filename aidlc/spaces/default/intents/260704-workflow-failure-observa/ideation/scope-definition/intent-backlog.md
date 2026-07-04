# Intent Backlog

## Upstream Context

この backlog は、`intent-statement`、`feasibility-assessment`、`constraint-register` を上流成果物として読む。

対象 Issue は #431、#432、#433、#435 である。
OpenTelemetry core 計装は、Scope Definition の回答により MVP scope に含める。
collector、dashboard、常時ネットワーク送信は backlog 外の後続拡張として扱う。

## Prioritization Method

scope 境界は MoSCoW で決める。
build order は WSJF で補正する。

WSJF は相対値で扱う。
`Cost of Delay` は business value、time criticality、risk reduction の合計である。
`Job Size` は相対実装量である。

## Backlog Summary

| Unit | Title | MoSCoW | WSJF | Issue |
|---|---|---:|---:|---|
| U001 | engine-error-audit | Must | 5.0 | #431 |
| U002 | hook-drop-doctor | Must | 6.5 | #432 |
| U005 | otel-core-instrumentation | Must | 3.5 | Scope Definition correction |
| U003 | subagent-status-evidence | Must | 3.7 | #433 |
| U004 | conductor-independent-warning | Must | 3.0 | #435 |
| U006 | verification-and-boundary-guard | Must | 4.7 | Cross-cutting |

U001、U002、U005 を walking skeleton に束ねる。
理由は、失敗が audit に残り、doctor に表示され、OpenTelemetry の no-op default 計装で trace 可能になる最小の縦断経路だからである。

## Proto-Units

### U001-engine-error-audit

| Field | Value |
|---|---|
| Source | #431 |
| MoSCoW | Must |
| WSJF | 5.0 |
| User Value | engine error が audit と trace の両方から追跡できる。 |
| Scope | `aidlc-orchestrate.ts` の error directive と top-level catch を扱う。 |
| Acceptance Evidence | `ERROR_LOGGED` または既存 taxonomy に沿った failure evidence、stdout JSON 契約 test、OpenTelemetry error span test。 |
| Dependencies | U005 |
| Notes | audit 書き込みは best-effort とし、stdout に余計な文字を出さない。 |

### U002-hook-drop-doctor

| Field | Value |
|---|---|
| Source | #432 |
| MoSCoW | Must |
| WSJF | 6.5 |
| User Value | hook drop が doctor で表面化し、運用者が静かな失敗を確認できる。 |
| Scope | `.aidlc-hooks-health/*.drops` を読み、hook 名、件数、最新時刻、最新理由を表示する。 |
| Acceptance Evidence | doctor fixture、drop file parsing test、doctor metrics test。 |
| Dependencies | U005 |
| Notes | retention、clear、dashboard は scope out とする。 |

### U003-subagent-status-evidence

| Field | Value |
|---|---|
| Source | #433 |
| MoSCoW | Must |
| WSJF | 3.7 |
| User Value | subagent 完了結果が成功か失敗かを後から判断できる。 |
| Scope | hook input に信頼できる status があるかを確認し、ある場合は `SUBAGENT_COMPLETED` に `Status` を追加する。 |
| Acceptance Evidence | hook payload fixture、audit field test、区別不能時の decision artifact。 |
| Dependencies | U005、U006 |
| Notes | `Message` の文言から status を推測しない。 |

### U004-conductor-independent-warning

| Field | Value |
|---|---|
| Source | #435 |
| MoSCoW | Must |
| WSJF | 3.0 |
| User Value | conductor の自己申告がなくても、実行逸脱の疑いを検出できる。 |
| Scope | run-stage と report の不整合、in-flight stage、runtime graph と audit の矛盾を warning として表面化する。 |
| Acceptance Evidence | doctor warning fixture、audit/runtime mismatch fixture、OpenTelemetry warning metric test。 |
| Dependencies | U005、U006 |
| Notes | 初期実装では hard error 化しない。 |

### U005-otel-core-instrumentation

| Field | Value |
|---|---|
| Source | Scope Definition correction |
| MoSCoW | Must |
| WSJF | 3.5 |
| User Value | audit と doctor だけでは見えにくい横断分析の入口を作る。 |
| Scope | `.agents/aidlc/tools` の command span、error span、directive/report span、doctor metrics を no-op default で実装する。 |
| Acceptance Evidence | no-op default test、環境変数未設定時の非送信 test、span/metric boundary test。 |
| Dependencies | none |
| Notes | collector、dashboard、常時ネットワーク送信は scope out とする。 |

### U006-verification-and-boundary-guard

| Field | Value |
|---|---|
| Source | `constraint-register` |
| MoSCoW | Must |
| WSJF | 4.7 |
| User Value | 実装が配布物境界、parity lock、audit 互換、PR 前検証を壊していないことを確認できる。 |
| Scope | validator、`npm run test:all`、parity check、stdout JSON 契約、`.coderabbit.yml` 非変更、`skills/` 直接編集なしを確認する。 |
| Acceptance Evidence | validator pass、standard test result、git diff review、PR 説明。 |
| Dependencies | U001、U002、U003、U004、U005 |
| Notes | `engineFileExceptions` を増やす場合は人間承認を必要とする。 |

## Build Order

| Order | Unit | Rationale |
|---:|---|---|
| 1 | U005-otel-core-instrumentation | no-op default の横断基盤を先に作ると、後続 Unit が同じ計装境界を使える。 |
| 2 | U001-engine-error-audit | engine error は workflow failure evidence の起点である。 |
| 3 | U002-hook-drop-doctor | doctor 表示を早く作ると、local evidence の確認経路ができる。 |
| 4 | U003-subagent-status-evidence | hook payload の信頼性を確認し、推測実装を避ける。 |
| 5 | U004-conductor-independent-warning | warning 対象が過検出にならないよう、audit、doctor、OTel 境界が見えた後に実装する。 |
| 6 | U006-verification-and-boundary-guard | 全 Unit の証拠を束ね、PR 準備条件を満たす。 |

## Walking Skeleton

walking skeleton は U005、U001、U002 を束ねる。

この skeleton の完了条件は次である。

| Condition | Evidence |
|---|---|
| error directive または未捕捉例外が audit evidence に残る。 | U001 の deterministic test。 |
| hook drop が doctor に表示される。 | U002 の doctor fixture。 |
| command span、error span、doctor metrics の境界が no-op default で test できる。 | U005 の no-op default test。 |
| stdout JSON 契約が維持される。 | U001 の stdout contract test。 |

## Value Stream Trace

| Step | Artifact or Evidence |
|---|---|
| Issue identifies failure gap | #431、#432、#433、#435 |
| Intent frames the problem | `intent-statement` |
| Feasibility constrains delivery | `feasibility-assessment`、`constraint-register` |
| Scope defines MVP boundary | `scope-document` |
| Backlog defines proto-Units | `intent-backlog` |
| Inception derives requirements and Units | Requirements Analysis、Units Generation |
| Construction implements and tests | Unit tests、e2e or eval fixtures、validator、`npm run test:all` |
| PR communicates evidence | 日本語 PR 説明、Issue links、Intent path、検証結果 |

## Deferred Opportunities

| Opportunity | Status | Future Handling |
|---|---|---|
| OpenTelemetry collector | Deferred | core 計装が merge された後、endpoint、auth、retention、failure mode を別 Intent で設計する。 |
| OpenTelemetry dashboard | Deferred | collector と metrics schema が確定した後に扱う。 |
| hard error 化 of conductor warning | Deferred | warning の false positive を観察してから判断する。 |
| hook drop retention and clear | Deferred | doctor 表示の初期価値を確認してから扱う。 |
