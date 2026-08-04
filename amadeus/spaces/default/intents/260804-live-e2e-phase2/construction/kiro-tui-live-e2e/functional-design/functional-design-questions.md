# Functional Design Questions — kiro-tui-live-e2e

> **E-OC1 証跡:** Q1はApplication Design reviewerから引き継いだ未確定契約であり、ユーザー本人のHUMAN_TURNで直接裁定した。ユーザー承認タイムスタンプ: 2026-08-04T12:58:24Z（回答`1` = A）。

## Confirmed context

上流入力は [unit-of-work.md](../../../inception/units-generation/unit-of-work.md)、[unit-of-work-story-map.md](../../../inception/units-generation/unit-of-work-story-map.md)、[requirements.md](../../../inception/requirements-analysis/requirements.md)、[components.md](../../../inception/application-design/components.md)、[component-methods.md](../../../inception/application-design/component-methods.md)、[services.md](../../../inception/application-design/services.md) である。

- Kiro TUIは独立transportとして、direct connectedまたはqualified follow-up Issueで完了する。
- private tmux、scratch home/env、deterministic disk/state anchor、bounded pane evidence、timeout/abort時killを同じUnitで閉じる。
- exact opt-inとGitHub Actions hard denyはscratch/spawn前に判定する。
- PASSはcleanup barrier成功後だけ記録し、TUIの証拠をACPへ流用しない。
- 数値timeoutは実測値から固定し、本Functional Designでは推定値を受け入れ基準にしない。

## Q1. retryと実行・cleanup二重失敗の契約

Application Design reviewerからConstructionへ引き継いだ2点を、どの契約で固定しますか。

- **A. cleanup-complete retry + safety override（推奨）** — retryableはanchor確立前の明示的な一時負荷・起動競合だけのclosed setとし、最大1回、attemptごとに全resourceをcleanupしてから再準備する。中間attemptはPASS receiptを持たず、最終ledgerにbounded attempt summaryだけを残す。実行失敗とcleanup失敗が併発した場合、時系列上の実行失敗を`primaryError`、cleanup失敗を`secondaryError`として保持しつつ、最終canonical codeは`safetyOverride=cleanup-failed`としてPASSとgreen matrix投影を禁止する。
- **B. TUI retryなし** — 全errorをretry 0で終了し、二重失敗時のprimary/secondaryとcleanup safety overrideだけAと同じにする。実装は単純だが、一時的なtmux起動競合も即失敗になる。
- **C. lifecycle全体を最大1回retry** — timeoutやanchor不一致も再試行対象にする。成功率は上がりうるが、モデル課金、非決定性、resource/receipt重複リスクが増える。
- **X. Other** — 別のclosed classificationまたは二重失敗契約を指定する。

[Answer]: A — cleanup-complete retry + safety override

## Question boundary

direct/follow-up分岐、TUIの対象範囲、認証隔離、live opt-in、Issue要件は承認済みなので再質問しない。Q1だけがartifact生成を左右する未確定のFunctional Design判断である。
