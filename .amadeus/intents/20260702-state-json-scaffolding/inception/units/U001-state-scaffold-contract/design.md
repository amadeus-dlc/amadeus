# Unit Design Brief

## 概要

この文書は Unit Design Brief である。
Inception では、state.json 雛形生成契約の課題解決方針を定め、Bolt 分割と Construction へ渡す設計入力だけを扱う。
スクリプトの引数体系、出力の詳細、手順参照の最終文言は Construction で確定する。

## 設計戦略

- 手書きの禁止ではなく、手書きより速くて正確な生成手段を既定の動きにすることで置き換える。phase skill の手順が参照する 1 行のコマンドを入口にする。
- 雛形の正解は validator の契約から導く。スクリプトを validator と同じ skill に同梱し、生成済み契約（`validator/generated/**`）を実行時に import して、雛形と検査の乖離を構造的に防ぐ。
- 更新は「対象遷移のブロックだけを触る」規則に固定する。既存の値、前 phase のブロック、evidence は保持し、冪等にする。
- 6 遷移を 1 スクリプトの遷移種別引数で扱い、入口を増やさない。
- 検証は eval 先行（RED → GREEN）で進め、6 遷移の生成結果と validator の pass を固定入力で検証する。

## 責務境界

- 所有するもの: 雛形生成スクリプトと eval、6 遷移の生成、更新規則、phase skill 手順からの参照記述、promote 同期。
- 所有しないもの: validator の要求構造の定義（契約カタログの責務）、成果物 Markdown の生成（テンプレートと内部 skill の責務）、state の内容妥当性の承認（人間ゲートの責務）。
- 依存してよいもの: `validator/generated/**` の生成済み契約、`amadeus-contracts` の生成パイプライン、promote 手順、Bun 実行環境、既存 state 実データ。
- 後続で再確認が必要になる条件: 契約カタログの state 語彙が変わった場合、phase の構成（stage の追加、削除）が変わった場合。

## 構成候補

- 遷移雛形の定義: 遷移種別ごとの生成、更新内容を扱う。
- state 読み書き: 既存 state の読み込み、保持規則、冪等な書き込みを扱う。
- 契約参照: 生成済み契約からの状態語彙と必須構造の参照を扱う。
- 手順参照: phase skill の該当手順からの利用参照を扱う。
- 検証と昇格: eval 先行の検証と promote 同期を扱う。

## データと契約候補

- 入力候補: 対象 workspace の path、対象 Intent ディレクトリ名、遷移種別、遷移に応じた補助引数（対象 Bolt、対象 Unit など）。
- 出力候補: 生成、更新された `state.json`、実行結果の要約（生成か更新か、変更したブロック）。
- 状態候補: 新規生成（Intent Capture）、ブロック追加（phase 開始）、ブロック更新（完了確定）。
- 事前条件候補: 対象 Intent ディレクトリが存在する。既存 `state.json` が JSON として解釈できる。
- 事後条件候補: 生成直後の validator が `state.json` に起因する構造 fail を出さない。
- 不変条件候補: 既存の値と前 phase の状態ブロックは変更されない。同じ遷移の再実行は結果を変えない。

## 検証観点

- eval は 6 遷移それぞれの生成結果を固定入力で検証し、生成直後の validator pass を確認する。
- 実装前に eval が失敗することを確認する（RED の記録）。
- 冪等性（再実行で結果不変）と既存値保持を eval のケースに含める。
- 昇格先成果物と source の同期を promote 手順と標準検証で確認する。

## Bolt 分割方針

- B001 で雛形生成スクリプトと eval を実装する（生成、更新規則の実装を含む）。
- B002 で phase skill の手順へ参照を追加し、promote で昇格先を同期する。

## Construction への引き継ぎ

- Functional Design で確定する事項: 遷移種別ごとの生成、更新内容のモデル、引数体系、実行結果の出力形式。
- 文書変更で確定する事項: 参照を追加する手順の正確な範囲（公開入口 skill にも書くか、内部 skill だけか）と参照の文言。
- 検証時に確定する事項: eval の置き場所（`skills/amadeus-validator/evals/` か `dev-scripts/evals/` か）と repo の test chain への組み込み入口名。
- 生成済み契約でカバーされない state 構造（phase ごとの必須配列の初期値など）の定義方法。
