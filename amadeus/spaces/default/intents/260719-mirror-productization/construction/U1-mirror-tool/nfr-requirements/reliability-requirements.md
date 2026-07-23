# Reliability Requirements — U1-mirror-tool

上流入力(consumes 全数): business-logic-model.md、business-rules.md、requirements.md

## RL-U1-1: fail-closed(既存契約維持)

close の landing check・create の R-3(フィールド書込失敗の loud 報告)は挙動不変。status は precondition(exit 2)で gh 不在・未認証・record 不在を loud に区別(BR-U1-5)。

## RL-U1-2: 誤検出より未検出を優先しない

乖離判定は決定的比較のみ(BR-U1-2)— ネットワーク失敗を「乖離なし」へ丸めない(gh view 失敗は precondition か mirror-missing として顕在化、無音 clean 化の経路なし)。

## RL-U1-3: リグレッション面

移設+status 追加で既存 t232(unit/integration)green 維持+status の乖離3クラス fixture テスト追加(落ちる実証込み — FR-2 受け入れ基準)。
