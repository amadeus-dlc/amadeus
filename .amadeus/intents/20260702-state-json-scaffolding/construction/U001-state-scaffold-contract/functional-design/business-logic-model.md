# Business Logic Model

## 目的

phase 遷移時の `state.json` 更新を、遷移種別を指定した同梱スクリプトの実行として決定論的に行えるようにする。

## 対象 Unit

U001 state.json 雛形生成契約。

## 業務ロジック

| 識別子 | ロジック | 入力 | 出力 | 根拠 |
|---|---|---|---|---|
| BL001 | 遷移種別 `intent-capture` で、Intent の `state.json` を新規生成する（ideation 開始の形）。 | workspace、Intent ディレクトリ名 | 新規の state.json | R001, UC001 |
| BL002 | 遷移種別 `inception-start` と `construction-start` で、対象 phase のブロックを必須フィールド（必須配列、gate、status）込みで追加し、`phase` と `status` を前進させる。 | 既存 state.json | 更新された state.json | R001, UC001 |
| BL003 | 遷移種別 `inception-complete` と `finalization` で、対象 phase 配下の実在ファイルを走査して必須成果物配列を確定し、`status` と `gate` を完了へ前進させる。 | 既存 state.json、対象 phase 配下のファイル | 更新された state.json | R001, UC001 |
| BL004 | 遷移種別 `functional-design` と `bolt-preparation` で、対象 Unit または対象 Bolt のエントリを追加または更新する。evidence は実在するファイルだけを含める。 | 既存 state.json、対象 Unit または Bolt、関連成果物 | 更新された state.json | R001, UC001 |
| BL005 | すべての遷移で、対象遷移が定義する項目だけを設定し、既存の値と他 phase のブロックを保持する。同じ遷移の再実行は結果を変えない。 | 既存 state.json | 更新された state.json | R002, UC001 |
| BL006 | 状態語彙（status、gate、evidence kind）は、同梱の生成済み契約（`validator/generated/**`）から参照し、直書きを最小にする。 | 生成済み契約 | 遷移定義 | R001, R003, UC002 |

## 入力

| 入力 | 説明 | 根拠 |
|---|---|---|
| workspace の path と Intent ディレクトリ名 | 対象 `state.json` の特定に使う。 | R001 |
| 遷移種別 | `intent-capture`、`inception-start`、`inception-complete`、`construction-start`、`functional-design`、`bolt-preparation`、`finalization` の 7 識別子。Issue #311 の 6 遷移のうち「Inception 開始と完了」を 2 識別子に分ける。 | R001 |
| 遷移に応じた補助引数 | `functional-design` は対象 Unit、`bolt-preparation` は対象 Bolt と対象 Unit。 | R001 |
| 対象 phase 配下の実在ファイル | 必須成果物配列と evidence の確定に使う。 | R001, R002 |

## 出力

| 出力 | 説明 | 利用先 |
|---|---|---|
| 生成、更新された `state.json` | 遷移直後に validator が構造 fail を出さない状態。 | phase skill の後続手順、validator |
| 実行結果の要約 | 生成か更新か、設定したブロックの一覧。 | Agent の確認、notes への記録 |

## 未確認事項

なし。
