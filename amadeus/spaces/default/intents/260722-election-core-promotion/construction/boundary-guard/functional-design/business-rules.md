# Business Rules — U1 boundary-guard

> 上流入力(consumes 全数): requirements(FR-5)、components(C1)、component-methods(C1)、unit-of-work(U1)、unit-of-work-story-map(FR-5 トレース)、services(該当なし確認)

## ルール一覧

| ID | ルール | 検証 |
|---|---|---|
| BR-1 | 検査は出現単位(行単位除外禁止)。同一行に許可出現と違反出現が同居しても違反を検出する | unit テスト(同居行 fixture) |
| BR-2 | allowlist エントリは id・対象 glob・パターンの3属性必須。id なしの免除は不可(監査可能性) | 型で強制(parse-don't-validate) |
| BR-3 | 重複不変量は3状態意味論(scripts のみ green / 正本のみ green / 両実在 red)。順序制約・共有台帳なし | unit テスト3状態+integration live |
| BR-4 | fixture 落ちる実証は「赤の実測記録」を伴う(green 化前の赤を CI ログ or record で確認可能に) | 実装時の record 記録 |
| BR-5 | live 参照検査の有効化は U2 と同一 Bolt(単独マージで CI を赤にしない)。重複不変量は即時有効 | Bolt 1 構成(bolt-plan 拘束) |
| BR-6 | corpus sweep 偽赤 0 を導入条件とする(正当既存データで赤にならない) | 導入時 sweep 実測 |
| BR-7 | 検査対象拡張(将来の配布面追加)は roots 引数の追加のみで可能にする(ハードコード分散禁止 — canonical 1定義) | 実装形(roots 定数1箇所) |

## 検証の割付

BR-1/BR-2/BR-3 は unit 層(純関数駆動)、BR-5/BR-6 は integration 層+Bolt 構成、BR-4 は record 記録で担保する(business-logic-model.md の層分割と1:1)。
