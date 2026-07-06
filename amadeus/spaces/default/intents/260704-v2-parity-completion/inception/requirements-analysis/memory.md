# Memory: requirements-analysis

## Interpretations

- 成功条件 3 点（パリティ検査、test:all、1 周完走）を R001〜R011 の 11 要求へ分解した。R001〜R007 が構造の要求、R008〜R010 が検証の要求、R011 が dogfooding の要求である。
- R011 の「1 周完走」は、本 Intent の残ステージをエンジン駆動で実行することを第一解釈とし、間に合わない場合は検証用実行で代替できると解釈した（判定はエンジン記録の audit イベントの有無）。

## Deviations

- 人間への質問を行わなかった。夜間自律進行の事前指示（構築まで自動承認、質問は最小化）に基づき、Ideation の確定判断から導出した。

## Tradeoffs

- 要求は「何が成立しているか」で書き、コピー手順や結線の実装方式は Application Design へ委ねた。要求の粒度を上げすぎると本家追従のたびに要求改定が必要になるため、基準 commit と写像規則だけを固定した。

## Open questions

- R007 の「旧形式の完了済み record を fail にしない」の実現方式（検査対象外か、旧形式許容モードか）は Application Design で決める。
- R011 の完走範囲（本 Intent の残り全ステージか、最小の検証実行か）は Delivery Planning の Bolt 構成に依存する。
