# Swarm Execution Lifecycle Frontend Components

## N/A判定

本Unitにfrontend/UI componentはない。`requirements.md`のOOS-05、`unit-of-work.md`と`unit-of-work-story-map.md`のU-02境界は、短命CLI lifecycle、checkpoint、audit、referee連携だけを対象とする。`components.md`、`component-methods.md`、`services.md`も公開面をCLI subcommandとversioned JSONへ限定している。

したがってcomponent hierarchy、props/state、form、browser interaction、GUI dashboardは設計しない。engine宣言の成果物名とUI非適用根拠を残すため、本ファイルをN/A成果物として生成する。

## CLI feedback contract

| Channel | 表示/出力 | 禁止 |
|---|---|---|
| stdout | subcommandごとのschema v1 JSON 1件 | warning、progress prose、生provider output |
| stderr | deprecation/fallback/hard error/recoveryの列挙codeと修正方法 | credential、prompt、raw event |
| checkpoint status | execution/attempt/batch/state/selected/completed/failedのredacted要約 | provider session、command全文 |
| audit | selection、transition、reconciliation、evidenceの相関field | UI用の独自state、secret-like field |

対話menuやdriver pickerを追加せず、`resolve`の前に既存engine/conductorが渡した値を使う。floor/legacy/nativeの違いは色ではなく`executionMode`と`selected/execution` fieldで機械可読にする。

`record-finalize`のstdoutはrequest相の`referee-ready`またはresult相の`attempt-recorded`の判別unionであり、同じ呼出しで両方を返さない。

## UX scenario

- input/明示probe failureはworker開始前にhard errorと代替0件を示す。
- `auto` fallbackはrequested、selected、mode、reasonをstderrとauditへ出す。
- dispatch/evidence/referee failureはexecution/attemptとresume可能性を示し、生payloadを出さない。
- stale owner/liveness unknownは自動奪取せず、停止理由をcodeで示す。
- successはreferee mergeとcheckpoint確定後だけ返す。

## 上流参照一覧

本N/A判定とCLI feedback contractは、`unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`の全consumed artifactを確認した結果である。
