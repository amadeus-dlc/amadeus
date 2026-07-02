# Business Logic Model

## 目的

merge 後の再実行で finalization へ決定論的に入れるよう、未 finalize の判定と検出の業務ロジックを定義する。

## 対象 Unit

U001 finalization resume contract。

## 業務ロジック

| 識別子 | ロジック | 入力 | 出力 | 根拠 |
|---|---|---|---|---|
| BL001 | 対象 workspace の `.amadeus/intents/**` を走査し、Intent ごとに `state.json` と Bolt 成果物を読む。 | workspace の path | Intent Construction State | R001, UC001 |
| BL002 | 未 finalize 判定（`construction.gate` 未 passed、対象 Bolt に `test-results.md` あり、`pr.md` なし）を適用する。 | Intent Construction State | Unfinalized Intent List | R001, UC001 |
| BL003 | 検出結果を stdout に1行1件で出力し、対象外の workspace は stderr の通知で区別する。 | Unfinalized Intent List | Detection Report | R002, UC001 |
| BL004 | auto 判定は、検出結果と対象 Intent の状態から finalization を選ぶ。条件を満たさない場合は通常の判定へ戻る。 | Detection Report、対象 Intent の状態 | Resume Decision | R003, UC002 |

## 入力

| 入力 | 説明 | 根拠 |
|---|---|---|
| workspace の path | 検出対象の `.amadeus/` を持つディレクトリ。 | R002 |
| state.json | Intent の phase、construction.status、gate、bolts。 | R001 |
| Bolt 成果物 | `construction/bolts/*/test-results.md` と `pr.md` の有無。 | R001 |

## 出力

| 出力 | 説明 | 利用先 |
|---|---|---|
| Unfinalized Intent List | 未 finalize の Intent ディレクトリ名の一覧。 | Detection Report |
| Detection Report | stdout の1行1件出力と、対象外時の stderr 通知。 | auto 判定、Decision Review |
| Resume Decision | finalization へ進むか、通常の判定へ戻るかの選択。 | amadeus-construction の実行順序 |

## 未確認事項

なし。
