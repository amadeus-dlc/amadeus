# Intent Statement

## Problem Statement

AI-DLC の失敗可観測性を強化する。

現状では、workflow 実行中の失敗が複数の経路で静かに失われる。
`aidlc-orchestrate.ts` の error directive と未捕捉例外は `ERROR_LOGGED` として audit に残らない。
hook の drop は `.aidlc-hooks-health/*.drops` に書かれるが、`doctor` が読まないため運用者に表面化しない。
subagent 完了イベントは成功と失敗を区別できない。
さらに、conductor が自己申告しない失敗は機械的に補足できる範囲と対応方針が未確定である。

この Intent は、Issue #431、#432、#433、#435 を 1 つの失敗可観測性の改善単位として扱う。
AI-DLC は実行コストが大きいため、個別の小修正ではなく、失敗の検出、記録、表面化、判断方針をまとめて設計する。

## Target Customer

主な顧客は、Amadeus の maintainer と AI-DLC workflow を実行する agent runner である。

maintainer は、失敗の根拠を audit と検証結果から追跡できる必要がある。
agent runner は、失敗が会話ログだけに残る状態を避け、再開時や PR 準備時に判断できる必要がある。
PR reviewer と CI 監視担当者は、失敗がコード、成果物、テスト、audit のどこで確認できるかを把握できる必要がある。
GitHub Issue から変更を追跡する contributor は、個別 Issue と実装判断の対応関係を確認できる必要がある。

## Success Metrics

成功指標は次である。

| ID | Metric | Evidence |
|---|---|---|
| SM-001 | engine の error directive と未捕捉例外が `ERROR_LOGGED` として audit に残る。 | Issue #431 の受け入れ条件と deterministic test。 |
| SM-002 | `doctor` が `.aidlc-hooks-health/*.drops` を読み、hook 名、件数、最新理由を表示する。 | Issue #432 の受け入れ条件と eval または test。 |
| SM-003 | subagent の成功と失敗を audit から区別できる、または区別不能である事実が記録される。 | Issue #433 の調査結果、taxonomy 更新、または非対応判断。 |
| SM-004 | conductor の自己申告に依存しない失敗検出シグナルと対応方針が記録される。 | Issue #435 の設計判断と実装 Issue 分割。 |
| SM-005 | 対象 Intent の成果物整合性を validator で確認できる。 | Amadeus validator の pass 結果。 |
| SM-006 | PR 前に標準検証を実行し、結果を Intent または PR 説明から追跡できる。 | `npm run test:all` の結果、または未実行理由。 |

## Initiative Trigger

この Intent の直接の契機は、2026-07-04 時点で open の Issue #431、#432、#433、#435 が同じ失敗可観測性の根本原因を共有していることである。

AI-DLC は重い workflow である。
失敗時の証拠が audit、doctor、subagent event、成果物検証に残らない場合、原因分析、PR 監視、review 対応、次回再開の判断が高コストになる。

また、対象には parity lock の可能性がある。
そのため、実装前に upstream contribution、lock 対象外の回避、または人間承認付きの例外経路を整理する必要がある。

## Initial Scope Signal

初期スコープは `mvp` とする。

対象 Issue は #431、#432、#433、#435 である。
Operation phase は今回の workflow から外し、Ideation、Inception、Construction で設計と実装を完了させる。
ただし、Feasibility では parity lock 対象ファイルごとに、次の優先順で実現経路を判断する。

1. lock 対象外の adapter または wrapper で回避できるかを確認する。
2. upstream contribution として扱うべきかを確認する。
3. 人間承認付きの `engineFileExceptions` が必要かを確認する。
4. lock リスクが高く、今回の価値に対して過大な場合は分割候補にする。

## Traceability

| Issue | Intent role | Current status |
|---|---|---|
| [#431](https://github.com/amadeus-dlc/amadeus/issues/431) | engine error を audit に記録する。 | Open |
| [#432](https://github.com/amadeus-dlc/amadeus/issues/432) | hook drop を doctor で表面化する。 | Open |
| [#433](https://github.com/amadeus-dlc/amadeus/issues/433) | subagent 完了イベントに成功失敗の区別を追加または判断記録を残す。 | Open |
| [#435](https://github.com/amadeus-dlc/amadeus/issues/435) | conductor 自己申告に依存しない失敗補足の設計を決める。 | Open |

## Assumptions

対象は既存 Amadeus 実装への brownfield 型の改善である。
一方で、AI-DLC record としては新規 Intent として管理する。

全 10 問の Intent Capture 回答は、ユーザーの「全部推奨選択して」というこのステージ限定の指示により、推奨選択肢 `E` として記録した。
この指示は後続ステージの自動回答許可ではない。
