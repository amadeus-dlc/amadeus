# R001 遷移単位の雛形生成

## 要求

phase 遷移単位で valid な `state.json` 雛形を生成、更新でき、生成直後に validator を実行しても `state.json` の構造 fail が出ない。

## 背景

`state.json` の構造は validator が要求する契約であり、決定論的に生成できる。
現在はエージェントが先例の実データを読み手書きで再現しており、中間状態（phase 開始直後）の必須フィールドが漏れやすい。
直近 cycle でも Construction 開始時の必須配列の不足で validator 指摘と補修往復が発生した。

## 受け入れ条件

- 対象の遷移は、Intent Capture（ideation 開始）、Inception 開始と完了、Construction 開始、Functional Design、Bolt 準備、finalization の 6 種である。
- 各遷移の直後に validator を実行して、`state.json` に起因する構造 fail が出ない。
- 生成される内容は、validator の要求構造（状態語彙、必須配列、gate 値）と一致する。

## 依存

なし。

## 対応する対象境界

- SC-IN-001

## 未確認事項

- スクリプトの引数体系（遷移種別、対象 Bolt や Unit の指定方法）は、Unit Design Brief と Construction で確定する。
