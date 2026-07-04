# Business Logic Model: U001-failure-evidence-foundation

## 上流文脈

この business-logic-model は、`unit-of-work`、`unit-of-work-story-map`、`requirements`、`components`、`component-methods`、`services` を入力として作成する。

U001 は `unit-of-work` の `U001-failure-evidence-foundation` に対応する。

`unit-of-work-story-map` では US001、US002、US003 を主対象とし、US006、US007、US008、US009 の evidence source を作る。

`requirements` では R001、R002、R003、R007、R008、R009、NFR001、NFR002、NFR003、NFR004、NFR005、NFR006 を扱う。

`components` では Shared Contracts、Error Audit、Hook Drop Doctor、Telemetry Core、Doctor Composition を使う。

`component-methods` では Error Audit Methods、Hook Drop Doctor Methods、Telemetry Core Methods、Doctor Composition Methods を使う。

`services` では AI-DLC CLI Tooling Service、Evidence Recording Service、Doctor Diagnostic Service、Telemetry Core Service を使う。

## 処理モデル

U001 の処理は、command execution、error evidence、doctor evidence、OpenTelemetry core 計装を同じ縦断 slice で扱う。

最初に command が実行される。

command は `TelemetryFacade` を作り、default no-op の `TelemetryScope` を開始する。

次に command の本体が directive または report を生成する。

directive が error である場合は、Error Audit adapter が `ERROR_LOGGED` の fields を作る。

top-level catch に到達した場合も、Error Audit adapter が同じ `ERROR_LOGGED` contract で fields を作る。

audit への append が失敗した場合は、再帰的な audit 追加を試みない。

stdout JSON 契約を持つ command は、診断文を stdout に出さない。

doctor 実行時は `.aidlc-hooks-health/*.drops` を読み、hook name、drop count、latest timestamp、latest reason に集約する。

malformed drop entry は throw ではなく warning finding に変換する。

doctor は diagnostic findings を組み立て、標準表示と verbose detail を分ける。

Telemetry Core は command span、error span、directive/report span、doctor metrics を facade 経由で記録する。

exporter が明示設定されない場合、network export は行わない。

## 処理順序

| Step | Input | Component | Output |
|---|---|---|---|
| 1 | command name、stage、Intent ref | Telemetry Core | `TelemetryScope` |
| 2 | directive/report result | AI-DLC CLI Tooling Service | stdout JSON または human-readable output |
| 3 | error directive | Error Audit | `ERROR_LOGGED` audit fields |
| 4 | caught error | Error Audit | `ERROR_LOGGED` audit fields |
| 5 | `.aidlc-hooks-health/*.drops` | Hook Drop Doctor | `HookDropSummary[]` |
| 6 | summaries、warnings | Doctor Composition | `DoctorOutputModel` |
| 7 | warning count、hook drop count | Telemetry Core | doctor metrics |

## 判断木

| Condition | Decision | Result |
|---|---|---|
| active workflow がある | audit に `ERROR_LOGGED` を append する | error evidence が Intent record に残る |
| active workflow がない | no-op result にする | command の既存 error behavior を維持する |
| stdout JSON command である | stdout は JSON 専用にする | diagnostics は stdout に混ぜない |
| telemetry exporter 未設定 | no-op facade を使う | network export は発生しない |
| `.drops` directory がない | empty summary とする | doctor は warning なしで続行する |
| `.drops` entry が malformed | warning finding に変換する | doctor は crash しない |
| audit write failure が起きる | 再帰記録しない | 元の error envelope を維持する |

## Data Transformation

`caught error` は `ErrorEvidence` に変換する。

`ErrorEvidence` は tool name、command context、human-readable error detail、optional stage、optional Intent ref を持つ。

`ErrorEvidence` は `AuditFields` に変換され、`ERROR_LOGGED` として append-only audit に渡される。

`.drops` の 1 行は `HookDropEntry` に変換する。

`HookDropEntry[]` は hook name ごとに `HookDropSummary` へ集約する。

`HookDropSummary` と parse warning は `DiagnosticFinding` に変換する。

`DiagnosticFinding[]` は `DoctorOutputModel` に変換する。

`TelemetryConfig` は `TelemetryFacade` に変換する。

`TelemetryFacade` は no-op default と test exporter seam のどちらも同じ call shape にする。

## Integration Points

Error Audit は `appendAuditEntry` または lock-aware adapter を使う。

Hook Drop Doctor は `hooksHealthDir` の file-backed surface だけを読む。

Telemetry Core は command から exporter を直接触らせない。

Doctor Composition は human-readable output を担当し、directive/report の JSON stdout contract には接続しない。

Verification Traceability は U001 の evidence を後続の U003 で read-only に読む。

## Review

Verdict: READY

Reviewer: aidlc-architecture-reviewer-agent

U001 の処理順序は `requirements`、`components`、`component-methods`、`services` と対応している。

OpenTelemetry は core 計装に限定され、collector、dashboard、cloud export は含まれていない。

stdout JSON 契約と doctor の human-readable output は分離されている。
