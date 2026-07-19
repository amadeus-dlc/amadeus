# Frontend Components — election-model(functional-design)

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md、decisions.md

## N/A 宣言(反証可能根拠付き)

U1 は fs 非依存の純関数モジュール(unit-of-work 制約)で UI・CLI 面を持たない — CLI 出力契約は U5(election-cli、ADR-3 の指令ループ)が所有し、U1 は型と Result を返すのみ(services.md の層分担)。ui-less-mockups-as-output-contract の適用対象も U5 側。

## U1 が上位層へ渡す出力契約(型のみ)

| 消費側 | U1 が返す型 | 意味 |
|---|---|---|
| U2 store | Election / Ballot / TallyResult(直列化は U2 の責務) | 正本ファイルの内容型 |
| U5 CLI | Result<*, DefineError \| BallotError> | 指令/exit code への写像元 |
| U3 render | TallyResult+Ballot[](タイムライン素材) | GoA 度数行・persist 素案の入力 |
