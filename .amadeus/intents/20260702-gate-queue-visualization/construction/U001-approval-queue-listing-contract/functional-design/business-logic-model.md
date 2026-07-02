# Business Logic Model

## 目的

複数 Intent の `state.json` から承認待ちを検出し、ゲート審査官がそのまま読める一覧として導出できるようにする。

## 対象 Unit

U001 承認待ちキュー一覧契約。

## 業務ロジック

| 識別子 | ロジック | 入力 | 出力 | 根拠 |
|---|---|---|---|---|
| BL001 | 対象 workspace の `.amadeus/intents/*/state.json` を走査して収集する。JSON として解釈できないファイルは stderr へ警告して読み飛ばし、一覧全体は失敗させない。 | workspace の path | Intent ごとの state | R002, UC001 |
| BL002 | phase ブロック（ideation、inception、construction）の `gate` が `waiting_approval` の場合、その phase のゲート（Ideation gate、Inception gate、Construction gate）の承認待ちとして検出する。 | Intent ごとの state | 承認待ち検出 | R001 |
| BL003 | top-level `status` または phase ブロックの `status` が `waiting_approval` の場合、該当 phase のゲートの承認待ちとして検出する。 | Intent ごとの state | 承認待ち検出 | R001, [G001 GD001](../../grillings/G001-status-waiting-approval-detection.md) |
| BL004 | `construction.bolts[].taskGeneration.status` が `ready_for_approval` の場合、Task Generation Gate（対象 Bolt ID）の承認待ちとして検出する。契約カタログの `gateResultByStatus`（`ready_for_approval` は `waiting_approval` へ写像）に従う。 | Intent ごとの state | 承認待ち検出 | R001 |
| BL005 | 検出から一覧行（Intent、phase、ゲート、待ち理由）を導出する。同じ phase の `gate` と `status` が同時に `waiting_approval` の場合は 1 行にまとめ、待ち理由に両方の根拠を併記する。 | 承認待ち検出 | 一覧行 | R002 |
| BL006 | 一覧行を Intent ID の辞書順、同一 Intent 内は phase 順（ideation、inception、construction）、Bolt ID の昇順で整列し、Markdown 表として出力する。承認待ちが 0 件の場合は「承認待ちはありません。」を出力する。どちらも正常実行（exit 0）とする。 | 一覧行 | Markdown 表または 0 件表示 | R002, R003 |
| BL007 | `.amadeus/intents` が存在しない workspace は対象外として stderr へ通知し、exit 0 で終了する。workspace 引数の欠落または不存在は入力エラーとして exit 1 で終了する。 | workspace の path | 対象外通知またはエラー報告 | R002, UC001 |

## 入力

| 入力 | 説明 | 根拠 |
|---|---|---|
| workspace の path | `.amadeus/` を持つ対象 workspace の特定に使う。 | R002 |
| `.amadeus/intents/*/state.json` | 承認待ち判定の唯一の情報源。 | R001, R002 |
| `task-generation-contract.ts` | 判定が準拠するゲート語彙契約。値を複製せず import して参照する。 | R001 |

## 出力

| 出力 | 説明 | 利用先 |
|---|---|---|
| 承認待ち一覧の Markdown 表 | Intent、phase、ゲート、待ち理由の 4 列。 | Maintainer、Agent |
| 0 件時の表示 | 「承認待ちはありません。」 | Maintainer、Agent |
| stderr の警告と対象外通知 | 解釈不能な `state.json` の警告、`.amadeus/intents` なしの通知。 | Maintainer、Agent |

## 未確認事項

なし。
