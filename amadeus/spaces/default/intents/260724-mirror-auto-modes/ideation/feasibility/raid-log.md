# RAID Log — mirror-auto-modes

> 上流入力（consumes 全数）: `intent-statement.md`
>
> 実測基準: commit `2126ec1144a6fd0808021d7c386c1afbfdea6ae2`、2026-07-24

## Risks

| ID | リスク | 影響 | 緩和・閉包条件 |
|---|---|---|---|
| R-01 | createはGitHub上で成功したが、stateへのIssue番号記録が失敗する | 次回`auto`再試行で重複Issueを作る | 永続的な操作IDまたは由来情報による再発見を設計し、部分成功のfailure injectionで重複0件を実証する |
| R-02 | `Mirror Issue`番号だけではAmadeus作成か外部リンクか判別できない | 外部Issueを誤closeする | Amadeus作成を証明する永続provenanceを持ち、欠落・不一致時はcloseをfail-closedにする |
| R-03 | phase・park・completeの複数seamで同じ同期処理が重複発火する | APIノイズ、競合更新、二重close | 境界ごとのreceiptと冪等な状態遷移を共通化し、再入テストを置く |
| R-04 | GitHub障害を非blockingにした結果、未同期が見落とされる | Issue上の共有状態が陳腐化する | stateとstatus出力に未同期・最終失敗・再試行予定をloudに残す |
| R-05 | global/spaceの`auto`が将来Intentにも適用される | 意図しない外部Issue作成 | version-controlled設定を明示同意として文書化し、既定値は`prompt`、`off`で完全停止できるようにする |
| R-06 | booleanから3値への非互換変更が既存利用者のWorkflowを止める | 設定エラー | 暗黙変換せずloud errorとし、日英文書に更新例を示す |
| R-07 | coreだけ変更し、harness配布物やself-installが陳腐化する | harness間の挙動差 | package/promoteの既存生成とdrift guardを必須検証にする |
| R-08 | `auto`例外が他の外部操作へ拡大解釈される | 人間承認境界の弱体化 | rule文をIntentミラー、3操作、確定境界、provenance条件へ限定する |

## Assumptions

| ID | 前提 | 検証状態 |
|---|---|---|
| A-01 | 既存の3層設定とphase receiptは再利用できる | commit `2126ec1`のコードで実測済み |
| A-02 | `gh`の認証・repository selectionは既存ミラーと同じ環境で動く | 既存機能の前提を継承。失敗は非blockingに変更する |
| A-03 | Issue本文の最小形式は新しい機密データ分類を増やさない | 既存`renderBody`契約を維持する限り成立 |
| A-04 | provenanceと再試行方式は既存state/audit機構の範囲で実装できる | 仮説。Application Designで方式を確定し、Constructionでfailure injectionする |

## Issues

| ID | 現在の問題 | 状態 |
|---|---|---|
| I-01 | 現行規範がcreate・closeの都度承認を要求し、`auto`契約と衝突する | ユーザーが限定的な規範改定を承認。norm変更の着地待ち |
| I-02 | 現行`handleCreate`はIssue作成後のstate書込み失敗をloudに返すが、自動再試行の重複防止機構を持たない | 後続Requirements/Designの必須条件 |
| I-03 | 現行stateはIssue番号を保持するが、Amadeus作成provenanceを保持しない | 後続Requirements/Designの必須条件 |

## Dependencies

| ID | 依存 | 扱い |
|---|---|---|
| D-01 | 完了済み`260719-mirror-productization`のツール、設定、engine、docs成果 | 再実装せず拡張する |
| D-02 | `gh` CLIとGitHub API | optional dependency。障害時もWorkflow継続 |
| D-03 | package/promote pipelineとdrift guard | 全harness同期の完成条件 |
| D-04 | team/project ruleの限定改定 | `auto`実装を規範適合にする前提 |
| D-05 | Scope Definition以降のUnit分割 | 設定契約、lifecycle orchestration、provenance/retry、docs/normを分離して計画する |
