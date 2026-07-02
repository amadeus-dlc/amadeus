# Business Rules

## 目的

finalization 再開契約の判断規則と Intent Contracts を定義する。

## 業務ルール

| 識別子 | 規則 | 根拠 | 状態 |
|---|---|---|---|
| BR001 | 未 finalize とは、`construction.gate` が `passed` でなく、`targetBolts` のすべてに `test-results.md` があり、`pr.md` を欠く Bolt が存在する状態である。 | R001, UC001 | accepted |
| BR002 | 判定は基準 branch 由来の checkout を前提にし、GitHub への照会を必須にしない。 | R001 | accepted |
| BR003 | 検出スクリプトは workspace の path を引数に取り、未 finalize の Intent ディレクトリ名を stdout へ1行1件で出力する。exit 0 は正常実行（0件を含む）、exit 1 は入力エラーとする。`.amadeus/intents` がない workspace は対象外として stderr へ通知し exit 0 とする。 | R002 | accepted |
| BR004 | auto 判定表の再開行は「`state.json.phase` が `construction` で、対象 Bolt が実装済みかつ検証済み（`test-results.md` あり）、`pr.md` がなく `construction.gate` が `passed` でない（基準 branch 由来の checkout）→ finalization を選ぶ」とし、refine の行より先に評価する。 | R003, UC002 | accepted |
| BR005 | Decision Review の入力証拠に、同梱スクリプトの検出結果を含める。検出結果が得られない場合は通常の判定へ戻る。 | R003 | accepted |
| BR006 | 検出スクリプトの eval は source skill の `evals/` に置き、昇格先へ混入させない。実装前に失敗（RED）を確認する。 | R004 | accepted |

## 例外

| 条件 | 扱い | 根拠 |
|---|---|---|
| 作業中 branch（実装 PR 未 merge）で未 finalize 状態に見える。 | 基準 branch 由来でないため再開規則を適用せず、通常の Construction 継続として扱う。 | R001 |
| 検出スクリプトを実行できない。 | 検出なしとして通常の判定へ戻り、実行時問題報告で扱う。 | R003 |

## Intent Contracts

| 識別子 | 種別 | 条件 | 根拠 | 状態 |
|---|---|---|---|---|
| PRE001 | 事前条件 | 対象 workspace の path を解決できる。 | R002 | accepted |
| PRE002 | 事前条件 | 基準 branch 由来の checkout である。 | R001 | accepted |
| POST001 | 事後条件 | merge 後の再実行で、auto 判定が finalization を選ぶ。 | R003 | accepted |
| POST002 | 事後条件 | 未 finalize の有無を、出力と終了コードで区別できる。 | R002 | accepted |
| INV001 | 不変条件 | 判定に GitHub への照会を必須にしない。 | R001 | accepted |
| INV002 | 不変条件 | 検出は読み取りだけを行い、成果物を変更しない。 | R002 | accepted |

## 未確認事項

なし。
