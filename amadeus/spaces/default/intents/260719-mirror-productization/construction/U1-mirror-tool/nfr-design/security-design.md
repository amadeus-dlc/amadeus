# Security Design — U1-mirror-tool

上流入力(consumes 全数): performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md

## SD-U1-1: spawn 様式の踏襲(SR-U1-2)

status の gh view も spawnGh 経由(引数配列・shell 非経由・env: process.env 明示)— 新しい spawn 面を作らない(canonical 1定義)。

## SD-U1-2: トークン非接触(SR-U1-1)

status は認証状態を ensureGhReady(gh auth status)で観測するのみ — 認証情報の読取・保存・伝搬なし(現行実装と同一)。

## SD-U1-3: 出力のサニタイズ境界(SR-U1-3)

Issue 本文(外部入力)は比較対象としてのみ扱い、findings の detail へは差分の要約(自前生成文字列)を載せる — Issue 本文の生テキストを実行系へ渡す経路なし。
